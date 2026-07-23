import { Client, EmbedBuilder, GatewayIntentBits, REST, Routes } from "discord.js";
import { enqueueScan } from "./scanJobService.js";

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
    .then(() => console.log("[Discord] Slash command /scan registered."))
    .catch((error) => console.error("[Discord] Command registration failed:", error.message));
}

client.once("clientReady", () => {
  console.log(`[Discord] Bot online as: ${client.user.tag}`);
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
    await interaction.editReply(`${message}: ${scanRun.scanId}`);
  } catch (error) {
    console.error("[Discord] Could not queue scan:", error);
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
  } catch (error) {
    console.error("[Discord] Send alert failed:", error.message);
  }
};

if (isDiscordEnabled) {
  client.login(process.env.DISCORD_TOKEN).catch((error) => {
    console.error("[Discord] Bot login failed:", error.message);
  });
}
