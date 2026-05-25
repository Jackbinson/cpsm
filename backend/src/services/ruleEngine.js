export const checkS3Compliance = (bucket) => {
  // Logic kiểm tra: Hiện tại mình giả lập mọi bucket tìm thấy đều là "Cảnh báo" 
  // để test tính năng Auto-fix và Discord Alert.
  return {
    isViolating: true,
    status: 'Cảnh báo',
    reason: 'Phát hiện S3 Bucket đang ở chế độ Public'
  };
};