# audio_analyzer.py
"""
Advanced audio analysis for interview performance.
Analyzes tone, pace, confidence, and other vocal characteristics.
"""

import os
from typing import Dict, Any
import warnings
warnings.filterwarnings("ignore")

# Try to import librosa, fall back to simple analysis if not available
try:
    import librosa
    import numpy as np
    HAS_LIBROSA = True
except ImportError:
    HAS_LIBROSA = False

from simple_audio_analyzer import analyze_audio_simple

def analyze_audio_metrics(audio_path: str, transcript: str = "") -> Dict[str, Any]:
    """
    Analyze audio file for interview performance metrics.
    Returns dictionary with tone, pace, confidence, and other vocal characteristics.
    """

    # If librosa is not available, use simple analysis
    if not HAS_LIBROSA:
        return analyze_audio_simple(audio_path, transcript)

    try:
        # Check if file exists and has content
        if not os.path.exists(audio_path):
            return {"error": f"Audio file not found: {audio_path}"}

        if os.path.getsize(audio_path) == 0:
            return {"error": "Audio file is empty"}

        # Load audio file with error handling
        y, sr = librosa.load(audio_path, sr=None)

        # Basic audio metrics
        duration = len(y) / sr

        # Pace Analysis (words per minute estimation)
        # Based on speech energy and pause detection
        frame_length = 2048
        hop_length = 512

        # Energy-based speech detection
        energy = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
        energy_threshold = np.mean(energy) * 0.3
        speech_frames = energy > energy_threshold
        speech_duration = np.sum(speech_frames) * hop_length / sr

        # Estimate speaking rate (rough approximation)
        if speech_duration > 0:
            estimated_syllables = speech_duration * 4  # rough estimate
            words_per_minute = (estimated_syllables / 2) * (60 / duration) if duration > 0 else 0
        else:
            words_per_minute = 0

        # Confidence Analysis (volume consistency and variation)
        volume_mean = np.mean(energy)
        volume_std = np.std(energy)
        volume_consistency = 1 / (1 + volume_std / (volume_mean + 0.01))  # Higher = more consistent

        # Tone Analysis (pitch characteristics)
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr, threshold=0.1)
        pitch_values = []
        for t in range(pitches.shape[1]):
            index = magnitudes[:, t].argmax()
            pitch = pitches[index, t]
            if pitch > 0:
                pitch_values.append(pitch)

        if pitch_values:
            avg_pitch = np.mean(pitch_values)
            pitch_range = np.max(pitch_values) - np.min(pitch_values)
            pitch_variation = np.std(pitch_values)
        else:
            avg_pitch = pitch_range = pitch_variation = 0

        # Pause Analysis
        silence_threshold = np.mean(energy) * 0.2
        silent_frames = energy < silence_threshold
        pause_duration = np.sum(silent_frames) * hop_length / sr
        pause_ratio = pause_duration / duration if duration > 0 else 0

        # Calculate derived scores (0-100 scale)
        pace_score = min(100, max(0, (words_per_minute / 150) * 100))  # Optimal around 150 WPM
        confidence_score = min(100, volume_consistency * 100)

        # Tone score based on pitch variation (moderate variation is good)
        optimal_variation = 50  # Hz
        tone_score = max(0, 100 - abs(pitch_variation - optimal_variation) * 2)

        return {
            "duration": round(duration, 2),
            "words_per_minute": round(words_per_minute, 1),
            "pace_score": round(pace_score, 1),
            "confidence_score": round(confidence_score, 1),
            "tone_score": round(tone_score, 1),
            "average_pitch": round(avg_pitch, 2),
            "pitch_range": round(pitch_range, 2),
            "pitch_variation": round(pitch_variation, 2),
            "pause_ratio": round(pause_ratio * 100, 1),  # As percentage
            "volume_consistency": round(volume_consistency, 3),
            "analysis_summary": generate_analysis_summary(pace_score, confidence_score, tone_score, pause_ratio)
        }

    except Exception as e:
        print(f"Librosa audio analysis error: {e}, falling back to simple analysis")
        return analyze_audio_simple(audio_path, transcript)

def generate_analysis_summary(pace_score: float, confidence_score: float, tone_score: float, pause_ratio: float) -> str:
    """Generate human-readable analysis summary"""
    summary_parts = []

    # Pace feedback
    if pace_score > 80:
        summary_parts.append("Great speaking pace")
    elif pace_score > 60:
        summary_parts.append("Good speaking pace")
    elif pace_score > 40:
        summary_parts.append("Consider adjusting your speaking speed")
    else:
        summary_parts.append("Speaking pace needs improvement")

    # Confidence feedback
    if confidence_score > 80:
        summary_parts.append("confident delivery")
    elif confidence_score > 60:
        summary_parts.append("fairly confident")
    else:
        summary_parts.append("work on speaking with more confidence")

    # Pause feedback
    if pause_ratio > 0.3:
        summary_parts.append("reduce excessive pauses")
    elif pause_ratio < 0.05:
        summary_parts.append("add strategic pauses for clarity")

    return ", ".join(summary_parts) + "."

# Test function
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python audio_analyzer.py <path-to-audio-file>")
        sys.exit(1)

    audio_path = sys.argv[1]
    if os.path.exists(audio_path):
        results = analyze_audio_metrics(audio_path)
        print("Audio Analysis Results:")
        for key, value in results.items():
            print(f"  {key}: {value}")
    else:
        print(f"File not found: {audio_path}")