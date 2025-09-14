# api.py
"""
Main FastAPI backend for interview app.
Endpoints:
 - POST /generate_question
 - POST /upload_audio
 - POST /evaluate          (now accepts optional "model" to choose evaluator model)
 - POST /comparative_analysis
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os, uuid, shutil, subprocess, json
from datetime import datetime
from typing import List, Dict, Any, Optional

from transcriber import transcribe_file
from audio_analyzer import analyze_audio_metrics

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
FFMPEG_BIN = shutil.which("ffmpeg")

# for quick debugging: set True to return a test transcript
FORCE_TEST_TRANSCRIPT = False

app = FastAPI(title="Interview API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def ensure_wav(input_path: str) -> str:
    if input_path.lower().endswith(".wav") or FFMPEG_BIN is None:
        return input_path
    out_name = f"conv_{os.path.splitext(os.path.basename(input_path))[0]}.wav"
    out_path = os.path.join(UPLOAD_DIR, out_name)
    cmd = [FFMPEG_BIN, "-y", "-i", input_path, "-ar", "16000", "-ac", "1", out_path]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return out_path
    except Exception as e:
        print("ffmpeg conversion failed:", e)
        return input_path

def save_sidecar_json(audio_path: str, transcript: str, extra: Dict[str, Any] = None) -> str:
    meta = {
        "audio_path": audio_path,
        "transcript": transcript,
        "timestamp": datetime.utcnow().isoformat()
    }
    if extra:
        meta.update(extra)
    json_path = os.path.splitext(audio_path)[0] + ".json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    return json_path

class QuestionRequest(BaseModel):
    job_title: str
    question_num: int
    history: List[Dict[str, Any]] = []

class EvalRequest(BaseModel):
    job_title: str
    history: List[Dict[str, Any]]
    model: Optional[str] = None  # optional model string to run the evaluation on

class ComparativeRequest(BaseModel):
    job_title: str
    history: List[Dict[str, Any]] = []
    other_model: str

@app.post("/generate_question")
def generate_question(req: QuestionRequest):
    try:
        from crewai import Crew, Process
        from agents import create_interviewer
        from tasks import create_question_task

        interviewer = create_interviewer(req.job_title)
        task = create_question_task(req.job_title, interviewer, req.question_num, req.history)
        crew = Crew(agents=[interviewer], tasks=[task], process=Process.sequential, verbose=False)
        q = str(crew.kickoff())
        return {"question": q}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload_audio")
async def upload_audio(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        ext = os.path.splitext(file.filename)[1] or ".wav"
        fname = f"{uuid.uuid4().hex}{ext}"
        saved_path = os.path.join(UPLOAD_DIR, fname)
        with open(saved_path, "wb") as f:
            f.write(contents)

        path_for_trans = ensure_wav(saved_path)

        if FORCE_TEST_TRANSCRIPT:
            transcript = "THIS IS A TEST TRANSCRIPT (FOR DEBUGGING)"
        else:
            transcript = transcribe_file(path_for_trans)

        # Analyze audio metrics (pass transcript for better analysis)
        audio_metrics = analyze_audio_metrics(path_for_trans, transcript)

        save_sidecar_json(saved_path, transcript, extra={
            "converted_path": path_for_trans if path_for_trans != saved_path else None,
            "audio_metrics": audio_metrics
        })

        print(f"Uploaded: {saved_path}  transcript_len={len(transcript)}")
        return {
            "saved_path": saved_path,
            "transcript": transcript,
            "audio_metrics": audio_metrics,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/evaluate")
def evaluate(req: EvalRequest):
    """
    Evaluate interview history. If req.model is provided, build a temporary evaluator Agent
    that uses that model string. Otherwise use the default interviewer (create_interviewer).
    Returns: {"evaluation": "<text>"}
    """
    try:
        from crewai import Crew, Process, Agent
        from agents import create_interviewer
        from tasks import create_evaluation_task

        if req.model:
            # Build a temporary evaluator agent with the provided model string
            evaluator = Agent(
                role="Evaluator",
                goal=f"Evaluate answers for job: {req.job_title}",
                backstory="You are an expert hiring evaluator. Provide concise, clear evaluation and scoring.",
                verbose=False,
                allow_delegation=False,
                llm=req.model
            )
            task = create_evaluation_task(req.job_title, evaluator, req.history)
            crew = Crew(agents=[evaluator], tasks=[task], process=Process.sequential, verbose=False)
            evaluation = str(crew.kickoff())
        else:
            interviewer = create_interviewer(req.job_title)
            task = create_evaluation_task(req.job_title, interviewer, req.history)
            crew = Crew(agents=[interviewer], tasks=[task], process=Process.sequential, verbose=False)
            evaluation = str(crew.kickoff())

        return {"evaluation": evaluation}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/comparative_analysis")
def comparative_analysis(req: ComparativeRequest):
    try:
        from crewai import Crew, Process
        from agents import create_interviewer
        from tasks import create_comparative_analysis_task

        interviewer = create_interviewer(req.job_title)
        comp_task = create_comparative_analysis_task(req.job_title, interviewer,
                            {"human": {"interview_history": req.history}}, {"human": req.other_model})
        comp_crew = Crew(agents=[create_interviewer(req.job_title)], tasks=[comp_task], process=Process.sequential, verbose=False)
        comparative_analysis = str(comp_crew.kickoff())
        return {"comparative_analysis": comparative_analysis}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
