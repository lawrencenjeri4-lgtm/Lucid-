# 🤖 WhatsApp AI Bot

A powerful WhatsApp bot built with Baileys + Claude AI.

## ✨ Features
- 50+ commands (fun, admin, media, AI, status)
- Claude AI auto-chat in DMs
- Anti-delete, anti-edit, anti-viewonce
- Group management (kick, mute, promote, antilink)
- Auto view/react to status updates
- Weather, translate, movie info, QR codes and more

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up your .env
```bash
cp .env.example .env
# Edit .env with your keys
```

### 3. Run the bot
```bash
node bot.js
```
Enter your phone number when prompted and use the pairing code in WhatsApp.

## 🔑 Environment Variables
| Variable | Description |
|----------|-------------|
| OWNER_NUMBER | Your number with country code e.g. 2547XXXXXXXX |
| CLAUDE_API_KEY | Get from console.anthropic.com |
| WEATHER_API_KEY | Get free from openweathermap.org |
| BOT_MODE | public or private |

## 📦 Deploy on Railway
1. Push this repo to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Add your environment variables in Railway dashboard
4. Done — bot runs 24/7!

## 🖥️ Keep alive with PM2
```bash
npm install -g pm2
pm2 start bot.js --name mybot
pm2 save
pm2 startup
```
