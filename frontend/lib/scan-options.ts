export const awsServices = ["S3", "EC2", "IAM", "Lambda", "Security Groups", "RDS", "CloudFront", "CloudTrail", "KMS", "VPC"] as const;
export const scanTypes = [
  { value: "quick", label: "Quick Scan", description: "Prioritized baseline security checks." },
  { value: "full", label: "Full Scan", description: "All enabled services and policies." },
  { value: "service", label: "Service Scan", description: "Only selected AWS services." },
  { value: "resource", label: "Resource Scan", description: "Targeted resource verification." },
] as const;
export const priorities = ["low", "normal", "high"] as const;
export const awsRegions = ["ap-southeast-1", "us-east-1", "us-west-2", "eu-west-1"] as const;