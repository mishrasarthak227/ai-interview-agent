# transcriber.py
"""
Transcription helper using OpenAI Whisper API.
Returns transcript string (empty string if transcription not available).
"""

import os
import traceback
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

def transcribe_file(filepath: str) -> str:
    """
    Transcribe the given audio file using OpenAI Whisper API.
    Returns transcript string (empty string if error occurs).
    """
    try:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        with open(filepath, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )

        return transcript.text.strip()

    except Exception as e:
        print(f"OpenAI Whisper API transcription error: {e}")
        print(traceback.format_exc())
        return ""

# Convenience test function (interactive)
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python transcriber.py <path-to-audio-file>")
        sys.exit(1)
    path = sys.argv[1]
    print("Transcribing:", path)
    print(transcribe_file(path))
