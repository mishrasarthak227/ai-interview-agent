# simple_audio_analyzer.py
"""
Simple audio analysis fallback that doesn't require librosa.
Basic analysis using audio file properties and heuristics.
"""

import os
import wave
import struct
import math
from typing import Dict, Any

def analyze_audio_simple(audio_path: str, transcript: str = "") -> Dict[str, Any]:
    """
    Simple audio analysis using basic file properties and transcript analysis.
    Fallback when librosa is not available or fails.
    """
    try:
        # Check file exists
        if not os.path.exists(audio_path):
            return {"error": f"Audio file not found: {audio_path}"}

        if os.path.getsize(audio_path) == 0:
            return {"error": "Audio file is empty"}

        # Try to read WAV file properties
        duration = 0
        try:
            with wave.open(audio_path, 'rb') as wav_file:
                frames = wav_file.getnframes()
                sample_rate = wav_file.getframerate()
                duration = frames / float(sample_rate)
        except:
            # Estimate duration from file size (rough approximation)
            file_size = os.path.getsize(audio_path)
            duration = file_size / 32000  # Rough estimate for typical audio

        # Analyze transcript for content-based metrics
        word_count = len(transcript.split()) if transcript else 0

        # Calculate speaking rate
        if duration > 0 and word_count > 0:
            words_per_minute = (word_count / duration) * 60
        else:
            words_per_minute = 0

        # Simple heuristic scores based on transcript and timing
        pace_score = calculate_pace_score(words_per_minute)
        confidence_score = calculate_confidence_score(transcript, duration)
        tone_score = calculate_tone_score(transcript)

        return {
            "duration": round(duration, 2),
            "words_per_minute": round(words_per_minute, 1),
            "pace_score": round(pace_score, 1),
            "confidence_score": round(confidence_score, 1),
            "tone_score": round(tone_score, 1),
            "word_count": word_count,
            "analysis_summary": generate_simple_summary(pace_score, confidence_score, tone_score),
            "method": "simple_analysis"
        }

    except Exception as e:
        return {
            "error": f"Simple audio analysis failed: {str(e)}",
            "duration": 0,
            "words_per_minute": 0,
            "pace_score": 0,
            "confidence_score": 0,
            "tone_score": 0,
            "analysis_summary": "Audio analysis failed"
        }

def calculate_pace_score(wpm: float) -> float:
    """Calculate pace score based on words per minute"""
    if wpm == 0:
        return 30  # Default low score for no speech

    # Optimal range is 140-180 WPM
    if 140 <= wpm <= 180:
        return 90 + (10 * (1 - abs(wpm - 160) / 20))  # Peak at 160 WPM
    elif 100 <= wpm <= 200:
        return 70 + (20 * (1 - abs(wpm - 160) / 40))
    elif 80 <= wpm <= 220:
        return 50 + (20 * (1 - abs(wpm - 160) / 60))
    else:
        return max(20, 50 - abs(wpm - 160) / 4)

def calculate_confidence_score(transcript: str, duration: float) -> float:
    """Calculate confidence score based on transcript analysis"""
    if not transcript or duration == 0:
        return 30

    # Factors that indicate confidence
    score = 50  # Base score

    # Length and completeness
    word_count = len(transcript.split())
    if word_count > 30:
        score += 20
    elif word_count > 15:
        score += 10
    elif word_count < 5:
        score -= 20

    # Check for filler words (indicates less confidence)
    filler_words = ['um', 'uh', 'like', 'you know', 'sort of', 'kind of']
    filler_count = sum(transcript.lower().count(filler) for filler in filler_words)
    if filler_count > word_count * 0.1:  # More than 10% filler words
        score -= 15
    elif filler_count > word_count * 0.05:  # More than 5% filler words
        score -= 8

    # Check for positive language
    positive_words = ['excited', 'passionate', 'confident', 'experienced', 'skilled', 'accomplished']
    if any(word in transcript.lower() for word in positive_words):
        score += 10

    return max(10, min(100, score))

def calculate_tone_score(transcript: str) -> float:
    """Calculate tone score based on language analysis"""
    if not transcript:
        return 40

    score = 60  # Base score
    words = transcript.lower().split()

    # Professional language
    professional_words = ['experience', 'skills', 'team', 'project', 'challenge', 'solution', 'result']
    professional_count = sum(1 for word in professional_words if word in transcript.lower())
    if professional_count > 2:
        score += 15
    elif professional_count > 0:
        score += 8

    # Enthusiastic language
    enthusiastic_words = ['love', 'passionate', 'excited', 'enjoy', 'amazing', 'great']
    if any(word in transcript.lower() for word in enthusiastic_words):
        score += 10

    # Negative indicators
    negative_words = ['difficult', 'hard', 'problem', 'can\'t', 'unable', 'confused']
    if any(word in transcript.lower() for word in negative_words):
        score -= 10

    return max(20, min(100, score))

def generate_simple_summary(pace_score: float, confidence_score: float, tone_score: float) -> str:
    """Generate summary based on simple analysis"""
    summary_parts = []

    # Pace feedback
    if pace_score > 80:
        summary_parts.append("excellent pacing")
    elif pace_score > 60:
        summary_parts.append("good pacing")
    else:
        summary_parts.append("work on pacing")

    # Confidence feedback
    if confidence_score > 75:
        summary_parts.append("confident delivery")
    elif confidence_score > 60:
        summary_parts.append("fairly confident")
    else:
        summary_parts.append("build more confidence")

    # Tone feedback
    if tone_score > 75:
        summary_parts.append("professional tone")
    elif tone_score > 60:
        summary_parts.append("good tone")

    return ", ".join(summary_parts) + "."