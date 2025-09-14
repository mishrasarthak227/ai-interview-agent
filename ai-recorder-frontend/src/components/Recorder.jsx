// src/components/Recorder.jsx
import React, { useRef, useState } from "react";

export default function Recorder({ uploadUrl = "http://localhost:8000/upload_audio", onUploaded = () => {} }) {
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [audioUrl, setAudioUrl] = useState(null);
  const [blobInfo, setBlobInfo] = useState(null);
  const [serverRespText, setServerRespText] = useState(null);

  const startRecording = async () => {
    setStatus("Requesting microphone...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstart = () => {
        setRecording(true);
        setStatus("Recording...");
      };
      mr.start();
      mediaRecorderRef.current = mr;
    } catch (err) {
      console.error(err);
      setStatus("Microphone error: " + (err.message || err));
    }
  };

  const stopRecording = () => {
    const ctx = mediaRecorderRef.current;
    if (!ctx) return;
    ctx.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setBlobInfo(blob);
      setStatus("Stopped — ready to play or upload");
      try { streamRef.current?.getTracks()?.forEach((t) => t.stop()); } catch (e) {}
      mediaRecorderRef.current = null;
      streamRef.current = null;
      setRecording(false);
    };
    ctx.stop();
  };

  const download = () => {
    if (!blobInfo) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `recording_${new Date().toISOString().replace(/[:.]/g, "-")}.wav`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const upload = async () => {
    if (!blobInfo) {
      setStatus("No recording to upload");
      return;
    }
    setStatus("Uploading...");
    setServerRespText(null);
    const form = new FormData();
    form.append("file", blobInfo, "recording.wav");
    try {
      const res = await fetch(uploadUrl, { method: "POST", body: form });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch (e) { json = null; }

      if (!res.ok) {
        setStatus(`Upload failed: ${res.status}`);
        setServerRespText(text);
        console.error("Upload failed:", res.status, text);
        return;
      }

      setStatus("Upload successful");
      setServerRespText(JSON.stringify(json ?? text, null, 2));
      try { onUploaded(json ?? { raw: text }); } catch (e) { console.warn(e); }
    } catch (err) {
      console.error(err);
      setStatus("Upload error: " + (err.message || err));
      setServerRespText(String(err));
    }
  };

  return (
    <div className="recorder-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700 }}>Recorder</div>
          <div className="status">Status: {status}</div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={startRecording} disabled={recording}>Start</button>
          <button className="btn secondary" onClick={stopRecording} disabled={!recording}>Stop</button>
          <button className="btn secondary" onClick={download} disabled={!blobInfo}>Download</button>
          <button className="btn" onClick={upload} disabled={!blobInfo}>Upload</button>
        </div>
      </div>

      <div className="audio-row">
        {audioUrl ? <audio controls src={audioUrl} /> : <div style={{ color: "var(--muted)" }}>No recording yet</div>}
      </div>

      {serverRespText && (
        <pre style={{ marginTop: 12, background: "#021018", color: "#9fdfb3", padding: 12, borderRadius: 8 }}>
          {serverRespText}
        </pre>
      )}
    </div>
  );
}
