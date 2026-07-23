# Huong dan tu code Async Scan Pipeline

Tai lieu nay la ban do trien khai cho tinh nang quet AWS bat dong bo. No khong thay doi code nguon va khong duoc dung lam code copy-paste hoan chinh. Hay hoan thanh tung muc, tu chay test, roi moi sang muc tiep theo.

## Muc tieu

Mot request tao scan phai tra ngay `202 Accepted` voi `scanId`. API khong duoc goi AWS truc tiep. Mot worker rieng lay job tu Redis, thuc hien quet, cap nhat MongoDB va phat Socket.IO event cho dashboard.

```text
POST /api/v1/scans
        |
        v
Express API -> ScanRun (MongoDB, queued) -> cloud-scan (Redis/BullMQ)
                                                   |
                                                   v
Dashboard <- Socket.IO <- ScanRun (MongoDB) <- Worker rieng -> AWS
                                                   |
                                                   v
                                             cloud-scan-dlq
```

Redis da co trong `backend/docker-compose.yml`; `backend/src/jobs/queues.js` va `backend/src/jobs/workers.js` hien la diem dat phu hop de bat dau.

## File map

### Them file moi

| File | Trach nhiem |
| --- | --- |
| `backend/src/models/ScanRun.js` | Nguon du lieu cho mot lan quet: state, retry, loi, idempotency va progress. |
| `backend/src/services/scanJobService.js` | Tao `ScanRun`, kiem tra idempotency key, enqueue job va yeu cau cancel. Khong chua AWS scan. |
| `backend/src/services/scanExecutionService.js` | Logic chi duoc worker goi: quet S3/EC2/IAM, ghi `ScanResult`, tao `AuditLog`, gui alert. |
| `backend/src/jobs/worker.js` | Entrypoint doc lap khoi Express de khoi dong BullMQ Worker. |
| `backend/src/jobs/scanProcessor.js` | Processor cua mot job; quan ly state transition, timeout, retry classification va cancellation. |

### Sua file hien co

| File | Phan can thay doi |
| --- | --- |
| `backend/package.json` | Them `bullmq`, `ioredis`; them script `worker` de chay worker rieng. |
| `backend/src/jobs/queues.js` | Tao Redis connection, queue `cloud-scan`, queue `cloud-scan-dlq`, default retry/backoff, global concurrency. |
| `backend/src/jobs/workers.js` | Hoac xoa file nay va dung `jobs/worker.js`, hoac bien no thanh worker entrypoint. Chi chon mot cach. |
| `backend/src/models/ScanResult.js` | Them `scanId`, `resourceId`, `reason`, `status`; sua enum resource type de chua `EC2_SecurityGroup` va `IAM_User`, hoac chuan hoa cac gia tri ve `EC2` va `IAM`. Tao unique index `{ scanId, resourceId }`. |
| `backend/src/controllers/scanController.js` | Tach API handler khoi `runCloudScan`: handler chi tao/enqueue/status/cancel; logic AWS chuyen sang `scanExecutionService`. |
| `backend/src/routes/scanRoutes.js` | Them endpoint create scan, get scan, list scans va cancel; giu endpoint cu trong giai doan chuyen doi neu can. |
| `backend/src/app.js` | Chi khoi dong Express/Socket.IO. Tuyet doi khong import hay khoi dong worker o day. |
| `backend/docker-compose.yml` | Them service `worker`, dung cung image/env voi backend nhung command chay script worker; khong expose port cho worker. |
| `backend/.env.example` | Them `SCAN_CONCURRENCY`, `SCAN_TIMEOUT_MS`, `SCAN_MAX_ATTEMPTS`, `SCAN_BACKOFF_MS`. |
| `frontend/src/pages/Dashboard/Dashboard.jsx` | Gui create-scan request, luu `scanId`, hien thi bang scan runs va subscribe state event. |
| `frontend/src/components/AuditLog.jsx` | Co the giu nguyen audit log; them listener cho `scan.status.changed` o component dashboard hoac tao component rieng. |

## Thu tu code

### Buoc 1: Mo hinh `ScanRun`

Tao schema voi cac field toi thieu:

```text
scanId                 UUID, unique
status                 queued | running | completed | failed | cancelled
idempotencyKey         string
requestHash            string
createdBy              User ObjectId (neu co auth)
queueJobId             string
attempt                number
maxAttempts            number
progress               { stage, processed, total }
nextRetryAt            Date
error                  { code, message, stack? }
cancelRequestedAt      Date
startedAt / finishedAt Date
summary                { processed, violated, fixed }
```

Bat buoc tao unique index `{ createdBy, idempotencyKey }`. Neu chua gan auth cho scan route, tam thoi dung `{ idempotencyKey }`, nhung phai doi lai ngay khi them middleware `protect`.

**Tieu chi xong:** co the tao va doc mot `ScanRun` trong MongoDB; enum state tu choi gia tri sai.

### Buoc 2: Queue va API `202`

Trong `queues.js`, tao 2 queue:

```text
cloud-scan       Job quet binh thuong
cloud-scan-dlq   Job da het retry, chi de xem va retry thu cong
```

Dong bo cua `POST /api/v1/scans`:

1. Doc header `Idempotency-Key`; thieu key tra `400`.
2. Tinh `requestHash` tu payload scan. Key cu nhung hash khac tra `409`.
3. Tim `ScanRun` theo idempotency key.
4. Neu ton tai, tra lai scan cu, khong enqueue job moi.
5. Neu chua ton tai, tao `ScanRun` state `queued` va `scanId` UUID.
6. Add job co `jobId` bang `scanId`; payload chi can `scanId`, khong dua AWS credentials vao queue.
7. Luu `queueJobId`, emit `scan.status.changed`, tra `202 Accepted` kem `Location` va `statusUrl`.

Can xu ly truong hop Mongo luu thanh cong nhung Redis enqueue that bai. Ban don gian co the mark `failed` va tra `503`; ban chac chan hon la them `enqueuePending` va mot dispatcher/outbox de enqueue lai.

**Tieu chi xong:** goi cung idempotency key 10 lan chi co mot ScanRun va mot Redis job.

### Buoc 3: Worker rieng va state transition

Worker chi nhan `scanId`, sau do doc ScanRun trong MongoDB. Transition phai atomic:

```text
queued -> running
running -> completed | failed | cancelled
```

Dung update co dieu kien (`status: queued`) khi chuyen sang `running`, de hai worker khong the cung chay mot scan. Worker goi `scanExecutionService`, chu khong goi Express controller va khong tao mock `req`/`res`.

Sau moi phase S3, EC2, IAM, cap nhat progress va emit `scan.status.changed`. Khi ghi ScanResult, dung upsert theo `{ scanId, resourceId }` de job retry khong tao duplicate resource result hoac duplicate Discord alert.

**Tieu chi xong:** API va worker la hai process khac nhau; tat API khong lam dung worker dang chay.

### Buoc 4: Retry va timeout

Dat chinh sach ban dau:

```text
max attempts: 4 (lan dau + 3 retry)
backoff: exponential, base 5 giay, co jitter
timeout: 10 phut cho mot scan
```

Phan loai loi truoc khi throw tu processor:

| Nhom loi | Hanh vi |
| --- | --- |
| Network, AWS throttling, loi tam thoi | Retry exponential. |
| Timeout | Retry neu con attempt; het attempt thi DLQ. |
| AccessDenied, credential sai, validation sai | Failed ngay, khong retry. |
| Cancelled | Cancelled ngay, khong retry. |

Timeout phai dung `AbortController` trong worker. Truyen signal xuong cac buoc co the huy, clear timer trong `finally`. Khi retry dang delay, set `nextRetryAt` tren ScanRun de dashboard hien thi dung.

**Tieu chi xong:** gia lap AWS throttling thi job retry theo lich; AccessDenied thi chi chay mot lan.

### Buoc 5: DLQ

Chi dua job vao `cloud-scan-dlq` sau failure cuoi cung. Truoc khi day sang DLQ:

1. Update ScanRun sang `failed`.
2. Luu `error.code`, `error.message`, `attempt`, `finishedAt`.
3. Emit state event.
4. Add mot DLQ job co `scanId`, error va metadata toi thieu.

DLQ khong tu retry. Chuc nang retry thu cong phai tao scan run moi hoac co co che reset attempt ro rang; khong sua am tham job da failed.

**Tieu chi xong:** job het retry hien trong queue DLQ va dashboard van hien `failed`.

### Buoc 6: Cancel

Them `POST /api/v1/scans/:scanId/cancel`.

| Trang thai hien tai | Hanh vi |
| --- | --- |
| `queued` hoac `delayed` | Remove queue job, update ngay sang `cancelled`. |
| `running` | Ghi `cancelRequestedAt`; gui signal cho worker; worker cleanup roi set `cancelled`. |
| `completed`, `failed`, `cancelled` | Tra `409` hoac idempotent `200`, chon mot quy uoc va giu nhat quan. |

Khong danh dau `cancelled` truoc khi worker da dung neu job dang running; nen co state tam `cancelling` hoac hien `running` voi thong diep "Dang huy". Job cancel khong duoc dua vao retry hoac DLQ.

**Tieu chi xong:** cancel khi AWS scan dang chay dung cong viec va khong co ket qua moi duoc ghi sau do.

### Buoc 7: Concurrency va dashboard

Dat `SCAN_CONCURRENCY=2` o queue cap global. Worker co the dat local concurrency bang 2; khi them nhieu worker instances, global limit van la 2.

Dashboard can co:

```text
GET /api/v1/scans/:scanId              Chi tiet mot scan
GET /api/v1/scans?status=queued,...    Danh sach ScanRun
POST /api/v1/scans/:scanId/cancel      Yeu cau huy
```

Hien thi cac cot `scanId`, `status`, `attempt/maxAttempts`, `progress`, `createdAt`, `nextRetryAt`, `error.message`. Tai lan dau bang REST va cap nhat bang Socket.IO; khong doi HTTP create-scan tra ve ket qua AWS.

## Socket.IO contract

Dung mot event duy nhat cho state scan:

```text
event: scan.status.changed
payload: scanId, status, attempt, progress, nextRetryAt, errorMessage, updatedAt
```

Chi phat payload da sanitize. Khong phat stack trace, AWS credential hay du lieu nhay cam ra client.

## Quy tac quan trong

1. Khong goi `runCloudScan(req, res)` tu Discord, cron hay worker nua. Tat ca phai enqueue qua mot service chung.
2. Khong import worker vao `app.js`; neu khong API scale se tao nhieu worker ngoai y muon.
3. Khong dung queue state lam state duy nhat cua UI; MongoDB la source of truth.
4. BullMQ co semantics at-least-once trong tinh huong process crash. Moi write cua scan phai idempotent.
5. Khong xoa completed/failed job Redis qua som neu van can jobId de chong duplicate; MongoDB luu lich su dai han.
6. Bao ve tat ca scan routes bang `protect` truoc khi dua len production.

## Checklist truoc khi merge

- [ ] API tra `202` trong khi worker dang ban.
- [ ] Idempotency key trung chi tao mot scan.
- [ ] API restart trong luc scan dang chay khong lam mat job.
- [ ] Retry chi ap dung cho loi transient.
- [ ] Timeout, cancel va AccessDenied khong bi retry sai.
- [ ] Het retry thi co DLQ record va dashboard `failed`.
- [ ] Hai worker instances khong vuot qua global concurrency.
- [ ] ScanResult khong trung khi job chay lai.
- [ ] Dashboard nhan du state qua REST va Socket.IO.
