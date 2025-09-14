import React from 'react';

export const EvaluationPanel = ({
  evaluation,
  isLoading,
  onFinishInterview,
  disabled,
  onReset
}) => {
  const formatEvaluation = (evaluationText) => {
    if (!evaluationText) return null;

    // Split by common sections
    const sections = evaluationText.split(/(?=\d+\.|Overall|Key|Areas|Tips|Score|Decision|Recommendation)/i);

    return sections
      .filter(section => section.trim().length > 0)
      .map((section, index) => {
        const trimmed = section.trim();

        // Check if it's a header line
        if (trimmed.match(/^(Overall|Key|Areas|Tips|Score|Decision|Recommendation|Strengths|Weaknesses)/i)) {
          return (
            <div key={index} className="font-semibold mt-4 mb-2" style={{ color: 'var(--primary)' }}>
              {trimmed}
            </div>
          );
        }

        // Check if it's a numbered item
        if (trimmed.match(/^\d+\./)) {
          return (
            <div key={index} className="mb-2 ml-4" style={{ lineHeight: '1.6' }}>
              {trimmed}
            </div>
          );
        }

        // Regular paragraph
        return (
          <div key={index} className="mb-3" style={{ lineHeight: '1.6' }}>
            {trimmed}
          </div>
        );
      });
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div style={{ fontSize: '1.25rem' }}>🎯</div>
            <div>
              <h3 className="card-title">Final Evaluation</h3>
              <p className="card-subtitle">
                {evaluation ? 'AI assessment complete' : 'Complete interview for evaluation'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {evaluation && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={onReset}
                title="Start new interview"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1,4 1,10 7,10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                New Interview
              </button>
            )}

            <button
              className="btn btn-primary"
              onClick={onFinishInterview}
              disabled={disabled || isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner" />
                  Evaluating...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                  Finish Interview
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="card-content">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="spinner mb-4" style={{ width: '40px', height: '40px', margin: '0 auto' }} />
            <div className="font-medium mb-2">Analyzing Your Performance</div>
            <div className="text-sm text-muted">
              AI is evaluating your responses and providing detailed feedback...
            </div>
          </div>
        ) : evaluation ? (
          <div>
            {/* Evaluation Header */}
            <div className="mb-6 text-center p-4" style={{
              background: 'linear-gradient(135deg, var(--success), var(--secondary))',
              borderRadius: 'var(--radius-lg)',
              color: 'white'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>
                🎉
              </div>
              <div className="font-bold text-lg">Interview Complete!</div>
              <div className="text-sm opacity-90">
                Here's your detailed performance analysis
              </div>
            </div>

            {/* Formatted Evaluation */}
            <div
              className="evaluation-content"
              style={{
                background: 'var(--surface)',
                padding: 'var(--space-5)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                fontSize: '0.9rem'
              }}
            >
              {formatEvaluation(evaluation)}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                className="btn btn-secondary"
                onClick={() => window.print()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6,9 6,2 18,2 18,9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Print Results
              </button>

              <button
                className="btn btn-primary"
                onClick={onReset}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M8 16l-5 5v-5" />
                </svg>
                Practice Again
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)', opacity: 0.5 }}>
              🎯
            </div>
            <div className="font-medium mb-2">Ready for Evaluation</div>
            <div className="text-sm text-muted mb-4">
              {disabled
                ? 'Answer at least one question to get your evaluation'
                : 'Click "Finish Interview" when you\'re ready for AI feedback'
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
};