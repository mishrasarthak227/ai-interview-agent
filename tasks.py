# tasks.py
from crewai import Task
from typing import List, Dict, Any
from adaptive_interviewer import calculate_performance_score, create_adaptive_interviewer, get_adaptive_question_context, identify_focus_areas

def create_question_task(job_title: str, interviewer, question_number: int, interview_history: List) -> Task:
    """Creates a task for generating adaptive interview questions"""
    context = "\n".join([
        f"Q{i+1}: {interaction['question']}\nA{i+1}: {interaction['answer']}"
        for i, interaction in enumerate(interview_history)
    ]) if interview_history else "No previous responses"

    # For adaptive questioning after first question
    adaptive_context = ""
    if len(interview_history) > 0:
        performance_scores = calculate_performance_score(interview_history)
        focus_areas = identify_focus_areas(performance_scores, job_title)
        adaptive_context = f"\n\nPerformance Analysis:\n{get_adaptive_question_context(performance_scores, focus_areas)}"

    base_instruction = f"""You are conducting interview question #{question_number} for the {job_title} position.

        Previous conversation context:
        {context}{adaptive_context}"""

    if question_number == 1:
        instruction = base_instruction + """

        This is the first question. Ask about their motivation, background, and interest in this specific role.
        Generate a single clear, focused question that helps evaluate the candidate.
        Return ONLY the question text, nothing else."""
    else:
        instruction = base_instruction + """

        Based on the performance analysis above, adapt your questioning approach:
        - If they're performing well, challenge them with more complex scenarios
        - If they're struggling, ask supportive questions that build confidence
        - Focus on identified weak areas while maintaining interview flow

        Generate a single clear, focused question that helps evaluate the candidate.
        Return ONLY the question text, nothing else."""

    return Task(
        description=instruction,
        expected_output="A clear, relevant interview question adapted to candidate performance and needs.",
        agent=interviewer
    )

def create_answer_task(question: str, candidate) -> Task:
    """Creates a task for generating candidate responses"""
    return Task(
        description=f"""You are answering this interview question: '{question}'
        
        Provide a thoughtful, honest response that:
        - Demonstrates your enthusiasm and potential
        - Draws from your academic experiences when relevant
        - Shows your willingness to learn and grow
        - Maintains professionalism while being authentic
        
        Return ONLY your response to the question, nothing else.""",
        expected_output="A professional, thoughtful response to the interview question.",
        agent=candidate
    )

def create_evaluation_task(job_title: str, interviewer, interview_history: List) -> Task:
    """Creates a task for evaluating the candidate"""
    context = "\n".join([
        f"Q{i+1}: {interaction['question']}\nA{i+1}: {interaction['answer']}"
        for i, interaction in enumerate(interview_history)
    ])
    
    return Task(
        description=f"""Based on the full interview conversation:
        
        {context}
        
        Provide a comprehensive evaluation of the candidate for the {job_title} position.
        Include:
        1. Overall Decision (PASS/FAIL)
        2. Score (0-100)
        3. Key Strengths Demonstrated
        4. Areas for Improvement
        5. Specific Tips for Future Interviews
        6. Detailed Reasoning for the Decision
        
        Format the response clearly with headers and bullet points.""",
        expected_output="A detailed evaluation report including pass/fail decision, score, strengths, areas for improvement, and specific recommendations.",
        agent=interviewer
    )

def create_comparative_analysis_task(job_title: str, interviewer, interview_results: dict, models: dict) -> Task:
    """Creates a task for comparative analysis of all candidates"""
    return Task(
        description=f"""Based on the interviews conducted with candidates for the {job_title} position using different LLM models, provide a comparative analysis:
        
        {'\n\n'.join([f"Candidate {i+1} (Model: {models[f'candidate{i+1}']}): \n{results['evaluation']}" 
                      for i, (_, results) in enumerate(interview_results.items())])}

        Please provide:
        1. Comparative scoring and ranking
        2. Notable differences in response patterns
        3. Strengths and weaknesses of each model's responses
        4. Overall recommendations for model selection for interview simulations
        
        Format the response clearly with headers and bullet points.""",
        expected_output="A detailed comparative analysis of the LLM models' performance in the interview simulation.",
        agent=interviewer
    )
