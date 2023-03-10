require("dotenv").config();
const { token, databaseToken } = process.env;
const { connect } = require("mongoose");
const {
  Client,
  Collection,
  GatewayIntentBits,
  EmbedBuilder,
  Events,
} = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ],
});
client.commands = new Collection();
client.commandArray = [];

const functionFulders = fs.readdirSync("./src/functions");
for (const folder of functionFulders) {
  const functionFiles = fs
    .readdirSync(`./src/functions/${folder}`)
    .filter((file) => file.endsWith(".js"));
  for (const file of functionFiles)
    require(`./functions/${folder}/${file}`)(client);
}

client.handleEvents();
client.handleCommands();
client.login(token);
(async () => {
  await connect(databaseToken).catch(console.error);
})();

const levelSchema = require("./schemas/level");
client.on("messageCreate", async (message) => {
  const channelManager = require("./functions/handlers/handleChannels")(client);
  const { guild, author } = message;
  const channelsArray = await client.getXPChannels(guild.id);

  if (!guild || author.bot) return;

  levelSchema.findOne(
    { Guild: guild.id, User: author.id },
    async (err, data) => {
      if (err) throw err;

      if (!data) {
        levelSchema.create({
          Guild: guild.id,
          User: author.id,
          XP: 0,
          Level: 0,
        });
      }
    }
  );

  const channel = message.channel;
  const give = client.XP;
  const data = await levelSchema.findOne({ Guild: guild.id, User: author.id });

  if (!data) return;
  console.log(channelsArray);
  console.log(channel.id);
  const requiredXP = data.Level * data.Level * 20 + 20;
  if (data.canEarnXP() && channelsArray.includes(channel.id)) {
    if (data.XP + give >= requiredXP) {
      data.XP += give;
      data.Level += 1;
      await data.save();

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setDescription(`${author}, you have reached level ${data.Level}!`);

      channel.send({ embeds: [embed] });
    } else {
      data.XP += give;
      data.save();
    }
  }
});
