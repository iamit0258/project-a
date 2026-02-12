# Project A: The Empathetic AI Companion 🤖✨

Project A is a state-of-the-art, emotionally intelligent AI platform designed to provide a warm, empathetic, and human-like interaction experience. It combines a modern web interface with a bilingual, voice-enabled assistant to create a seamless bridge between humans and AI.

## 🌟 Vision
To move beyond robotic assistants and create a companion that truly understands tone, mood, and language context—supporting both English and Hindi with deep empathy.

## 🚀 Key Features
- **Empathetic AI Persona**: **Project A** uses specialized system prompts to sense user mood and respond with genuine warmth.
- **Bilingual Voice Support**: Native support for English and Hindi (Devanagari script), including intelligent language detection.
- **High-Fidelity Speech**: Integration with ElevenLabs (Multilingual v2) for premium, lifelike voices, with Edge-TTS as a robust fallback.
- **Web-to-Voice Sync**: Real-time synchronization between the Python-based voice interface and the React web UI.
- **Secure Architecture**: Built with a privacy-first mindset using Supabase and secure API handling.

## 🛠 Tech Stack
- **Frontend**: React 18, Vite 7, Tailwind CSS, Framer Motion, Radix UI.
- **Backend**: Node.js/Express, PostgreSQL (managed via Supabase).
- **AI/ML**: Groq Llama 3.3 (for reasoning), ElevenLabs (for TTS), Python (for voice processing).
- **Voice Intelligence**: SpeechRecognition, Pygame (audio handling), Edge-TTS.

## 🏗 Setup & Installation

### 1. Prerequisites
- Node.js (v20+)
- Python 3.10+
- Supabase Account
- API Keys for Groq and ElevenLabs

### 2. Running the Web Platform
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Running the Voice Assistant
```bash
# Navigate to the assistant directory
cd python_assistant

# Install requirements
pip install -r requirements.txt

# Run the assistant
npm run voice
```

---
## ⚖️ License
This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.