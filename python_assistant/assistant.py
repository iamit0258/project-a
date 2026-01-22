import os
import asyncio
import speech_recognition as sr
from groq import Groq
import edge_tts
import pygame
from dotenv import load_dotenv
from colorama import init, Fore, Style
import time
import sys
import requests
import json

# Try importing ElevenLabs, but don't fail if not installed yet (though we will install it)
# ElevenLabs is now imported conditionally within the API key check.

# Initialize colors
init()

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print(Fore.RED + "Error: GROQ_API_KEY not found in .env file" + Style.RESET_ALL)
    sys.exit(1)

# Check for ElevenLabs Key
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
elevenlabs_client = None
if ELEVENLABS_API_KEY:
    try:
        from elevenlabs.client import ElevenLabs
        from elevenlabs import stream
        elevenlabs_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
        print(Fore.GREEN + "ElevenLabs API connected." + Style.RESET_ALL)
    except ImportError:
        print(Fore.YELLOW + "ElevenLabs library not installed." + Style.RESET_ALL)
    except Exception as e:
        print(Fore.YELLOW + f"Could not connect to ElevenLabs: {e}" + Style.RESET_ALL)

client = Groq(api_key=GROQ_API_KEY)

# Constants
VOICE_EN = "en-IN-NeerjaNeural"  # Soft, calming Indian English female voice
VOICE_HI = "hi-IN-SwaraNeural" # Natural, soft Hindi voice
OUTPUT_FILE = "response.mp3"
API_URL = "http://localhost:5000/api/messages"

# User provided Voice ID
ELEVENLABS_VOICE_ID = "Z454IZ827TNOaUaaQSzE" 

SYSTEM_PROMPT = """You are a highly empathetic, calming, and human-like voice assistant. 
You are a highly empathetic, calm, and human-like voice assistant named “Project A.”
You are FEMALE and emotionally intelligent, always sensing the user’s mood and responding with warmth, reassurance, and understanding.

Language rules:
- If the user speaks in English, respond in English.
- If the user speaks in Hindi, respond ONLY in Hindi using Devanagari script (e.g., नमस्ते, मैं आपकी मदद कर सकती हूँ).
- In Hindi, ALWAYS use feminine grammar (e.g., “मैं कर सकती हूँ”, “मेरी तरफ़ से”, “मैं कोशिश करूँगी”).
- NEVER use masculine forms such as “करता हूँ”, “करूँगा”, etc.

Conversation style:
- Keep responses short and natural (1–3 sentences), suitable for a voice conversation, unless the user asks for a detailed explanation.
- Maintain a gentle, supportive, positive, and calming tone at all times.
- Speak like a caring human, not like a robot or an assistant reading instructions.

Your goal is to make the user feel heard, safe, and supported.
"""

class VoiceAssistant:
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.microphone = sr.Microphone()
        # Initialize pygame mixer for audio playback
        pygame.mixer.init()
        self.user_id = os.getenv("USER_ID", "")
        
    def send_to_web_ui(self, role, content):
        """Send message to the Web UI via API."""
        try:
            print(Fore.BLUE + f"Syncing {role} message to UI..." + Style.RESET_ALL)
            headers = {
                "Content-Type": "application/json",
                "x-voice-secret": "project-a-voice-secret-123",
                "x-user-id": self.user_id
            }
            if self.user_id:
                print(f"Using User ID: {self.user_id}")
                
            payload = {
                "role": role,
                "content": content,
                "skip_ai": True
            }
            
            response = requests.post(API_URL, json=payload, headers=headers)
            if response.status_code >= 400:
                print(Fore.RED + f"Sync failed: {response.status_code} - {response.text}" + Style.RESET_ALL)
        except Exception as e:
            print(Fore.RED + f"Failed to sync with UI: {e}" + Style.RESET_ALL)
        
    def speak(self, text, language="en"):
        """Convert text to speech using ElevenLabs (if avail) or edge-tts, then play with pygame."""
        print(Fore.CYAN + f"Assistant: {text}" + Style.RESET_ALL)
        
        # Sync with UI
        self.send_to_web_ui("assistant", text)
        
        audio_generated = False

        # Method 1: ElevenLabs
        if elevenlabs_client:
            try:
                # Use generate method from the client text_to_speech resource
                audio_generator = elevenlabs_client.text_to_speech.convert(
                    text=text,
                    voice_id=ELEVENLABS_VOICE_ID,
                    model_id="eleven_multilingual_v2"
                )
                
                # Save audio to file instead of streaming (avoids mpv dependency)
                with open(OUTPUT_FILE, "wb") as f:
                    for chunk in audio_generator:
                        f.write(chunk)
                
                audio_generated = True
            except Exception as e:
                # Silently fail back to Edge-TTS for cleaner logs
                pass 
                # print(Fore.RED + f"ElevenLabs Error: {e}. Switching to standard voice." + Style.RESET_ALL)
        
        # Method 2: Edge-TTS (Fallback)
        if not audio_generated:
            voice = VOICE_HI if language == "hi" else VOICE_EN
            
            async def _save_audio():
                communicate = edge_tts.Communicate(text, voice)
                await communicate.save(OUTPUT_FILE)

            try:
                asyncio.run(_save_audio())
            except Exception as e:
                print(Fore.RED + f"Error in TTS: {e}" + Style.RESET_ALL)
                return

        # Common Playback (Pygame)
        try:
            # Play the audio
            pygame.mixer.music.load(OUTPUT_FILE)
            pygame.mixer.music.play()
            
            while pygame.mixer.music.get_busy():
                pygame.time.Clock().tick(10)
                
            pygame.mixer.music.unload()

        except Exception as e:
            print(Fore.RED + f"Error in Playback: {e}" + Style.RESET_ALL)

    def listen(self):
        """Listen to microphone input and return text."""
        with self.microphone as source:
            print(Fore.YELLOW + "\nListening... (Speak now)" + Style.RESET_ALL)
            self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
            try:
                audio = self.recognizer.listen(source, timeout=5, phrase_time_limit=10)
                print(Fore.GREEN + "Processing..." + Style.RESET_ALL)
                
                # Try to detect if it's Hindi or English
                # Note: SpeechRecognition doesn't auto-detect well, so we might try both or default to English/Hindi mixed
                # For now, we use 'en-IN' which often captures both for Indian users
                text = self.recognizer.recognize_google(audio, language="en-IN")
                print(Fore.WHITE + f"You said: {text}" + Style.RESET_ALL)
                
                # Sync with UI (User)
                self.send_to_web_ui("user", text)
                
                return text
            except sr.WaitTimeoutError:
                pass
            except sr.UnknownValueError:
                pass # print(Fore.RED + "Sorry, I didn't catch that." + Style.RESET_ALL)
            except sr.RequestError as e:
                print(Fore.RED + f"Could not request results; {e}" + Style.RESET_ALL)
            
        return None

    def think(self, user_input):
        """Process text through Groq LLM."""
        try:
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_input}
                ],
                temperature=0.7,
                max_tokens=150,
                top_p=1,
                stop=None,
                stream=False
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(Fore.RED + f"Error in AI processing: {e}" + Style.RESET_ALL)
            return "I am having trouble thinking clearly right now. Can we try again?"

    def detect_language(self, text):
        return "en" # Default to English voice (Ana) or we can enable dynamic switching later.
        # To truly support bilingual TTS, we loop through sentences or rely on `en-IN` voice which serves both well.
        # Let's try `en-IN-NeerjaNeural` (if available) or `hi-IN-SwaraNeural` (reads Hindi script well).
        
        # Improved: Simple check, if more than 20% of chars are non-ascii (Devanagari), use HI voice.
        non_ascii = sum(1 for c in text if ord(c) > 127)
        if non_ascii > len(text) * 0.2:
            return "hi"
        return "en"

    def run(self):
        print(Fore.MAGENTA + "Voice Assistant Initialized. Ctrl+C to exit." + Style.RESET_ALL)
        self.speak("Hello! I am ready to listen. How are you feeling today?")
        
        while True:
            try:
                user_input = self.listen()
                if user_input:
                    # Determine response
                    response_text = self.think(user_input)
                    
                    # Determine language for TTS
                    lang = self.detect_language(response_text)
                    
                    # Speak response
                    self.speak(response_text, lang)
                    
            except KeyboardInterrupt:
                print(Fore.YELLOW + "\nGoodbye!" + Style.RESET_ALL)
                break
            except Exception as e:
                print(Fore.RED + f"An error occurred: {e}" + Style.RESET_ALL)

if __name__ == "__main__":
    bot = VoiceAssistant()
    bot.run()
