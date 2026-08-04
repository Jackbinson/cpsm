import { Client, EmbedBuilder, GatewayIntentBits, REST, Routes } from "discord.js";
import { enqueueScan } from "./scanJobService.js";
import { logger } from "./structuredLogger.js";

const isDiscordEnabled =
  process.env.DISCORD_ENABLED !== "false" &&
  Boolean(process.env.DISCORD_TOKEN && process.env.DISCORD_CLIENT_ID);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const commands = [{ name: "scan", description: "Queue a CSPM cloud scan" }];

if (isDiscordEnabled) {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  rest
    .put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands })
    .then(() => logger.info("discord.command_registered", { command: "scan" }))
    .catch((error) => logger.error("discord.command_registration_failed", { error }));
}

client.once("clientReady", () => {
  logger.info("discord.client_ready", { bot: client.user.tag });
  client.user.setActivity("CSPM cloud scans", { type: 3 });
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "scan") return;

  await interaction.deferReply({ ephemeral: true });
  try {
    const { scanRun, created } = await enqueueScan({
      idempotencyKey: `discord:${interaction.id}`,
      idempotencyScope: `discord:${interaction.user.id}`,
      requestPayload: { source: "discord" },
    });
    const message = created ? "Scan queued" : "Existing scan returned";
    logger.info("discord.scan_requested", { interactionId: interaction.id, scanId: scanRun.scanId, created });
    await interaction.editReply(`${message}: ${scanRun.scanId}`);
  } catch (error) {
    logger.error("discord.scan_request_failed", { interactionId: interaction.id, error });
    await interaction.editReply("Could not queue the cloud scan.");
  }
});

export const sendDiscordAlert = async (resourceName, status, reason) => {
  try {
    if (!isDiscordEnabled || !client.isReady() || !process.env.DISCORD_CHANNEL_ID) return;

    const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("CSPM Alert")
      .addFields(
        { name: "Resource", value: resourceName },
        { name: "Issue", value: reason },
        { name: "Status", value: status || "Critical" }
      )
      .setTimestamp()
      .setFooter({ text: "CSPM monitoring" });
    await channel.send({ embeds: [embed] });
    logger.info("discord.alert_sent", { resourceName, status: status || "Critical" });
  } catch (error) {
    logger.error("discord.alert_send_failed", { resourceName, error });
  }
};

if (isDiscordEnabled) {
  client.login(process.env.DISCORD_TOKEN).catch((error) => {
    logger.error("discord.login_failed", { error });
  });
}