import { Client, GatewayIntentBits, EmbedBuilder, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

const isDiscordEnabled =
  process.env.DISCORD_ENABLED !== 'false' &&
  Boolean(process.env.DISCORD_TOKEN && process.env.DISCORD_CLIENT_ID);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const commands = [
  {
    name: 'scan',
    description: 'Run a CSPM cloud scan',
  },
];

if (isDiscordEnabled) {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  (async () => {
    try {
      console.log('[Discord] Registering slash commands...');
      await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
        body: commands,
      });
      console.log('[Discord] Slash command /scan registered.');
    } catch (error) {
      console.error('[Discord] Slash command registration failed:', error.message);
    }
  })();
} else {
  console.log('[Discord] Disabled; skipping bot login and slash command registration.');
}

client.once('clientReady', () => {
  console.log(`[Discord] Bot online as: ${client.user.tag}`);
  client.user.setActivity('Giam sat Cloud UMT', { type: 3 });
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'scan') {
    await interaction.reply('Dang tien hanh ra quet CSPM...');

    try {
      const { runCloudScan } = await import('../controllers/scanController.js');

      const req = {
        app: {
          get: () => null,
        },
      };
      const res = {
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.data = data;
          return this;
        },
      };

      await runCloudScan(req, res);

      if (res.data && res.data.success) {
        await interaction.editReply(`Ra quet hoan tat. ${res.data.message}`);
      } else {
        await interaction.editReply('He thong quet gap loi.');
      }
    } catch (error) {
      console.error('[Discord] Scan command failed:', error);
      await interaction.editReply('Khong the kich hoat ra quet.');
    }
  }
});

export const sendDiscordAlert = async (resourceName, status, reason) => {
  try {
    if (!isDiscordEnabled || !client.isReady() || !process.env.DISCORD_CHANNEL_ID) {
      return;
    }

    const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('CSPM Alert')
      .addFields(
        { name: 'Tai nguyen', value: resourceName },
        { name: 'Van de', value: reason },
        { name: 'Muc do', value: status || 'Nghiem trong' }
      )
      .setTimestamp()
      .setFooter({ text: 'He thong giam sat CSPM - UMT' });

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('[Discord] Send alert failed:', error.message);
  }
};

if (isDiscordEnabled) {
  client.login(process.env.DISCORD_TOKEN).catch((error) => {
    console.error('[Discord] Bot login failed:', error.message);
  });
}
