import {
  S3Client,
  ListBucketsCommand,
  GetPublicAccessBlockCommand,
  PutPublicAccessBlockCommand,
} from "@aws-sdk/client-s3";
import { EC2Client, DescribeSecurityGroupsCommand } from "@aws-sdk/client-ec2";
import { IAMClient, ListUsersCommand, ListMFADevicesCommand } from "@aws-sdk/client-iam";

const AWS_REGION = process.env.AWS_REGION || "ap-southeast-1";
const AWS_ENDPOINT = process.env.AWS_ENDPOINT?.trim();
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_SESSION_TOKEN = process.env.AWS_SESSION_TOKEN;

const buildClientConfig = (extraConfig = {}) => {
  const config = {
    region: AWS_REGION,
    ...extraConfig,
  };

  if (AWS_ENDPOINT) {
    config.endpoint = AWS_ENDPOINT;
  }

  if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
      ...(AWS_SESSION_TOKEN ? { sessionToken: AWS_SESSION_TOKEN } : {}),
    };
  }

  return config;
};

const s3Client = new S3Client(buildClientConfig(AWS_ENDPOINT ? { forcePathStyle: true } : {}));
const ec2Client = new EC2Client(buildClientConfig());
const iamClient = new IAMClient(buildClientConfig());

export const getAllBuckets = async () => {
  const response = await s3Client.send(new ListBucketsCommand({}));
  const buckets = response.Buckets || [];

  const bucketsWithPublicAccessBlock = await Promise.all(
    buckets.map(async (bucket) => {
      try {
        const publicAccessBlock = await s3Client.send(
          new GetPublicAccessBlockCommand({ Bucket: bucket.Name })
        );

        return {
          ...bucket,
          PublicAccessBlock: publicAccessBlock.PublicAccessBlockConfiguration,
        };
      } catch (error) {
        const isMissingPublicAccessBlock =
          error?.name === "NoSuchPublicAccessBlockConfiguration" ||
          error?.$metadata?.httpStatusCode === 404;

        if (!isMissingPublicAccessBlock) {
          console.warn(`Cannot read S3 public access block for ${bucket.Name}:`, error.message);
        }

        return {
          ...bucket,
          PublicAccessBlock: null,
          PublicAccessBlockError: error.message,
        };
      }
    })
  );

  return {
    ...response,
    Buckets: bucketsWithPublicAccessBlock,
  };
};

export const applyPublicAccessBlock = async (bucketName) => {
  return s3Client.send(
    new PutPublicAccessBlockCommand({
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: true,
        RestrictPublicBuckets: true,
      },
    })
  );
};

export const scanEC2SecurityGroups = async () => {
  try {
    const response = await ec2Client.send(new DescribeSecurityGroupsCommand({}));
    const securityGroups = response.SecurityGroups || [];

    return securityGroups
      .filter((sg) => sg.GroupName !== "default")
      .map((sg) => {
        const riskyRule = sg.IpPermissions?.find((rule) => {
          const opensSsh = rule.FromPort === 22 && rule.ToPort === 22;
          const opensAllTraffic = rule.IpProtocol === "-1";
          const openToWorld =
            rule.IpRanges?.some((range) => range.CidrIp === "0.0.0.0/0") ||
            rule.Ipv6Ranges?.some((range) => range.CidrIpv6 === "::/0");

          return openToWorld && (opensSsh || opensAllTraffic);
        });

        const isViolating = Boolean(riskyRule);

        return {
          resourceId: sg.GroupId,
          resourceName: sg.GroupName,
          resourceType: "EC2_SecurityGroup",
          isViolating,
          status: isViolating ? "Nguy hiểm" : "An toàn",
          reason: isViolating
            ? "Security Group đang mở SSH hoặc toàn bộ traffic ra Internet."
            : "Cấu hình mạng an toàn.",
        };
      });
  } catch (error) {
    console.error("Lỗi khi quét EC2 Security Groups:", error);
    return [];
  }
};

export const scanIAMUsers = async () => {
  try {
    const users = [];
    let marker;

    do {
      const response = await iamClient.send(
        new ListUsersCommand(marker ? { Marker: marker } : {})
      );

      users.push(...(response.Users || []));
      marker = response.IsTruncated ? response.Marker : undefined;
    } while (marker);

    return Promise.all(
      users.map(async (user) => {
        const mfaResponse = await iamClient.send(
          new ListMFADevicesCommand({ UserName: user.UserName })
        );
        const hasMfa = (mfaResponse.MFADevices || []).length > 0;

        return {
          resourceId: user.UserId,
          resourceName: user.UserName,
          resourceType: "IAM_User",
          isViolating: !hasMfa,
          status: hasMfa ? "An toàn" : "Cảnh báo",
          reason: hasMfa
            ? "IAM user đã bật MFA."
            : "IAM user chưa bật MFA.",
        };
      })
    );
  } catch (error) {
    console.error("Lỗi khi quét IAM Users:", error);
    return [];
  }
};
