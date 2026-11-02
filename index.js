import { Client, GatewayIntentBits, EmbedBuilder, Partials, ActivityType, WebhookClient } from "discord.js"
import fs from "fs"
import path from "path"
import url from "url"
const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

// قراءة الإعدادات بطريقة آمنة (تدعم متغيرات البيئة في Render أو ملف config.json محلياً)
let config = {};
try {
  if (fs.existsSync(path.resolve(__dirname, "config.json"))) {
    config = JSON.parse(fs.readFileSync(path.resolve(__dirname, "config.json"), "utf8"));
  }
} catch (e) {}

const guildId = process.env.GUILD_ID || config.guildId;
const token = process.env.TOKEN || config.token;
const bannerUrl = process.env.BANNER_URL || config.bannerUrl;
const topImageUrl = process.env.TOP_IMAGE_URL || config.topImageUrl;
const footerIconUrl = process.env.FOOTER_ICON_URL || config.footerIconUrl;
const embedTitle = process.env.EMBED_TITLE || config.embedTitle;
const poweredByName = process.env.POWERED_BY_NAME || config.poweredByName;

// رابط الويب هوك الخاص بك لإرسال الرسائل من خلاله
const webhookClient = new WebhookClient({ url: "https://discord.com/api/webhooks/1566853636577824909/MiqDg5CB-M1XVzW0jex0pdV_5yHWb9BSO0T-syHRttANMzZsXYp5C6OLqdGQkLN8mdo2" });

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildInvites],
  partials: [Partials.GuildMember]
})

const inviteCache = new Map()
async function refreshInvites(guild) {
  try {
    const invites = await guild.invites.fetch()
    const map = new Map()
    invites.forEach(inv => map.set(inv.code, inv.uses ?? 0))
    inviteCache.set(guild.id, map)
  } catch {}
}

client.on("ready", async () => {
  for (const [_, guild] of client.guilds.cache) {
    await refreshInvites(guild)
  }

  client.user.setActivity("Prime City S1 | Support", {
    type: ActivityType.Streaming,
    url: "https://discord.gg/W3VZCD8Pyt" 
  });
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("inviteCreate", inv => refreshInvites(inv.guild))
client.on("inviteDelete", inv => refreshInvites(inv.guild))

client.on("guildMemberAdd", async member => {
  try {
    const g = member.guild
    if (guildId && g.id !== guildId) return

    let inviterMention = "Unknown"
    try {
      const before = inviteCache.get(g.id) || new Map()
      const afterInvites = await g.invites.fetch()
      let usedInvite = null
      afterInvites.forEach(inv => {
        const prevUses = before.get(inv.code) ?? 0
        if ((inv.uses ?? 0) > prevUses) usedInvite = inv
      })
      if (usedInvite?.inviter?.id) inviterMention = `<@${usedInvite.inviter.id}>`
      else if (usedInvite?.inviterId) inviterMention = `<@${usedInvite.inviterId}>`
      await refreshInvites(g)
    } catch {}

    const createdAt = Math.floor(member.user.createdTimestamp / 1000)
    const discordAge = `<t:${createdAt}:R>`

    const embed = new EmbedBuilder()
      .setColor(0xae73ff)
      .setAuthor({ name: member.displayName || member.user.username, iconURL: member.user.displayAvatarURL({ size: 128 }) })
      .setTitle(embedTitle || "welcome")
      .addFields(
        { name: "Member :", value: `<@${member.id}>`, inline: true },
        { name: "Create Discord :", value: discordAge, inline: true },
        { name: "Members :", value: String(g.memberCount), inline: true },
        { name: "Invited By :", value: inviterMention, inline: false }
      )
      .setThumbnail(topImageUrl || null)
      .setImage(bannerUrl || null)
      .setFooter({ text: `Powered By [ ${poweredByName || g.name} ]`, iconURL: footerIconUrl || null })
      .setTimestamp(new Date())

    await webhookClient.send({
      content: `<@${member.id}>`,
      embeds: [embed]
    });
  } catch (e) {
    console.error("[WELCOME][ERROR]", e)
  }
})

client.login(token)
