import React from 'react';

export const InterviewHeader = ({ jobTitle, jobTitles, onJobChange, questionNum, totalQuestions }) => {
  return (
    <header className="card" style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0 }}>
      <div className="card-content">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.5rem',
                fontWeight: '700'
              }}>
                AI
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {jobTitle}
                </h1>
                <p className="text-sm text-secondary">
                  AI-Powered Interview Practice
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {totalQuestions > 0 && (
              <div className="badge badge-info">
                {totalQuestions} Questions Answered
              </div>
            )}

            <select
              className="select"
              value={jobTitle}
              onChange={(e) => onJobChange(e.target.value)}
              style={{ minWidth: '250px' }}
            >
              {jobTitles.map((job) => (
                <option key={job} value={job}>
                  {job}
                </option>
              ))}
            </select>
          </div>
        </div>

        {totalQuestions > 0 && (
          <div style={{ marginTop: 'var(--space-4)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted">Interview Progress</span>
              <span className="text-sm font-medium">
                {totalQuestions} / 10 questions
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.min((totalQuestions / 10) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};