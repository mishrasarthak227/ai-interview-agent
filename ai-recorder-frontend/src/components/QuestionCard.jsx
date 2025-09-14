import React from 'react';

export const QuestionCard = ({ currentQuestion, questionNumber, isLoading, onFetchQuestion }) => {
  return (
    <div className="card fade-in">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="card-title">
              Question {questionNumber}
            </h2>
            <p className="card-subtitle">
              {currentQuestion ? 'Ready to answer' : 'Click to generate next question'}
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={onFetchQuestion}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="spinner" />
                Generating...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                New Question
              </>
            )}
          </button>
        </div>
      </div>

      <div className="card-content">
        <div style={{
          minHeight: '120px',
          display: 'flex',
          alignItems: 'center',
          padding: 'var(--space-4)',
          background: currentQuestion ? 'var(--surface)' : 'var(--gray-50)',
          borderRadius: 'var(--radius-md)',
          border: currentQuestion ? '2px solid var(--primary-light)' : '2px dashed var(--border)'
        }}>
          {isLoading ? (
            <div className="flex items-center gap-3 text-muted">
              <div className="spinner" />
              <span>AI is preparing your next question...</span>
            </div>
          ) : currentQuestion ? (
            <div>
              <div style={{
                fontSize: '1.125rem',
                fontWeight: '500',
                lineHeight: '1.6',
                color: 'var(--text-primary)'
              }}>
                {currentQuestion}
              </div>
            </div>
          ) : (
            <div className="text-center" style={{ width: '100%' }}>
              <div style={{
                fontSize: '3rem',
                marginBottom: 'var(--space-2)',
                color: 'var(--text-muted)'
              }}>
                💭
              </div>
              <p className="text-muted">
                Click "New Question" to start your interview
              </p>
            </div>
          )}
        </div>

        {currentQuestion && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <div style={{
                width: '8px',
                height: '8px',
                background: 'var(--success)',
                borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }} />
              <span className="text-sm text-muted">
                Ready to record your answer
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Add pulse animation to CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;
document.head.appendChild(style);