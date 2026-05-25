import { EC2Client, DescribeSecurityGroupsCommand } from "@aws-sdk/client-ec2";

// Khởi tạo kết nối đến EC2 của LocalStack
const ec2Client = new EC2Client({
    endpoint: "http://localhost:4566",
    region: "us-east-1",
    credentials: { accessKeyId: "test", secretAccessKey: "test" }
});

// THÊM HÀM NÀY VÀO CUỐI FILE
export const scanEC2SecurityGroups = async () => {
    try {
        const command = new DescribeSecurityGroupsCommand({});
        const response = await ec2Client.send(command);
        const results = [];

        for (const sg of response.SecurityGroups) {
            // Bỏ qua cái mặc định (default) của hệ thống
            if (sg.GroupName === 'default') continue;

            let isVulnerable = false;
            let reason = "Cấu hình mạng an toàn";

            // Duyệt qua các quy tắc Mạng Mở Vào (Inbound/Ingress Rules)
            if (sg.IpPermissions) {
                for (const rule of sg.IpPermissions) {
                    // Nếu phát hiện Cổng 22 (SSH) đang mở
                    if (rule.FromPort === 22 && rule.ToPort === 22) {
                        // Kiểm tra xem có mở công khai cho toàn thế giới (0.0.0.0/0) không
                        const isOpenToWorld = rule.IpRanges?.some(range => range.CidrIp === "0.0.0.0/0");
                        if (isOpenToWorld) {
                            isVulnerable = true;
                            reason = "Cổng 22 (SSH) đang mở hớ hênh ra toàn bộ Internet (0.0.0.0/0)!";
                            break; // Phát hiện lỗi là dừng vòng lặp ngay
                        }
                    }
                }
            }

            results.push({
                resourceId: sg.GroupId,
                resourceName: sg.GroupName,
                resourceType: 'EC2_SecurityGroup',
                isViolating: isVulnerable,
                status: isVulnerable ? 'Nguy hiểm' : 'An toàn',
                reason: reason
            });
        }
        return results;
    } catch (error) {
        console.error("❌ Lỗi khi quét EC2 Security Groups:", error);
        return [];
    }
};