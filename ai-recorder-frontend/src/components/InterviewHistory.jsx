import React from 'react';

export const InterviewHistory = ({ history }) => {
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreBadge = (score) => {
    if (score >= 80) return { className: 'badge-success', label: 'Excellent' };
    if (score >= 60) return { className: 'badge-info', label: 'Good' };
    if (score >= 40) return { className: 'badge-warning', label: 'Fair' };
    return { className: 'badge badge-danger', label: 'Poor', style: { background: '#fee2e2', color: '#991b1b' } };
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <div style={{ fontSize: '1.25rem' }}>📝</div>
          <div>
            <h3 className="card-title">Interview History</h3>
            <p className="card-subtitle">
              {history.length === 0 ? 'No questions answered yet' : `${history.length} questions answered`}
            </p>
          </div>
        </div>
      </div>

      <div className="card-content">
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {history.length === 0 ? (
            <div className="text-center py-8">
              <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)', opacity: 0.5 }}>
                📭
              </div>
              <p className="text-muted">
                Your questions and answers will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div
                  key={index}
                  className="fade-in"
                  style={{
                    padding: 'var(--space-4)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface)'
                  }}
                >
                  {/* Question Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'var(--primary)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}
                      >
                        {index + 1}
                      </div>
                      <span className="text-sm text-muted">
                        Question {index + 1}
                      </span>
                    </div>
                    {entry.timestamp && (
                      <span className="text-xs text-muted">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    )}
                  </div>

                  {/* Question */}
                  <div className="mb-3">
                    <div className="text-sm font-medium mb-1" style={{ color: 'var(--primary)' }}>
                      Question:
                    </div>
                    <div className="text-sm" style={{ lineHeight: '1.5' }}>
                      {entry.question}
                    </div>
                  </div>

                  {/* Answer */}
                  <div className="mb-3">
                    <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                      Your Answer:
                    </div>
                    <div
                      className="text-sm"
                      style={{
                        background: 'var(--background)',
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)',
                        lineHeight: '1.5'
                      }}
                    >
                      {entry.answer || (
                        <em style={{ color: 'var(--text-muted)' }}>No response recorded</em>
                      )}
                    </div>
                  </div>

                  {/* Audio Metrics */}
                  {entry.audio_metrics && !entry.audio_metrics.error && (
                    <div className="mt-3 p-3" style={{
                      background: 'var(--background)',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--primary-light)'
                    }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span style={{ fontSize: '0.875rem' }}>🎤</span>
                        <span className="text-xs font-medium text-muted">VOICE ANALYSIS</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}>
                        <div className="text-center">
                          <div className="text-xs text-muted mb-1">Pace</div>
                          <div className={`badge ${getScoreBadge(entry.audio_metrics.pace_score).className}`}>
                            {entry.audio_metrics.pace_score}/100
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted mb-1">Confidence</div>
                          <div className={`badge ${getScoreBadge(entry.audio_metrics.confidence_score).className}`}>
                            {entry.audio_metrics.confidence_score}/100
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted mb-1">Tone</div>
                          <div className={`badge ${getScoreBadge(entry.audio_metrics.tone_score).className}`}>
                            {entry.audio_metrics.tone_score}/100
                          </div>
                        </div>
                      </div>

                      {entry.audio_metrics.analysis_summary && (
                        <div className="mt-2 text-xs" style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          "{entry.audio_metrics.analysis_summary}"
                        </div>
                      )}

                      {entry.audio_metrics.words_per_minute && (
                        <div className="mt-2 text-xs text-muted">
                          Speaking rate: {entry.audio_metrics.words_per_minute} WPM
                        </div>
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
  );
};