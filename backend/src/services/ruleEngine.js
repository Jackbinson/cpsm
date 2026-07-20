const hasFullPublicAccessBlock = (config) => {
  return Boolean(
    config?.BlockPublicAcls &&
      config?.IgnorePublicAcls &&
      config?.BlockPublicPolicy &&
      config?.RestrictPublicBuckets
  );
};

export const checkS3Compliance = (bucket) => {
  const isProtected = hasFullPublicAccessBlock(bucket.PublicAccessBlock);

  return {
    isViolating: !isProtected,
    status: isProtected ? "An toàn" : "Cảnh báo",
    reason: isProtected
      ? "S3 Bucket đã bật đầy đủ Block Public Access."
      : "S3 Bucket chưa bật đầy đủ Block Public Access.",
  };
};
