# 🚀 SignalOS Lite v2

**AI-powered content engine for weekly content creation**

SignalOS Lite v2 is a local-first AI system that helps you generate high-quality social media content using:

* Creator-style inspiration
* Real-time content signals (news)
* Multi-style AI writing
* Weekly batch workflow

---

## ✨ Features

### 🧠 AI Content Generation

* Generate ideas from topics, sources, and signals
* Create content in **5 styles**:

  * Professional
  * Bold
  * Storytelling
  * Contrarian
  * Analytical

---

### 🎯 Style Learning (References)

* Add:

  * LinkedIn profiles
  * X (Twitter) profiles
  * Individual posts
* Extracts **tone, structure, and writing style**
* Uses it to influence AI output (no direct copying)

---

### 🌐 Content Signals (News)

* Add news sources (RSS / websites)
* Automatically fetch:

  * Headlines
  * Summaries
* Use real-world data for content generation

---

### ⚡ Bulk Content Generation

* Generate **10 posts in one click**
* Perfect for weekly content planning

---

### 🖼️ Image Prompt Generator

* Generate image prompts for each post
* Optimized for:

  * LinkedIn visuals
  * AI image tools (Midjourney, DALL·E)

---

### 📦 Weekly Content System

* Save generated posts locally
* Export as structured text file
* Supports:

  * LinkedIn
  * Twitter
  * Image prompts

---

### 🎛️ Export Controls

Choose what to export:

* ✅ LinkedIn
* ✅ Twitter
* ✅ Image prompts

---

### 💾 Local-First Design

* No database
* No authentication
* Uses localStorage
* Fully private workflow

---

## 🧩 Project Structure

```bash
SignalOS-Lite-v2/
├── ai-engine/       # Backend (Groq-powered AI engine)
├── signalos-web/    # Frontend (Next.js app)
├── README.md
```

---

## ⚙️ Tech Stack

* **Frontend:** Next.js 14, TypeScript, TailwindCSS
* **Backend:** Node.js, Express
* **AI:** Groq API
* **Storage:** localStorage

---

## 🚀 How to Run

### 1️⃣ Start AI Engine

```bash
cd ai-engine
npm install
npm run dev
```

Runs on:

```bash
http://localhost:5000
```

---

### 2️⃣ Start Frontend

```bash
cd signalos-web
npm install
npm run dev
```

Open:

```bash
http://localhost:3000
```

---

### 3️⃣ Environment Setup

Create `.env` inside `ai-engine`:

```env
PORT=5000
NODE_ENV=development

GROQ_API_KEYS=your_key_here
GROQ_FAST_MODEL=llama-3.3-70b-versatile
GROQ_QUALITY_MODEL=llama-3.3-70b-versatile
```

---

## 🔁 Workflow

```text
Add style sources + content sources
        ↓
Generate ideas
        ↓
Generate content (5 styles)
        ↓
(Optional) generate image prompts
        ↓
Save → Export weekly content
```

---

## ⚠️ Notes

* This tool does **not copy content directly**
* It learns writing style and generates original outputs
* LinkedIn/X scraping is limited — manual input recommended for best results

---

## 🎯 Use Case

Best for:

* Founders
* Content creators
* Indie builders
* Weekly social media planning

---

## 🚧 Future Scope

* Better signal extraction
* Improved style modeling
* Platform-specific optimization

---

## 👤 Author

**Pasha**
GitHub: https://github.com/Pasha2308

---

## ⭐ Support

If you find this useful, consider giving it a ⭐ on GitHub!
