# adaptive_interviewer.py
"""
Adaptive questioning system that adjusts difficulty and focus based on candidate performance.
"""

from typing import List, Dict, Any, Optional
from crewai import Agent
from agents import create_interviewer

def calculate_performance_score(history: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Calculate overall performance metrics from interview history.
    Returns scores for different aspects (content, communication, technical, etc.)
    """
    if not history:
        return {"overall": 0, "communication": 0, "technical": 0, "confidence": 0}

    total_answers = len(history)

    # Audio metrics aggregation
    audio_scores = []
    pace_scores = []
    confidence_scores = []
    tone_scores = []

    # Content analysis (basic length and completeness heuristics)
    content_scores = []

    for entry in history:
        audio_metrics = entry.get("audio_metrics", {})
        answer = entry.get("answer", "")

        # Audio analysis
        if audio_metrics and not audio_metrics.get("error"):
            pace_scores.append(audio_metrics.get("pace_score", 0))
            confidence_scores.append(audio_metrics.get("confidence_score", 0))
            tone_scores.append(audio_metrics.get("tone_score", 0))

        # Content analysis (simple heuristics)
        answer_length = len(answer.split()) if answer else 0
        if answer_length > 50:  # Detailed answer
            content_scores.append(85)
        elif answer_length > 20:  # Moderate answer
            content_scores.append(70)
        elif answer_length > 5:  # Brief answer
            content_scores.append(50)
        else:  # Very brief/no answer
            content_scores.append(20)

    # Calculate averages
    avg_pace = sum(pace_scores) / len(pace_scores) if pace_scores else 50
    avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 50
    avg_tone = sum(tone_scores) / len(tone_scores) if tone_scores else 50
    avg_content = sum(content_scores) / len(content_scores) if content_scores else 50

    # Communication score (audio + some content factors)
    communication_score = (avg_pace + avg_confidence + avg_tone) / 3

    # Technical score (primarily content-based for now)
    technical_score = avg_content

    # Overall score
    overall_score = (communication_score * 0.4 + technical_score * 0.6)

    return {
        "overall": round(overall_score, 1),
        "communication": round(communication_score, 1),
        "technical": round(technical_score, 1),
        "confidence": round(avg_confidence, 1),
        "pace": round(avg_pace, 1),
        "tone": round(avg_tone, 1)
    }

def determine_difficulty_adjustment(performance_scores: Dict[str, float], current_question_num: int) -> str:
    """
    Determine if questions should be easier, harder, or same difficulty based on performance.
    """
    overall = performance_scores.get("overall", 50)
    communication = performance_scores.get("communication", 50)

    # Early questions (1-2): Keep moderate difficulty
    if current_question_num <= 2:
        return "moderate"

    # Adjust based on performance
    if overall > 80:
        return "harder"  # Doing very well, increase challenge
    elif overall > 60:
        return "moderate"  # Doing well, maintain level
    elif overall > 40:
        return "easier"  # Struggling a bit, reduce difficulty
    else:
        return "supportive"  # Having difficulty, be encouraging

def identify_focus_areas(performance_scores: Dict[str, float], job_title: str) -> List[str]:
    """
    Identify areas to focus on based on performance gaps.
    """
    focus_areas = []

    # Communication issues
    if performance_scores.get("communication", 50) < 60:
        focus_areas.append("communication_skills")

    if performance_scores.get("confidence", 50) < 50:
        focus_areas.append("confidence_building")

    if performance_scores.get("pace", 50) < 40:
        focus_areas.append("pacing")

    # Technical areas based on job type
    if "engineer" in job_title.lower() or "developer" in job_title.lower():
        if performance_scores.get("technical", 50) < 60:
            focus_areas.append("technical_depth")

    if "manager" in job_title.lower():
        focus_areas.append("leadership")

    return focus_areas

def create_adaptive_interviewer(job_title: str, performance_scores: Dict[str, float],
                              question_number: int, focus_areas: List[str]) -> Agent:
    """
    Create an interviewer agent adapted to the candidate's performance and needs.
    """

    difficulty = determine_difficulty_adjustment(performance_scores, question_number)

    # Build adaptive backstory based on performance
    backstory_parts = [f"You are interviewing for {job_title}."]

    if difficulty == "harder":
        backstory_parts.append("The candidate is performing excellently. Challenge them with more complex scenarios and deeper technical questions.")
    elif difficulty == "easier":
        backstory_parts.append("The candidate is struggling. Ask more straightforward questions and provide gentle guidance.")
    elif difficulty == "supportive":
        backstory_parts.append("The candidate needs encouragement. Ask confidence-building questions and be supportive.")
    else:
        backstory_parts.append("The candidate is performing well. Continue with balanced questions.")

    # Add focus area guidance
    if "communication_skills" in focus_areas:
        backstory_parts.append("Focus on questions that help them practice clear communication.")

    if "confidence_building" in focus_areas:
        backstory_parts.append("Ask questions that allow them to showcase their strengths.")

    if "technical_depth" in focus_areas:
        backstory_parts.append("Include more technical scenarios and problem-solving questions.")

    if "leadership" in focus_areas:
        backstory_parts.append("Focus on leadership scenarios and people management questions.")

    backstory = " ".join(backstory_parts)

    return Agent(
        role="Adaptive Interviewer",
        goal=f"Conduct an adaptive interview for {job_title}, adjusting to candidate performance",
        backstory=backstory,
        verbose=False,
        allow_delegation=False,
        llm="gpt-4"
    )

def get_adaptive_question_context(performance_scores: Dict[str, float], focus_areas: List[str]) -> str:
    """
    Generate context string for adaptive questioning prompts.
    """
    context_parts = []

    overall_score = performance_scores.get("overall", 50)

    if overall_score > 75:
        context_parts.append("The candidate is performing very well.")
    elif overall_score > 50:
        context_parts.append("The candidate is performing adequately.")
    else:
        context_parts.append("The candidate needs more support.")

    # Communication feedback
    comm_score = performance_scores.get("communication", 50)
    if comm_score < 50:
        context_parts.append("Their communication could be clearer.")
    elif comm_score > 80:
        context_parts.append("They communicate very effectively.")

    # Focus areas
    if focus_areas:
        context_parts.append(f"Focus on: {', '.join(focus_areas)}.")

    return " ".join(context_parts)