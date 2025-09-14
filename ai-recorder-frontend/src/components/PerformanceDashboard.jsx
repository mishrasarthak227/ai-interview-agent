import React from 'react';

export const PerformanceDashboard = ({ performance }) => {
  if (!performance) return null;

  const getScoreColor = (score) => {
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--secondary)';
    if (score >= 40) return 'var(--warning)';
    return 'var(--danger)';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  };

  const ScoreCircle = ({ score, label, icon }) => (
    <div className="flex flex-col items-center">
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: `conic-gradient(${getScoreColor(score)} 0deg ${(score / 100) * 360}deg, var(--gray-200) ${(score / 100) * 360}deg 360deg)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'var(--background)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div style={{ fontSize: '0.75rem', marginBottom: '2px' }}>{icon}</div>
          <div style={{ fontSize: '1rem', fontWeight: '600' }}>{score}</div>
        </div>
      </div>
      <div className="mt-2 text-center">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted">{getScoreLabel(score)}</div>
      </div>
    </div>
  );

  return (
    <div className="card fade-in">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <div style={{ fontSize: '1.25rem' }}>📊</div>
          <div>
            <h3 className="card-title">Performance Analytics</h3>
            <p className="card-subtitle">Real-time interview metrics</p>
          </div>
        </div>
      </div>

      <div className="card-content">
        {/* Overall Score */}
        <div className="text-center mb-6">
          <div
            style={{
              width: '120px',
              height: '120px',
              margin: '0 auto',
              borderRadius: '50%',
              background: `conic-gradient(${getScoreColor(performance.overall)} 0deg ${(performance.overall / 100) * 360}deg, var(--gray-200) ${(performance.overall / 100) * 360}deg 360deg)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            <div
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                background: 'var(--background)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: getScoreColor(performance.overall) }}>
                {performance.overall}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OVERALL</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="font-semibold text-lg">{getScoreLabel(performance.overall)} Performance</div>
            <div className="text-sm text-muted">Keep practicing to improve!</div>
          </div>
        </div>

        {/* Individual Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
          <ScoreCircle score={performance.pace} label="Pace" icon="⏱️" />
          <ScoreCircle score={performance.confidence} label="Confidence" icon="💪" />
          <ScoreCircle score={performance.tone} label="Tone" icon="🎯" />
        </div>

        {/* Recommendations */}
        <div className="mt-6 p-4" style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)' }}>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <span>💡</span>
            Quick Tips
          </h4>
          <div className="space-y-2">
            {performance.pace < 60 && (
              <div className="text-sm text-muted">
                • Try speaking at a steady, moderate pace - not too fast or slow
              </div>
            )}
            {performance.confidence < 60 && (
              <div className="text-sm text-muted">
                • Speak with more volume and conviction to sound confident
              </div>
            )}
            {performance.tone < 60 && (
              <div className="text-sm text-muted">
                • Use more professional language and show enthusiasm
              </div>
            )}
            {performance.overall >= 80 && (
              <div className="text-sm" style={{ color: 'var(--success)' }}>
                • Excellent work! You're interviewing at a professional level
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};