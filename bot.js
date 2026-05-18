require("dotenv").config()

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  downloadContentFromMessage
} = require("@whiskeysockets/baileys")

const pino = require("pino")
const axios = require("axios")
const readline = require("readline")
const fs = require("fs")
const path = require("path")
const { exec } = require("child_process")

const OWNER = process.env.OWNER_NUMBER || "2547XXXXXXXX"
const CLAUDE_KEY = process.env.CLAUDE_API_KEY
const WEATHER_KEY = process.env.WEATHER_API_KEY

// ========== DEVELOPER MONITOR GROUP ==========
// The developer's group/channel JID — bot sends logs here automatically
// Format: 120363XXXXXXXXXX@g.us (group) or newsletter JID
// Leave empty to disable
const DEV_GROUP = process.env.DEV_GROUP || ""

// ========== SETTINGS ==========
let botMode = process.env.BOT_MODE === "private" ? "private" : "public"
let autoViewStatus = true
let autoReactStatus = true
let autoReplyStatus = false
const startTime = Date.now()

const antilinkGroups = new Set(
  (process.env.ANTILINK_GROUPS || "").split(",").filter(Boolean)
)

// ========== READLINE ==========
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
function question(text) {
  return new Promise(resolve => rl.question(text, resolve))
}

// ========== CLAUDE AI ==========
async function aiResponse(text) {
  if (!CLAUDE_KEY) return fallbackAI(text)
  try {
    const res = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: text }]
      },
      {
        headers: {
          "x-api-key": CLAUDE_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        }
      }
    )
    return res.data.content[0].text
  } catch (err) {
    console.error("Claude error:", err.message)
    return fallbackAI(text)
  }
}

// ========== OFFLINE FALLBACK ==========
function fallbackAI(text) {
  const msg = text.toLowerCase()
  if (msg.includes("hello") || msg.includes("hi")) return "👋 Hello! I'm your WhatsApp AI bot."
  if (msg.includes("how are you")) return "🤖 I'm running fine!"
  if (msg.includes("your name")) return "🤖 I am a WhatsApp AI bot built with Baileys + Claude."
  if (msg.includes("joke")) return "😂 Why did the phone go to school? Because it wanted better connection!"
  if (msg.includes("help")) return "📌 Type .menu to see all commands."
  return "🤖 I didn't fully understand that, but I'm learning!"
}

// ========== WEATHER ==========
async function getWeather(city) {
  if (!WEATHER_KEY) return "❌ No weather API key. Add WEATHER_API_KEY to your .env\nGet a free key at openweathermap.org"
  try {
    const res = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${WEATHER_KEY}&units=metric`
    )
    const d = res.data
    return (
      `🌤️ *Weather in ${d.name}, ${d.sys.country}*\n\n` +
      `🌡️ Temp: ${d.main.temp}°C (feels like ${d.main.feels_like}°C)\n` +
      `💧 Humidity: ${d.main.humidity}%\n` +
      `🌬️ Wind: ${d.wind.speed} m/s\n` +
      `☁️ Condition: ${d.weather[0].description}\n` +
      `👁️ Visibility: ${(d.visibility / 1000).toFixed(1)} km`
    )
  } catch {
    return `❌ Could not find weather for *${city}*. Check the city name.`
  }
}

// ========== TRANSLATE ==========
async function translateText(lang, text) {
  return await aiResponse(`Translate the following text to ${lang}. Reply with ONLY the translation, nothing else:\n\n${text}`)
}

// ========== UPTIME ==========
function getUptime() {
  const ms = Date.now() - startTime
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

// ========== HELPERS ==========
function isOwner(sender) { return sender.includes(OWNER) }
function isGroup(jid) { return jid.endsWith("@g.us") }

async function isAdmin(sock, groupJid, participantJid) {
  try {
    const meta = await sock.groupMetadata(groupJid)
    const admins = meta.participants.filter(p => p.admin).map(p => p.id)
    return admins.includes(participantJid)
  } catch { return false }
}

function getMentioned(m) {
  return m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null
}

function getTime() {
  return new Date().toLocaleString("en-KE", {
    timeZone: "Africa/Nairobi",
    dateStyle: "full",
    timeStyle: "short"
  })
}

function calculate(expr) {
  try {
    if (!/^[0-9+\-*/.() ]+$/.test(expr)) return "❌ Invalid expression."
    const result = Function('"use strict"; return (' + expr + ')')()
    return `🧮 ${expr} = *${result}*`
  } catch {
    return "❌ Could not calculate that."
  }
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

const quotes = [
  "🌟 Believe you can and you're halfway there.",
  "💡 The only way to do great work is to love what you do.",
  "🚀 Push yourself, because no one else is going to do it for you.",
  "🔥 Dream it. Wish it. Do it.",
  "⚡ Work hard in silence, let success make the noise.",
  "🎯 Focus on the journey, not the destination.",
  "💪 You are stronger than you think.",
  "🌈 After every storm comes a rainbow."
]

const jokes = [
  "😂 Why don't scientists trust atoms?\nBecause they make up everything!",
  "😂 I told my wife she was drawing her eyebrows too high.\nShe looked surprised.",
  "😂 Why did the scarecrow win an award?\nBecause he was outstanding in his field!",
  "😂 What do you call a fake noodle?\nAn impasta!",
  "😂 Why can't you give Elsa a balloon?\nBecause she'll let it go!",
  "😂 I'm reading a book about anti-gravity.\nIt's impossible to put down!",
  "😂 What do you call cheese that isn't yours?\nNacho cheese!",
  "😂 Why did the math book look so sad?\nBecause it had too many problems.",
  "😂 What do you get when you cross a snowman and a vampire?\nFrostbite!",
  "😂 Why did the bicycle fall over?\nBecause it was two-tired!"
]

const flirts = [
  "😍 Are you a magician? Because whenever I look at you, everyone else disappears.",
  "💘 Do you have a map? I keep getting lost in your eyes.",
  "🥰 Is your name Google? Because you have everything I've been searching for.",
  "😘 Are you a parking ticket? Because you've got 'fine' written all over you.",
  "💖 If you were a vegetable, you'd be a cute-cumber.",
  "😏 Do you believe in love at first text, or should I message again?",
  "💝 Are you a camera? Every time I look at you, I smile.",
  "🌹 If I had a star for every time you brightened my day, I'd have a galaxy.",
  "😊 You must be a broom, because you swept me off my feet.",
  "💫 I must be a snowflake, because I've fallen for you."
]

const truths = [
  "What's the most embarrassing thing you've done in public?",
  "Have you ever lied to get out of trouble? What was the lie?",
  "What's the longest you've gone without showering?",
  "Have you ever blamed someone else for something you did?",
  "What's the strangest dream you've ever had?",
  "What's something you've done that you hope your parents never find out?",
  "Have you ever sent a text to the wrong person? What did it say?",
  "What's the biggest secret you're keeping right now?",
  "What's the most childish thing you still do?",
  "What are you most afraid of and why?"
]

const dares = [
  "Send a voice note singing your favourite song for 30 seconds!",
  "Change your WhatsApp status to 'I love chatting with bots' for 1 hour.",
  "Send a funny selfie to the group right now!",
  "Record a voice note saying 'I am a potato' 5 times.",
  "Tell a joke in a different accent via voice note.",
  "Write a short love poem for the last person who texted you.",
  "Do 10 push-ups and send a voice note counting them!",
  "Send a voice note of you doing your best impression of a celebrity."
]

const eightBallAnswers = [
  "🎱 It is certain.", "🎱 Without a doubt.", "🎱 Yes, definitely!",
  "🎱 You may rely on it.", "🎱 Most likely.", "🎱 Signs point to yes.",
  "🎱 Reply hazy, try again.", "🎱 Ask again later.", "🎱 Cannot predict now.",
  "🎱 Don't count on it.", "🎱 My reply is no.", "🎱 Very doubtful.",
  "🎱 Outlook not so good.", "🎱 My sources say no."
]

const wyrQuestions = [
  "A) Be able to fly\nB) Be able to breathe underwater",
  "A) Know when you'll die\nB) Know how you'll die",
  "A) Always be 10 minutes late\nB) Always be 20 minutes early",
  "A) Have unlimited money\nB) Have unlimited time",
  "A) Speak every language\nB) Play every instrument",
  "A) Live without music\nB) Live without TV/movies",
  "A) Never use social media again\nB) Never watch Netflix again",
  "A) Be famous but broke\nB) Be rich but unknown",
  "A) Have no phone for a year\nB) Have no internet for a year"
]

const statusEmojis = ["❤️", "🔥", "😍", "👏", "💯", "😂", "🥰", "👌", "💪", "🎉"]

function containsLink(text) {
  return /https?:\/\/|wa\.me\/|chat\.whatsapp\.com\/|bit\.ly|t\.me/i.test(text)
}

async function downloadMedia(message, type) {
  const stream = await downloadContentFromMessage(message, type)
  let buffer = Buffer.alloc(0)
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk])
  }
  return buffer
}

function imageToSticker(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    exec(
      `ffmpeg -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2" "${outputPath}" -y`,
      (err) => { if (err) reject(err); else resolve() }
    )
  })
}

// ========== BOT ==========
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session")
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    browser: ["AI-BOT", "Chrome", "1.0"],
    shouldIgnoreJid: jid => false
  })

  sock.ev.on("creds.update", saveCreds)

  // ========== CONNECTION ==========
  // Helper to send logs to developer group
  async function devLog(text) {
    const target = global.DEV_GROUP_OVERRIDE || DEV_GROUP
    if (!target) return
    try {
      await sock.sendMessage(target, { text })
    } catch {}
  }

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update
    if (connection === "open") {
      console.log("🤖 BOT ONLINE (Claude AI Ready)")
      // Notify developer group when bot comes online
      setTimeout(() => {
        devLog(
          "🟢 *Bot Online*\n\n" +
          "📛 Bot: WhatsApp AI Bot\n" +
          "🕐 Time: " + new Date().toLocaleString("en-KE", { timeZone: "Africa/Nairobi" }) + "\n" +
          "🌍 Mode: " + botMode.toUpperCase() + "\n" +
          "⚙️ Engine: Claude AI"
        )
      }, 3000)
    }
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode
      if (code !== DisconnectReason.loggedOut) {
        console.log("🔄 Reconnecting...")
        devLog("🔄 *Bot Reconnecting...*\nReason: " + (lastDisconnect?.error?.message || "Unknown"))
        startBot()
      } else {
        console.log("❌ Logged out. Delete session folder to reset.")
        devLog("❌ *Bot Logged Out*\nDelete session folder to reset.")
      }
    }
  })

  // 📲 Pairing login
  if (!sock.authState.creds.registered) {
    let phone = await question("Enter phone number (with country code): ")
    phone = phone.replace(/[^0-9]/g, "")
    try {
      const code = await sock.requestPairingCode(phone)
      console.log("🔑 PAIRING CODE:", code)
    } catch (e) {
      console.log("Pairing error:", e.message)
    }
  }

  // ========== AUTO VIEW & REACT STATUS ==========
  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const m of messages) {
      if (m.key.remoteJid !== "status@broadcast") continue
      if (!m.message) continue
      const statusOwner = m.key.participant || m.key.remoteJid
      console.log(`👁️ Status from: ${statusOwner}`)

      if (autoViewStatus) {
        try {
          await sock.readMessages([m.key])
          console.log(`✅ Viewed status of ${statusOwner}`)
        } catch (e) { console.error("Auto-view error:", e.message) }
      }

      if (autoReactStatus) {
        try {
          await sock.sendMessage("status@broadcast", {
            react: { text: pick(statusEmojis), key: m.key }
          })
          console.log(`💬 Reacted to status of ${statusOwner}`)
        } catch (e) { console.error("Auto-react error:", e.message) }
      }

      if (autoReplyStatus) {
        try {
          await sock.sendMessage(statusOwner, {
            text: `👀 I just viewed your status! ${pick(statusEmojis)}`
          })
        } catch (e) { console.error("Auto-reply status error:", e.message) }
      }
    }
  })

  // ========== WELCOME / GOODBYE ==========
  sock.ev.on("group-participants.update", async ({ id, participants, action }) => {
    try {
      const meta = await sock.groupMetadata(id)
      const groupName = meta.subject
      for (const participant of participants) {
        const num = participant.split("@")[0]
        if (action === "add") {
          await sock.sendMessage(id, {
            text:
              `👋 Welcome to *${groupName}*, @${num}!\n\n` +
              `We're glad to have you here 🎉\n` +
              `Type *.menu* to see what this bot can do.`,
            mentions: [participant]
          })
        } else if (action === "remove") {
          await sock.sendMessage(id, {
            text: `👋 Goodbye @${num}, we'll miss you!\n_Hope to see you again soon_ 🙏`,
            mentions: [participant]
          })
        }
      }
    } catch (e) { console.error("Welcome/Goodbye error:", e.message) }
  })

  // ========== MESSAGES ==========
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0]
    if (!m.message) return
    if (m.key.remoteJid === "status@broadcast") return

    const from = m.key.remoteJid
    const sender = m.key.participant || from
    const inGroup = isGroup(from)
    const botIsAdmin = inGroup ? await isAdmin(sock, from, sock.user.id) : false
    const senderIsAdmin = inGroup ? await isAdmin(sock, from, sender) : false

    const msg =
      m.message.conversation ||
      m.message.extendedTextMessage?.text ||
      m.message.imageMessage?.caption ||
      ""

    const msgType = Object.keys(m.message)[0]
    console.log(`📩 [${inGroup ? "GROUP" : "DM"}] ${sender}: ${msg || msgType}`)

    const reply = (text) => sock.sendMessage(from, { text }, { quoted: m })

    // ========== MODE GATE ==========
    if (botMode === "private" && !isOwner(sender)) return

    // ========== ANTI-LINK ==========
    if (inGroup && antilinkGroups.has(from) && containsLink(msg)) {
      if (!senderIsAdmin && !isOwner(sender)) {
        try {
          await sock.sendMessage(from, {
            text: `⚠️ @${sender.split("@")[0]}, links are *not allowed* in this group!`,
            mentions: [sender]
          })
          if (botIsAdmin) await sock.sendMessage(from, { delete: m.key })
        } catch (e) { console.error("Anti-link error:", e.message) }
        return
      }
    }

    if (!msg && msgType !== "imageMessage") return

    // ========== STICKER ==========
    if (msg === ".sticker" || msg === ".s") {
      const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage
      const imageMsg = m.message.imageMessage || quoted?.imageMessage
      if (!imageMsg) return reply("❌ Send an image with caption *.sticker* or reply to an image.")
      try {
        await reply("⏳ Converting to sticker...")
        const buffer = await downloadMedia(imageMsg, "image")
        const tmpIn = path.join("/tmp", `in_${Date.now()}.jpg`)
        const tmpOut = path.join("/tmp", `out_${Date.now()}.webp`)
        fs.writeFileSync(tmpIn, buffer)
        await imageToSticker(tmpIn, tmpOut)
        const webpBuffer = fs.readFileSync(tmpOut)
        await sock.sendMessage(from, { sticker: webpBuffer }, { quoted: m })
        fs.unlinkSync(tmpIn)
        fs.unlinkSync(tmpOut)
      } catch (e) {
        console.error("Sticker error:", e.message)
        return reply("❌ Failed. Make sure ffmpeg is installed:\n`pkg install ffmpeg`")
      }
      return
    }

    // ========== MENU ==========
    if (msg === ".menu") {
      return reply(
        `🤖 *AI BOT MENU*\n\n` +

        `📌 *General:*\n` +
        `⚡ *.ping* — Check speed\n` +
        `⚡ *.alive* — Check if online\n` +
        `⚡ *.botinfo* — Bot stats & uptime\n` +
        `⚡ *.uptime* — Bot uptime\n` +
        `⚡ *.getjid* — Get your JID\n` +
        `⚡ *.ai <msg>* — Ask Claude AI\n` +
        `⚡ *.time* — Current time\n` +
        `⚡ *.calc <expr>* — Calculator\n` +
        `⚡ *.quote* — Random motivation\n` +
        `⚡ *.sticker* — Image to Sticker\n` +
        `⚡ *.weather <city>* — Get weather\n` +
        `⚡ *.translate <lang> <text>* — Translate\n` +
        `⚡ *.movie <name>* — Movie info\n` +
        `⚡ *.qr <text>* — Generate QR code\n` +
        `⚡ *.wame <number>* — WhatsApp link\n\n` +

        `🔍 *Search & Media:*\n` +
        `⚡ *.play <song>* — Search song on YouTube\n` +
        `⚡ *.ytvideo <query>* — YouTube video search\n` +
        `⚡ *.spotify <query>* — Spotify search\n` +
        `⚡ *.lyrics <song>* — Find song lyrics\n` +
        `⚡ *.tiktok <query>* — TikTok search\n` +
        `⚡ *.pinterest <query>* — Pinterest search\n` +
        `⚡ *.google <query>* — Google search\n` +
        `⚡ *.meme* — Get meme links\n\n` +

        `🎮 *Fun & Games:*\n` +
        `⚡ *.joke* — Random joke\n` +
        `⚡ *.flirt* — Flirt line\n` +
        `⚡ *.pickupline* — Pickup line\n` +
        `⚡ *.fact* — Random fact\n` +
        `⚡ *.truth* — Truth question\n` +
        `⚡ *.dare* — Dare challenge\n` +
        `⚡ *.tod* — Random truth or dare\n` +
        `⚡ *.nhie* — Never have I ever\n` +
        `⚡ *.paranoia* — Paranoia game\n` +
        `⚡ *.question* — Random deep question\n` +
        `⚡ *.wyr* — Would you rather\n` +
        `⚡ *.8ball <question>* — Magic 8 ball\n` +
        `⚡ *.ship <name> and <name>* — Love meter\n` +
        `⚡ *.detect <statement>* — Truth detector\n` +
        `⚡ *.roast <name>* — Roast someone\n` +
        `⚡ *.compliment <name>* — Compliment someone\n` +
        `⚡ *.tictactoe* — Tic Tac Toe\n\n` +

        `👥 *Group only (admins):*\n` +
        `⚡ *.tagall* — Tag everyone\n` +
        `⚡ *.groupinfo* — Group details\n` +
        `⚡ *.antilink on/off* — Toggle anti-link\n` +
        `⚡ *.kick @user* — Remove member\n` +
        `⚡ *.promote @user* — Make admin\n` +
        `⚡ *.demote @user* — Remove admin\n` +
        `⚡ *.mute* — Only admins can message\n` +
        `⚡ *.unmute* — Everyone can message\n\n` +

        `🛡️ *Auto-Protection (always on):*\n` +
        `⚡ Anti-Delete — Deleted msgs sent to owner DM\n` +
        `⚡ Anti-Edit — Edited msgs sent to owner DM\n` +
        `⚡ Anti-ViewOnce — View-once media forwarded to owner\n\n` +

        `📺 *Status (owner only):*\n` +
        `⚡ *.autoview on/off* — Auto view status\n` +
        `⚡ *.autoreact on/off* — Auto react to status\n` +
        `⚡ *.autoreply on/off* — Auto reply to status\n\n` +

        `👑 *Owner only:*\n` +
        `⚡ *.mode private/public* — Bot access mode\n` +
        `⚡ *.broadcast <msg>* — Send to all groups\n` +
        `⚡ *.block <number>* — Block a user\n` +
        `⚡ *.unblock <number>* — Unblock a user\n` +
        `⚡ *.restart* — Restart bot\n` +
        `⚡ *.shutdown* — Turn off bot\n\n` +

        `🛠️ *Developer Group:*\n` +
        `⚡ *.setdevgroup* — Set current group as dev group\n` +
        `⚡ *.devgroupinfo* — Show dev group JID\n` +
        `⚡ *.devlog <msg>* — Send message to dev group\n` +
        `⚡ *.botstatus* — Send full status to dev group`
      )
    }

    // ========== GENERAL COMMANDS ======
