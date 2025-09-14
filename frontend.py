# frontend.py
import streamlit as st
import streamlit.components.v1 as components
from datetime import datetime
import json, os, uuid, time, traceback
import base64

# audio libs
import numpy as np
import soundfile as sf

# webrtc
from streamlit_webrtc import webrtc_streamer, WebRtcMode

# whisper
import whisper

# CrewAI
from crewai import Crew, Process
from agents import create_interviewer, create_candidate
from tasks import (
    create_question_task, create_answer_task, create_evaluation_task, create_comparative_analysis_task
)

# ---------------- CONFIG ----------------
JOB_TITLE = "Content Creator"
NUM_QUESTIONS = 5
WHISPER_MODEL_NAME = "tiny"   # change to small/base if desired
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ---------------- Session state ----------------
if "started" not in st.session_state:
    st.session_state.started = False
if "question_index" not in st.session_state:
    st.session_state.question_index = 0
if "interview_history" not in st.session_state:
    st.session_state.interview_history = []
if "current_question" not in st.session_state:
    st.session_state.current_question = ""
if "evaluation" not in st.session_state:
    st.session_state.evaluation = None
if "finished" not in st.session_state:
    st.session_state.finished = False
if "last_error" not in st.session_state:
    st.session_state.last_error = None
if "whisper_model" not in st.session_state:
    st.session_state.whisper_model = None
if "webrtc_fallback_mode" not in st.session_state:
    st.session_state.webrtc_fallback_mode = False  # user chooses fallback

st.set_page_config(page_title="AI Interview — Recorder (webrtc+fallback)", layout="centered")
st.title("🎙️ AI Interview Simulator — Recorder (webrtc + fallback)")

# Sidebar debug
import sys, importlib.util
st.sidebar.markdown("**Debug**")
st.sidebar.write("PYTHON:", sys.executable)
st.sidebar.write("streamlit-webrtc installed:", importlib.util.find_spec("streamlit_webrtc") is not None)
st.sidebar.write("whisper loaded:", st.session_state.whisper_model is not None)

# ---------------- Helper: Mic permission component ----------------
def request_mic_permission_component():
    html = """
    <div id="mic-status-container" style="font-family: sans-serif;">
      <button id="requestMicBtn" style="padding:8px 14px;border-radius:6px;border:1px solid #666;background:#111;color:#fff;">
        Request Microphone Access
      </button>
      <div id="status" style="margin-top:10px;color:#ddd;"></div>
      <script>
        const btn = document.getElementById('requestMicBtn');
        const status = document.getElementById('status');
        async function askMic() {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            status.innerText = 'Error: getUserMedia not supported in this browser.';
            status.style.color = '#FF6B6B';
            return;
          }
          status.innerText = 'Requesting microphone permission…';
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(t => t.stop());
            status.style.color = '#7CFC00';
            status.innerText = 'Microphone permission GRANTED. Now click Start Recording to record.';
          } catch (err) {
            console.error(err);
            status.style.color = '#FF6B6B';
            if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
              status.innerText = 'Microphone permission DENIED. Please allow access in your browser and try again.';
            } else {
              status.innerText = 'Failed to get microphone: ' + (err.message || err.name);
            }
          }
        }
        btn.addEventListener('click', askMic);
      </script>
    </div>
    """
    components.html(html, height=140, scrolling=False)

# ---------------- Crew helpers ----------------
def generate_question(job_title, question_num, history):
    interviewer = create_interviewer(job_title)
    task = create_question_task(job_title, interviewer, question_num, history)
    crew = Crew(agents=[interviewer], tasks=[task], process=Process.sequential, verbose=False)
    return str(crew.kickoff())

def evaluate_interview(job_title, history):
    interviewer = create_interviewer(job_title)
    task = create_evaluation_task(job_title, interviewer, history)
    crew = Crew(agents=[interviewer], tasks=[task], process=Process.sequential, verbose=False)
    return str(crew.kickoff())

# ---------------- Whisper loader ----------------
def load_whisper_model(name=WHISPER_MODEL_NAME):
    if st.session_state.whisper_model is None:
        with st.spinner(f"Loading Whisper model '{name}' (first load may take a minute)..."):
            st.session_state.whisper_model = whisper.load_model(name)
    return st.session_state.whisper_model

# ---------------- Audio collector ----------------
if "webrtc_collector" not in st.session_state:
    st.session_state.webrtc_collector = None
if "webrtc_ctx" not in st.session_state:
    st.session_state.webrtc_ctx = None
if "is_recording" not in st.session_state:
    st.session_state.is_recording = False

class AudioCollector:
    def __init__(self):
        self.chunks = []
        self.sample_rate = None
    def add_frame(self, frame):
        try:
            arr = frame.to_ndarray()
        except Exception:
            return
        if arr.ndim == 2:
            arr = arr.T
        else:
            arr = arr.flatten()
        self.chunks.append(arr)
        if self.sample_rate is None:
            self.sample_rate = frame.sample_rate

def save_chunks_to_wav(chunks, out_path, sample_rate=48000):
    if not chunks:
        raise RuntimeError("No audio captured")
    audio = np.concatenate(chunks, axis=0)
    sf.write(out_path, audio, sample_rate)

# ---------------- Helper: save uploaded file and transcribe ----------------
def save_uploaded_file_and_transcribe(uploaded_file):
    # uploaded_file: Streamlit UploadedFile
    uid = str(uuid.uuid4())[:8]
    ext = os.path.splitext(uploaded_file.name)[1].lower()
    out_path = os.path.join(UPLOAD_DIR, f"{uid}{ext}")
    with open(out_path, "wb") as f:
        f.write(uploaded_file.getbuffer())
    # If it's webm, Whisper can often read it. Optionally convert.
    model = load_whisper_model()
    with st.spinner("Transcribing uploaded audio..."):
        result = model.transcribe(out_path)
        transcript = result.get("text", "").strip()
    return out_path, transcript

# ---------------- Layout / Controls ----------------
col_left, col_right = st.columns([1,2])
with col_left:
    if not st.session_state.started:
        if st.button("Start Interview"):
            st.session_state.started = True
            st.session_state.question_index = 0
            st.session_state.interview_history = []
            st.session_state.current_question = ""
            st.session_state.evaluation = None
            st.session_state.finished = False
            st.session_state.last_error = None
            st.rerun()
    else:
        if st.button("Restart Interview"):
            st.session_state.started = False
            st.rerun()
with col_right:
    st.write(f"**Role:** Co-founder and CEO — interviewing for **{JOB_TITLE}**")
    st.write("**Input options:** Request Mic → try webrtc recording (fast). If that doesn't work, use the JS fallback recorder and then upload the file.")

st.markdown("---")

# ---------------- Main interview loop ----------------
if st.session_state.started and not st.session_state.finished:
    idx = st.session_state.question_index

    # generate question if needed
    if idx < NUM_QUESTIONS and st.session_state.current_question == "":
        try:
            with st.spinner("Generating question..."):
                q = generate_question(JOB_TITLE, idx + 1, st.session_state.interview_history)
            st.session_state.current_question = q
        except Exception:
            st.session_state.last_error = traceback.format_exc()
            st.error("Error while generating question.")
            st.code(st.session_state.last_error)
            st.session_state.finished = True

    if not st.session_state.finished and idx < NUM_QUESTIONS:
        st.markdown(f"**Co-founder: Q{idx+1}**")
        st.info(st.session_state.current_question)

        st.markdown("**Record your answer**")
        request_mic_permission_component()

        # toggle mode: allow user to force fallback for reliability
        colA, colB = st.columns([1,1])
        with colA:
            if st.button("Use JS Recorder Fallback"):
                st.session_state.webrtc_fallback_mode = True
                st.rerun()
        with colB:
            if st.button("Try WebRTC Recorder"):
                st.session_state.webrtc_fallback_mode = False
                st.rerun()

        st.write("Current recorder:", "JS fallback" if st.session_state.webrtc_fallback_mode else "webrtc (preferred)")

        # ---------------- Primary: webrtc recorder (SENDONLY) ----------------
        if not st.session_state.webrtc_fallback_mode:
            chunk_count = len(st.session_state.webrtc_collector.chunks) if st.session_state.webrtc_collector else 0
            st.write(f"Live captured chunks: {chunk_count}")

            if st.button("Start Recording (webrtc)"):
                st.session_state.webrtc_collector = AudioCollector()
                # TRY SENDONLY for better capture on some networks
                ctx = webrtc_streamer(
                    key=f"webrtc-{uuid.uuid4()}",
                    mode=WebRtcMode.SENDONLY,
                    media_stream_constraints={"audio": True, "video": False},
                    audio_frame_callback=lambda frame: st.session_state.webrtc_collector.add_frame(frame),
                    async_processing=True,
                )
                st.session_state.webrtc_ctx = ctx
                st.session_state.is_recording = True
                st.write("webrtc_ctx repr:", repr(ctx))
                try:
                    st.write("webrtc_ctx.state:", ctx.state)
                except Exception:
                    pass
                st.info("Recording started. Speak now and click Stop & Submit when done.")
                st.rerun()

            if st.button("Stop & Submit Recording (webrtc)"):
                if st.session_state.webrtc_collector is None:
                    st.warning("No active recording. Click Start Recording first.")
                else:
                    try:
                        if st.session_state.webrtc_ctx:
                            st.session_state.webrtc_ctx.stop()
                    except Exception:
                        pass
                    collector = st.session_state.webrtc_collector
                    captured = len(collector.chunks)
                    st.write(f"Captured chunks: {captured}")
                    if captured == 0:
                        st.error("No audio frames were captured. Try the JS fallback.")
                        # keep collector for debugging
                    else:
                        uid = str(uuid.uuid4())[:8]
                        out_wav = os.path.join(UPLOAD_DIR, f"{uid}_rec.wav")
                        sample_rate = collector.sample_rate or 48000
                        time.sleep(0.4)
                        try:
                            with st.spinner("Saving recording..."):
                                save_chunks_to_wav(collector.chunks, out_wav, sample_rate)
                            model = load_whisper_model()
                            with st.spinner("Transcribing audio..."):
                                result = model.transcribe(out_wav)
                                transcript = result.get("text", "").strip()
                            if not transcript:
                                st.warning("Transcription empty. Try recording again or use JS fallback.")
                            else:
                                st.success("Transcription complete")
                                st.markdown("**Transcript:**")
                                st.write(transcript)
                            st.session_state.interview_history.append({
                                "question": st.session_state.current_question,
                                "answer": transcript if transcript else f"[audio saved: {out_wav}]",
                                "answered_by": "human_recording",
                                "audio_path": out_wav,
                                "timestamp": datetime.now().isoformat()
                            })
                            st.session_state.webrtc_collector = None
                            st.session_state.webrtc_ctx = None
                            st.session_state.current_question = ""
                            st.session_state.question_index += 1
                            st.rerun()
                        except Exception:
                            st.error("Error saving/transcribing webrtc audio.")
                            st.session_state.last_error = traceback.format_exc()
                            st.code(st.session_state.last_error)

        # ---------------- Fallback: JS recorder (download then upload) ----------------
        else:
            st.markdown("**JS Recorder Fallback** — click Record, stop, then download the audio file and upload it using the uploader below.")
            # small JS recorder: records audio (webm) and provides downloadable link
            js_recorder_html = """
            <script>
            let mediaRecorder;
            let chunks = [];
            async function startJSRec() {
              try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                chunks = [];
                mediaRecorder.ondataavailable = e => chunks.push(e.data);
                mediaRecorder.start();
                document.getElementById('jsstatus').innerText = 'Recording...';
              } catch (err) {
                document.getElementById('jsstatus').innerText = 'Microphone error: ' + err.message;
              }
            }
            async function stopJSRec() {
              if (!mediaRecorder) {
                document.getElementById('jsstatus').innerText = 'No recording in progress';
                return;
              }
              mediaRecorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'recording.webm';
                a.innerText = 'Download recording (click and then upload below)';
                const container = document.getElementById('jslinks');
                container.innerHTML = '';
                container.appendChild(a);
                // create small player
                const player = document.createElement('audio');
                player.controls = true;
                player.src = url;
                container.appendChild(player);
                document.getElementById('jsstatus').innerText = 'Recording stopped. Download and then upload using the uploader below.';
              };
              mediaRecorder.stop();
            }
            </script>
            <div>
              <button onclick="startJSRec()">Start JS Recording</button>
              <button onclick="stopJSRec()">Stop & Prepare Download</button>
              <div id="jsstatus" style="margin-top:8px;color:#ddd;">Idle</div>
              <div id="jslinks" style="margin-top:8px;"></div>
            </div>
            """
            components.html(js_recorder_html, height=220, scrolling=False)

            st.markdown("**Upload the recorded file (downloaded above)**")
            uploaded = st.file_uploader("Upload recorded audio (webm/mp3/wav)", type=["webm", "wav", "mp3", "m4a"])
            if uploaded is not None:
                try:
                    out_path, transcript = save_uploaded_file_and_transcribe(uploaded)
                    st.success("Transcription complete")
                    st.markdown("**Transcript:**")
                    st.write(transcript)
                    st.session_state.interview_history.append({
                        "question": st.session_state.current_question,
                        "answer": transcript if transcript else f"[audio saved: {out_path}]",
                        "answered_by": "human_upload",
                        "audio_path": out_path,
                        "timestamp": datetime.now().isoformat()
                    })
                    st.session_state.current_question = ""
                    st.session_state.question_index += 1
                    st.rerun()
                except Exception:
                    st.error("Error saving/transcribing uploaded file.")
                    st.session_state.last_error = traceback.format_exc()
                    st.code(st.session_state.last_error)

    # after questions -> evaluation
    if not st.session_state.finished and st.session_state.question_index >= NUM_QUESTIONS:
        st.success("All questions answered. Generating evaluation...")
        try:
            with st.spinner("Generating evaluation..."):
                st.session_state.evaluation = evaluate_interview(JOB_TITLE, st.session_state.interview_history)
        except Exception:
            st.session_state.last_error = traceback.format_exc()
            st.error("Evaluation failed.")
            st.code(st.session_state.last_error)
            st.session_state.finished = True

        st.session_state.finished = True
        st.rerun()

# ---------------- Finished: show results ----------------
if st.session_state.finished:
    st.markdown("### ✅ Evaluation")
    if st.session_state.evaluation:
        st.write(st.session_state.evaluation)
    else:
        st.write("_No evaluation available._")
    payload = {
        "job_title": JOB_TITLE,
        "interview_history": st.session_state.interview_history,
        "evaluation": st.session_state.evaluation,
        "timestamp": datetime.now().isoformat()
    }
    filename = f"interview_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    st.download_button("Download full results (JSON)", json.dumps(payload, indent=2), file_name=filename)

# Transcript area
st.markdown("---")
st.markdown("### Interview Transcript")
if st.session_state.interview_history:
    for i, turn in enumerate(st.session_state.interview_history, start=1):
        st.markdown(f"**Q{i}.** {turn['question']}")
        st.write(f"**Answer ({turn.get('answered_by','unknown')}):** {turn['answer']}")
else:
    st.write("_No answers yet._")

# Debug last error
if st.session_state.last_error:
    st.markdown("---")
    st.error("Last error (debug):")
    st.code(st.session_state.last_error)

st.markdown("---")
st.write("Notes: Use the Request Microphone Access button first. If webrtc fails, click 'Use JS Recorder Fallback' and use the JS recorder to download and then upload the file. Whisper 'tiny' is fast. If av/streamlit-webrtc fails to install, paste the install error and I'll help.")
