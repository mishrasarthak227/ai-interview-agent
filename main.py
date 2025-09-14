# main.py
from interview_simulation import InterviewSimulation

def main():
    job_titles = [
        "Marketing Associate",
        "Business Development Representative",
        "Product Manager",
        "Customer Success Representative",
        "Data Analyst",
        "Content Creator",
        "AI Engineer"
    ]
    
    job_title = job_titles[5]  # Pick job role
    
    # human_mode is now read from .env file
    simulation = InterviewSimulation(job_title)
    
    simulation.conduct_interviews(num_questions=3)

if __name__ == "__main__":
    main()
