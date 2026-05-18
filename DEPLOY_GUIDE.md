# 📖 Complete Deployment Guide (Beginner Friendly)

---

## STEP 1 — Create a GitHub Account
1. Go to https://github.com
2. Click **Sign Up**
3. Enter your email, password, username
4. Verify your email

---

## STEP 2 — Create a New Repository
1. Click the **+** button (top right) → **New repository**
2. Name it: `whatsapp-bot` (or anything you like)
3. Set it to **Private** (important — keeps your code safe)
4. Click **Create repository**

---

## STEP 3 — Upload Your Files to GitHub

### Option A: Upload via Browser (Easiest — no coding needed)
1. Open your new repository on GitHub
2. Click **uploading an existing file**
3. Drag and drop these files:
   - `bot.js`
   - `package.json`
   - `.gitignore`
   - `.env.example`
   - `Dockerfile`
   - `README.md`
4. Click **Commit changes**

> ⚠️ NEVER upload your `.env` file — it has your secret keys!

### Option B: Upload via Termux (if you prefer)
```bash
# Install git
pkg install git

# Go to your bot folder
cd /path/to/your/bot

# Set up git
git init
git add .
git commit -m "first upload"

# Connect to GitHub (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

---

## STEP 4 — Deploy on Railway (Free, easiest server)

### 4a. Create Railway account
1. Go to https://railway.app
2. Click **Login with GitHub**
3. Authorize Railway

### 4b. Deploy your bot
1. Click **New Project**
2. Click **Deploy from GitHub repo**
3. Select your `whatsapp-bot` repository
4. Railway will auto-detect it's a Node.js app

### 4c. Add your environment variables
1. Click your project → **Variables** tab
2. Add each variable:
   ```
   OWNER_NUMBER = 2547XXXXXXXX
   CLAUDE_API_KEY = sk-ant-your-key-here
   WEATHER_API_KEY = your-weather-key
   BOT_MODE = public
   ```
3. Click **Deploy** — Railway will build and start your bot!

### 4d. Get your pairing code
1. Click **Deployments** tab
2. Click **View Logs**
3. You'll see: `Enter phone number:`
4. Railway doesn't support interactive input, so...

> ⚠️ **Pairing on Railway:** You need to run the bot locally FIRST
> to generate the `session/` folder, then upload that folder to Railway.
> See Step 5 below.

---

## STEP 5 — First Time Login (Generate Session)

Do this on your PC or Termux FIRST before deploying:

```bash
# Install Node.js (if on PC)
# Download from https://nodejs.org (choose LTS version)

# Install dependencies
npm install

# Run bot for the first time
node bot.js
```

1. Enter your phone number with country code: `2547XXXXXXXX`
2. You'll get a **pairing code** like: `ABCD-1234`
3. Open WhatsApp → Linked Devices → Link a Device → Enter code
4. Bot connects! A `session/` folder is created
5. Stop the bot (Ctrl+C)

Now upload the `session/` folder to Railway:
- Go to Railway → your project → **Files** (if available)
- Or use the Railay CLI:
  ```bash
  npm install -g @railway/cli
  railway login
  railway up
  ```

---

## STEP 6 — Alternative: Deploy on Render (also free)

1. Go to https://render.com
2. Sign up with GitHub
3. Click **New** → **Web Service**
4. Connect your GitHub repo
5. Set:
   - **Build Command:** `npm install`
   - **Start Command:** `node bot.js`
6. Add environment variables (same as Railway)
7. Click **Deploy**

---

## STEP 7 — Keep Bot Alive with PM2 (on a VPS)

If you have a VPS (like DigitalOcean, Contabo, etc.):

```bash
# SSH into your server
ssh root@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Upload your files (via FileZilla or scp)
# Then run:
npm install
pm2 start bot.js --name whatsapp-bot
pm2 save
pm2 startup
```

PM2 will:
- Keep your bot running 24/7
- Auto-restart if it crashes
- Start automatically when server reboots

---

## 🔑 Where to Get API Keys

| Key | Where to get it | Cost |
|-----|----------------|------|
| CLAUDE_API_KEY | https://console.anthropic.com | Free credits to start |
| WEATHER_API_KEY | https://openweathermap.org/api | Free tier available |

---

## ❓ Common Problems

**Bot doesn't connect:**
- Delete the `session/` folder and re-pair

**Commands not working:**
- Check your OWNER_NUMBER has no spaces or + sign

**Bot stops after a while:**
- Use PM2 or Railway (they keep it running)

**ffmpeg not found (sticker error):**
- On Ubuntu/VPS: `sudo apt install ffmpeg`
- On Railway/Render: Already handled by Dockerfile

---

## 📁 Your Final File Structure
```
whatsapp-bot/
├── bot.js          ← main bot file
├── package.json    ← dependencies
├── .env            ← your secret keys (NEVER upload)
├── .env.example    ← safe template (upload this)
├── .gitignore      ← tells git to ignore .env & session
├── Dockerfile      ← for Railway/Render deployment
├── README.md       ← project description
└── session/        ← auto-created after first login (don't delete!)
```
