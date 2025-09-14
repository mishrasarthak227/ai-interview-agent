import React, { useState, useEffect } from 'react';
import './App.css';

const jobTitles = [
  "Software Development Engineer (SDE)",
  "Senior Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "DevOps Engineer",
  "AI Engineer",
  "Machine Learning Engineer",
  "Data Scientist",
  "Data Analyst",
  "Product Manager",
  "Engineering Manager",
  "Technical Lead"
];

function App() {
  const [jobTitle, setJobTitle] = useState("Software Development Engineer (SDE)");
  const [questionNum, setQuestionNum] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [history, setHistory] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [overallPerformance, setOverallPerformance] = useState(null);

  const API_BASE = "http://127.0.0.1:8000";

  // Calculate performance metrics
  useEffect(() => {
    if (history.length > 0) {
      const scores = calculatePerformanceScores(history);
      setOverallPerformance(scores);
    }
  }, [history]);

  const calculatePerformanceScores = (interviewHistory) => {
    if (!interviewHistory.length) return null;

    let totalPace = 0, totalConfidence = 0, totalTone = 0;
    let validMetrics = 0;

    interviewHistory.forEach(entry => {
      const metrics = entry.audio_metrics;
      if (metrics && !metrics.error) {
        totalPace += metrics.pace_score || 0;
        totalConfidence += metrics.confidence_score || 0;
        totalTone += metrics.tone_score || 0;
        validMetrics++;
      }
    });

    if (validMetrics === 0) return null;

    return {
      pace: Math.round(totalPace / validMetrics),
      confidence: Math.round(totalConfidence / validMetrics),
      tone: Math.round(totalTone / validMetrics),
      overall: Math.round((totalPace + totalConfidence + totalTone) / (validMetrics * 3))
    };
  };

  const fetchQuestion = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/generate_question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title: jobTitle,
          question_num: questionNum,
          history: history
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      setCurrentQuestion(data.question || "No question received");
    } catch (error) {
      console.error("Error fetching question:", error);
      setCurrentQuestion("Failed to load question. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioUploaded = (serverResponse) => {
    const transcript = serverResponse?.transcript || "";
    const audioMetrics = serverResponse?.audio_metrics || {};

    const newEntry = {
      question: currentQuestion || `Question ${questionNum}`,
      answer: transcript,
      audio_metrics: audioMetrics,
      timestamp: new Date().toISOString()
    };

    setHistory(prev => [...prev, newEntry]);
    setQuestionNum(prev => prev + 1);
    setCurrentQuestion("");

    // Auto-fetch next question after a brief delay
    setTimeout(() => {
      if (questionNum < 10) {
        fetchQuestion();
      }
    }, 1000);
  };

  const handleJobChange = (newJobTitle) => {
    setJobTitle(newJobTitle);
    resetInterview();
  };

  const resetInterview = () => {
    setQuestionNum(1);
    setCurrentQuestion("");
    setHistory([]);
    setEvaluation(null);
    setOverallPerformance(null);
  };

  const finishInterview = async () => {
    if (history.length === 0) {
      alert("Please answer at least one question before finishing.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title: jobTitle,
          history: history
        }),
      });

      if (!response.ok) {
        throw new Error(`Evaluation failed: ${response.status}`);
      }

      const data = await response.json();
      setEvaluation(data.evaluation || "No evaluation received");
    } catch (error) {
      console.error("Error getting evaluation:", error);
      setEvaluation("Failed to get evaluation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo">AI</div>
            <div>
              <h1 className="title">{jobTitle}</h1>
              <p className="subtitle">AI-Powered Interview Practice</p>
            </div>
          </div>

          <div className="header-right">
            {history.length > 0 && (
              <div className="badge">
                {history.length} Questions Answered
              </div>
            )}
            <select
              className="select"
              value={jobTitle}
              onChange={(e) => handleJobChange(e.target.value)}
            >
              {jobTitles.map((job) => (
                <option key={job} value={job}>
                  {job}
                </option>
              ))}
            </select>
          </div>
        </div>

        {history.length > 0 && (
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.min((history.length / 10) * 100, 100)}%` }}
              />
            </div>
            <span className="progress-text">{history.length} / 10 questions</span>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="main-content">
        <div className="left-panel">
          {/* Question Card */}
          <div className="card">
            <div className="card-header">
              <h2>Question {questionNum}</h2>
              <button
                className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
                onClick={fetchQuestion}
                disabled={isLoading}
              >
                {isLoading ? 'Generating...' : 'New Question'}
              </button>
            </div>
            <div className="card-content">
              <div className={`question-box ${currentQuestion ? 'has-question' : ''}`}>
                {isLoading ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <span>AI is preparing your next question...</span>
                  </div>
                ) : currentQuestion ? (
                  <div className="question-text">{currentQuestion}</div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">💭</div>
                    <p>Click "New Question" to start your interview</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Audio Recorder */}
          <AudioRecorder
            uploadUrl={`${API_BASE}/upload_audio`}
            onAudioUploaded={handleAudioUploaded}
            disabled={!currentQuestion || isLoading}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
          />

          {/* Performance Dashboard */}
          {overallPerformance && (
            <PerformanceDashboard performance={overallPerformance} />
          )}
        </div>

        <div className="right-panel">
          {/* Interview History */}
          <div className="card">
            <div className="card-header">
              <h3>Interview History</h3>
              <p className="card-subtitle">
                {history.length === 0 ? 'No questions answered yet' : `${history.length} questions answered`}
              </p>
            </div>
            <div className="card-content">
              <div className="history-container">
                {history.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <p>Your questions and answers will appear here</p>
                  </div>
                ) : (
                  <div className="history-list">
                    {history.map((entry, index) => (
                      <div key={index} className="history-item">
                        <div className="history-header">
                          <span className="question-number">{index + 1}</span>
                          <span className="timestamp">
                            {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        <div className="history-question">
                          <strong>Q: {entry.question}</strong>
                        </div>

                        <div className="history-answer">
                          <strong>A:</strong> {entry.answer || <em>No response recorded</em>}
                        </div>

                        {entry.audio_metrics && !entry.audio_metrics.error && (
                          <div className="metrics">
                            <div className="metrics-header">🎤 Voice Analysis</div>
                            <div className="metrics-grid">
                              <div className="metric">
                                <span>Pace</span>
                                <span className="score">{entry.audio_metrics.pace_score}/100</span>
                              </div>
                              <div className="metric">
                                <span>Confidence</span>
                                <span className="score">{entry.audio_metrics.confidence_score}/100</span>
                              </div>
                              <div className="metric">
                                <span>Tone</span>
                                <span className="score">{entry.audio_metrics.tone_score}/100</span>
                              </div>
                            </div>
                            {entry.audio_metrics.analysis_summary && (
                              <div className="summary">"{entry.audio_metrics.analysis_summary}"</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Evaluation Panel */}
          <div className="card">
            <div className="card-header">
              <h3>Final Evaluation</h3>
              <div className="header-actions">
                {evaluation && (
                  <button className="btn btn-secondary btn-sm" onClick={resetInterview}>
                    New Interview
                  </button>
                )}
                <button
                  className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
                  onClick={finishInterview}
                  disabled={history.length === 0 || isLoading}
                >
                  {isLoading ? 'Evaluating...' : 'Finish Interview'}
                </button>
              </div>
            </div>
            <div className="card-content">
              {isLoading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <div>
                    <div>Analyzing Your Performance</div>
                    <p>AI is evaluating your responses and providing detailed feedback...</p>
                  </div>
                </div>
              ) : evaluation ? (
                <div className="evaluation">
                  <div className="evaluation-header">
                    <div className="success-icon">🎉</div>
                    <div>
                      <h4>Interview Complete!</h4>
                      <p>Here's your detailed performance analysis</p>
                    </div>
                  </div>
                  <div className="evaluation-content">
                    {evaluation.split('\n').map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                  <div className="evaluation-actions">
                    <button className="btn btn-secondary" onClick={() => window.print()}>
                      Print Results
                    </button>
                    <button className="btn btn-primary" onClick={resetInterview}>
                      Practice Again
                    </button>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">🎯</div>
                  <div>
                    <div>Ready for Evaluation</div>
                    <p>
                      {history.length === 0
                        ? 'Answer at least one question to get your evaluation'
                        : 'Click "Finish Interview" when you\'re ready for AI feedback'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Audio Recorder Component
function AudioRecorder({ uploadUrl, onAudioUploaded, disabled, isRecording, setIsRecording }) {
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState('Ready to record');

  const mediaRecorderRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const chunksRef = React.useRef([]);

  const startRecording = async () => {
    try {
      setStatus('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

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

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus('Recording...');

    } catch (error) {
      console.error('Error starting recording:', error);
      setStatus('Microphone access denied or not available');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
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

      resetRecorder();
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
    setStatus('Ready to record');
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>Voice Response</h3>
        <p className="card-subtitle">{status}</p>
      </div>
      <div className="card-content">
        <div className="recorder-controls">
          <button
            className={`btn btn-lg ${isRecording ? 'btn-danger' : 'btn-primary'} ${isUploading ? 'loading' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled || isUploading}
          >
            {isRecording ? '⏹️ Stop Recording' : '🎤 Start Recording'}
          </button>

          {audioBlob && !isRecording && (
            <button
              className={`btn btn-success btn-lg ${isUploading ? 'loading' : ''}`}
              onClick={uploadAudio}
              disabled={isUploading}
            >
              {isUploading ? '⏳ Processing...' : '📤 Submit Answer'}
            </button>
          )}

          {audioBlob && (
            <button className="btn btn-secondary" onClick={resetRecorder} disabled={isUploading}>
              🔄 Reset
            </button>
          )}
        </div>

        <div className={`audio-visualizer ${isRecording ? 'recording' : ''}`}>
          {isRecording ? (
            <div className="recording-animation">
              <div className="wave"></div>
              <div className="wave"></div>
              <div className="wave"></div>
              <div className="wave"></div>
              <div className="wave"></div>
            </div>
          ) : audioUrl ? (
            <audio controls src={audioUrl} style={{ width: '100%' }} />
          ) : (
            <div className="placeholder">Audio will appear here after recording</div>
          )}
        </div>

        {disabled && (
          <div className="disabled-message">
            Generate a question first to start recording
          </div>
        )}
      </div>
    </div>
  );
}

// Performance Dashboard Component
function PerformanceDashboard({ performance }) {
  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#10b981';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  };

  return (
    <div className="card performance-dashboard">
      <div className="card-header">
        <h3>📊 Performance Analytics</h3>
        <p className="card-subtitle">Real-time interview metrics</p>
      </div>
      <div className="card-content">
        <div className="overall-score">
          <div
            className="score-circle large"
            style={{
              background: `conic-gradient(${getScoreColor(performance.overall)} 0deg ${(performance.overall / 100) * 360}deg, #e5e7eb ${(performance.overall / 100) * 360}deg 360deg)`
            }}
          >
            <div className="score-inner">
              <div className="score-value" style={{ color: getScoreColor(performance.overall) }}>
                {performance.overall}
              </div>
              <div className="score-label">OVERALL</div>
            </div>
          </div>
          <div className="score-description">
            <div className="score-title">{getScoreLabel(performance.overall)} Performance</div>
            <div className="score-subtitle">Keep practicing to improve!</div>
          </div>
        </div>

        <div className="metrics-grid">
          <div className="metric-item">
            <div
              className="score-circle small"
              style={{
                background: `conic-gradient(${getScoreColor(performance.pace)} 0deg ${(performance.pace / 100) * 360}deg, #e5e7eb ${(performance.pace / 100) * 360}deg 360deg)`
              }}
            >
              <div className="score-inner">
                <div className="metric-icon">⏱️</div>
                <div className="metric-value">{performance.pace}</div>
              </div>
            </div>
            <div className="metric-info">
              <div className="metric-name">Pace</div>
              <div className="metric-status">{getScoreLabel(performance.pace)}</div>
            </div>
          </div>

          <div className="metric-item">
            <div
              className="score-circle small"
              style={{
                background: `conic-gradient(${getScoreColor(performance.confidence)} 0deg ${(performance.confidence / 100) * 360}deg, #e5e7eb ${(performance.confidence / 100) * 360}deg 360deg)`
              }}
            >
              <div className="score-inner">
                <div className="metric-icon">💪</div>
                <div className="metric-value">{performance.confidence}</div>
              </div>
            </div>
            <div className="metric-info">
              <div className="metric-name">Confidence</div>
              <div className="metric-status">{getScoreLabel(performance.confidence)}</div>
            </div>
          </div>

          <div className="metric-item">
            <div
              className="score-circle small"
              style={{
                background: `conic-gradient(${getScoreColor(performance.tone)} 0deg ${(performance.tone / 100) * 360}deg, #e5e7eb ${(performance.tone / 100) * 360}deg 360deg)`
              }}
            >
              <div className="score-inner">
                <div className="metric-icon">🎯</div>
                <div className="metric-value">{performance.tone}</div>
              </div>
            </div>
            <div className="metric-info">
              <div className="metric-name">Tone</div>
              <div className="metric-status">{getScoreLabel(performance.tone)}</div>
            </div>
          </div>
        </div>

        <div className="tips-section">
          <h4>💡 Quick Tips</h4>
          <div className="tips-list">
            {performance.pace < 60 && (
              <div className="tip">• Try speaking at a steady, moderate pace</div>
            )}
            {performance.confidence < 60 && (
              <div className="tip">• Speak with more volume and conviction</div>
            )}
            {performance.tone < 60 && (
              <div className="tip">• Use more professional language and show enthusiasm</div>
            )}
            {performance.overall >= 80 && (
              <div className="tip success">• Excellent work! You're interviewing at a professional level</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;