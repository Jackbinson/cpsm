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
  const config = { region: AWS_REGION, ...extraConfig };

  if (AWS_ENDPOINT) config.endpoint = AWS_ENDPOINT;
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

const sendCommand = (client, command, signal) =>
  client.send(command, signal ? { abortSignal: signal } : undefined);

export const getAllBuckets = async ({ signal } = {}) => {
  const response = await sendCommand(s3Client, new ListBucketsCommand({}), signal);
  const buckets = response.Buckets || [];

  const bucketsWithPublicAccessBlock = await Promise.all(
    buckets.map(async (bucket) => {
      try {
        const publicAccessBlock = await sendCommand(
          s3Client,
          new GetPublicAccessBlockCommand({ Bucket: bucket.Name }),
          signal
        );
        return {
          ...bucket,
          PublicAccessBlock: publicAccessBlock.PublicAccessBlockConfiguration,
        };
      } catch (error) {
        if (signal?.aborted) throw error;

        const isMissingPublicAccessBlock =
          error?.name === "NoSuchPublicAccessBlockConfiguration" ||
          error?.$metadata?.httpStatusCode === 404;

        if (!isMissingPublicAccessBlock) throw error;

        return {
          ...bucket,
          PublicAccessBlock: null,
        };
      }
    })
  );

  return { ...response, Buckets: bucketsWithPublicAccessBlock };
};

export const applyPublicAccessBlock = async (bucketName, { signal } = {}) =>
  sendCommand(
    s3Client,
    new PutPublicAccessBlockCommand({
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: true,
        RestrictPublicBuckets: true,
      },
    }),
    signal
  );

export const scanEC2SecurityGroups = async ({ signal } = {}) => {
  const response = await sendCommand(ec2Client, new DescribeSecurityGroupsCommand({}), signal);
  const securityGroups = response.SecurityGroups || [];

  return securityGroups
    .filter((securityGroup) => securityGroup.GroupName !== "default")
    .map((securityGroup) => {
      const riskyRule = securityGroup.IpPermissions?.find((rule) => {
        const opensSsh = rule.FromPort === 22 && rule.ToPort === 22;
        const opensAllTraffic = rule.IpProtocol === "-1";
        const openToWorld =
          rule.IpRanges?.some((range) => range.CidrIp === "0.0.0.0/0") ||
          rule.Ipv6Ranges?.some((range) => range.CidrIpv6 === "::/0");

        return openToWorld && (opensSsh || opensAllTraffic);
      });

      const isViolating = Boolean(riskyRule);
      return {
        resourceId: `ec2:${securityGroup.GroupId}`,
        resourceName: securityGroup.GroupName,
        resourceType: "EC2",
        isViolating,
        status: isViolating ? "Nguy hiem" : "An toan",
        reason: isViolating
          ? "Security Group mo SSH hoac toan bo traffic ra Internet."
          : "Cau hinh mang an toan.",
        rawCloudConfig: securityGroup,
      };
    });
};

export const scanIAMUsers = async ({ signal } = {}) => {
  const users = [];
  let marker;

  do {
    const response = await sendCommand(
      iamClient,
      new ListUsersCommand(marker ? { Marker: marker } : {}),
      signal
    );
    users.push(...(response.Users || []));
    marker = response.IsTruncated ? response.Marker : undefined;
  } while (marker);

  return Promise.all(
    users.map(async (user) => {
      const mfaResponse = await sendCommand(
        iamClient,
        new ListMFADevicesCommand({ UserName: user.UserName }),
        signal
      );
      const hasMfa = (mfaResponse.MFADevices || []).length > 0;

      return {
        resourceId: `iam:${user.UserId}`,
        resourceName: user.UserName,
        resourceType: "IAM",
        isViolating: !hasMfa,
        status: hasMfa ? "An toan" : "Canh bao",
        reason: hasMfa ? "IAM user da bat MFA." : "IAM user chua bat MFA.",
        rawCloudConfig: user,
      };
    })
  );
};
