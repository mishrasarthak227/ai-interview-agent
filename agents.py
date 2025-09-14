# agents.py
"""
Agent factory helpers for the interview app.

Contains:
- create_interviewer(job_title): returns an interviewer Agent
- create_candidate(name): optional helper if you need candidate agents elsewhere

If your local Agent class uses `model=` instead of `llm=`, change the LLM kwarg in the Agent(...) calls below.
"""

from typing import Optional
try:
    from crewai import Agent
except Exception:
    # Fallback: define a very small shim so other modules can import this file
    class Agent:
        def __init__(self, role="", goal="", backstory="", verbose=False, allow_delegation=True, llm=None, **kwargs):
            self.role = role
            self.goal = goal
            self.backstory = backstory
            self.verbose = verbose
            self.allow_delegation = allow_delegation
            self.llm = llm

        def __repr__(self):
            return f"<Agent role={self.role!r} llm={self.llm!r}>"

# Default model string used for interviewer (using OpenAI)
DEFAULT_INTERVIEWER_MODEL = "gpt-4"

def create_interviewer(job_title: str, model: Optional[str] = None) -> Agent:
    """
    Create and return the interviewer Agent for a given job_title.
    If `model` is provided, it overrides the default model.
    """
    chosen_model = model or DEFAULT_INTERVIEWER_MODEL

    # If your Agent class uses 'model=' instead of 'llm=', change llm=chosen_model to model=chosen_model.
    interviewer = Agent(
        role="Interviewer",
        goal=f"Conduct an interview for the role: {job_title}. Ask good questions and evaluate responses.",
        backstory=f"You are interviewing candidates for the job: {job_title}. Ask clear and relevant interview questions and evaluate answers.",
        verbose=False,
        allow_delegation=False,
        llm=chosen_model  # <-- change to model=chosen_model if required by your Agent class
    )
    return interviewer

def create_candidate(name: str, model: Optional[str] = None) -> Agent:
    """
    Optional helper to create candidate agents if your tasks require them.
    """
    chosen_model = model or "gpt-3.5-turbo"
    candidate = Agent(
        role=f"Candidate ({name})",
        goal="Respond to interview questions as the named candidate would.",
        backstory=f"You are {name}. Answer questions honestly and concisely.",
        verbose=False,
        allow_delegation=False,
        llm=chosen_model
    )
    return candidate
