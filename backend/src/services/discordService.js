import { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

// 1. KHỞI TẠO BOT VỚI CÁC QUYỀN CẦN THIẾT
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});

// 2. ĐĂNG KÝ LỆNH SLASH COMMAND (/scan)
const commands = [
  {
    name: 'scan',
    description: 'Ra lệnh rà quét lỗ hổng S3 Buckets trên LocalStack',
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('⏳ [Discord] Đang đăng ký Slash Commands...');
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    console.log('✅ [Discord] Đăng ký lệnh /scan thành công!');
  } catch (error) {
    console.error('❌ [Discord] Lỗi đăng ký lệnh:', error);
  }
})();

// 3. SỰ KIỆN KHI BOT ONLINE (Đã dùng 'clientReady' để hết báo lỗi vàng)
client.once('clientReady', () => { 
  console.log(`✅ [Discord] Bot đã online với tên: ${client.user.tag}`);
  client.user.setActivity('Giám sát Cloud UMT', { type: 3 }); 
});

// 4. LẮNG NGHE LỆNH TỪ KHUNG CHAT
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'scan') {
    await interaction.reply('⏳ **Hệ thống CSPM:** Đang tiến hành rà quét LocalStack...');

    try {
      // 💡 BÍ QUYẾT Ở ĐÂY: Dynamic Import để tránh lỗi vòng lặp (Circular Dependency)
      const { runCloudScan } = await import('../controllers/scanController.js');

      // Tạo ra 2 vật thế thân (Mock) cho req và res để "lừa" hàm Controller
      const req = {}; 
      const res = {
        statusCode: 200,
        status: function(code) { this.statusCode = code; return this; },
        json: function(data) { this.data = data; return this; }
      };

      // Gọi thẳng hàm rà quét nội bộ
      await runCloudScan(req, res);
      
      // Kiểm tra kết quả do Controller trả về
      if (res.data && res.data.success) {
        await interaction.editReply(`✅ **Rà quét hoàn tất!**\n📊 ${res.data.message}`);
      } else {
        await interaction.editReply('❌ **Lỗi:** Hệ thống quét gặp trục trặc.');
      }
    } catch (error) {
      console.error('Lỗi khi Bot rà quét:', error);
      await interaction.editReply('❌ **Lỗi hệ thống:** Không thể kích hoạt rà quét.');
    }
  }
});

// 5. HÀM GỬI CẢNH BÁO BẢO MẬT (Có Footer cực xịn)
export const sendDiscordAlert = async (resourceName, status, reason) => {
  try {
    const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🚨 CẢNH BÁO CSPM')
      .addFields(
        { name: 'Tài nguyên', value: resourceName },
        { name: 'Vấn đề', value: reason },
        { name: 'Mức độ', value: 'Nghiêm trọng' }
      )
      .setTimestamp()
      .setFooter({ text: 'Hệ thống giám sát CSPM - UMT' }); 

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error("Lỗi Discord Bot:", error);
  }
};

client.login(process.env.DISCORD_TOKEN);