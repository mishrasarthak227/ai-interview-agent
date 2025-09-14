import React, { useState, useRef } from 'react';

export const AudioRecorder = ({ uploadUrl, onAudioUploaded, disabled = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [status, setStatus] = useState('Ready to record');

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      setStatus('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setRecordingTime(0);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setStatus('Recording complete - ready to upload');

        // Cleanup stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus('Recording...');

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      setStatus('Microphone access denied or not available');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const uploadAudio = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    setStatus('Uploading and processing...');

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      setStatus('Upload successful!');

      // Reset recorder
      resetRecorder();

      // Notify parent component
      if (onAudioUploaded) {
        onAudioUploaded(result);
      }

    } catch (error) {
      console.error('Upload error:', error);
      setStatus('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetRecorder = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setStatus('Ready to record');

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRecordingIcon = () => {
    if (isRecording) {
      return (
        <div style={{
          width: '20px',
          height: '20px',
          background: 'var(--danger)',
          borderRadius: '50%',
          animation: 'pulse 1.5s infinite'
        }} />
      );
    }
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    );
  };

  return (
    <div className="card slide-in">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="card-title">Voice Response</h3>
            <p className="card-subtitle">{status}</p>
          </div>

          {isRecording && (
            <div className="badge badge-warning">
              {formatTime(recordingTime)}
            </div>
          )}
        </div>
      </div>

      <div className="card-content">
        <div className="flex items-center gap-3 mb-4">
          <button
            className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'} btn-lg`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled || isUploading}
          >
            {getRecordingIcon()}
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>

          {audioBlob && !isRecording && (
            <button
              className="btn btn-success btn-lg"
              onClick={uploadAudio}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <div className="spinner" />
                  Processing...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7,10 12,15 17,10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Submit Answer
                </>
              )}
            </button>
          )}

          {audioBlob && (
            <button
              className="btn btn-secondary"
              onClick={resetRecorder}
              disabled={isUploading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1,4 1,10 7,10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Reset
            </button>
          )}
        </div>

        {/* Audio Visualization */}
        <div style={{
          height: '60px',
          background: isRecording ? 'linear-gradient(45deg, #fee2e2, #fecaca)' : 'var(--surface)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: isRecording ? '2px solid var(--danger)' : '1px solid var(--border)',
          transition: 'all 0.3s ease'
        }}>
          {isRecording ? (
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: '4px',
                    background: 'var(--danger)',
                    borderRadius: '2px',
                    animation: `wave 1s ease-in-out infinite ${i * 0.1}s`
                  }}
                  className="recording-bar"
                />
              ))}
            </div>
          ) : audioUrl ? (
            <audio controls src={audioUrl} style={{ width: '100%' }} />
          ) : (
            <div className="text-muted text-sm">
              Audio will appear here after recording
            </div>
          )}
        </div>

        {disabled && (
          <div className="mt-3 text-center">
            <p className="text-sm text-muted">
              Generate a question first to start recording
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Add wave animation to CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes wave {
      0%, 100% { height: 10px; }
      50% { height: 30px; }
    }
    .recording-bar {
      height: 10px;
    }
  `;
  document.head.appendChild(style);
}