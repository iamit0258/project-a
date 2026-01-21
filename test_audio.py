import asyncio
import edge_tts
import pygame
import os

OUTPUT_FILE = "test_audio.mp3"
VOICE = "en-IN-NeerjaNeural"

async def main():
    print("Generating audio...")
    communicate = edge_tts.Communicate("Hello! This is a test of the audio system.", VOICE)
    await communicate.save(OUTPUT_FILE)
    print("Audio saved to", OUTPUT_FILE)

    print("Playing audio...")
    pygame.mixer.init()
    pygame.mixer.music.load(OUTPUT_FILE)
    pygame.mixer.music.play()
    
    while pygame.mixer.music.get_busy():
        pygame.time.Clock().tick(10)
    
    pygame.mixer.music.unload()
    print("Playback finished.")

if __name__ == "__main__":
    asyncio.run(main())
