import { ArrowRight, Play } from 'lucide-react';

export default function Hero({ onGetStarted }) {
  return (
    <section className="hero" id="hero">
      <div className="hero-content">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          AI-Powered Recruitment Platform
        </div>

        <h1>
          Hire Smarter,<br />
          Faster with <span>RecEasy</span>
        </h1>

        <p>
          Automate your entire recruitment pipeline — from job posting to final offer.
          Let AI handle the heavy lifting so your team can focus on what matters most.
        </p>

        <div className="hero-cta">
          <button className="btn-primary" onClick={onGetStarted}>
            Get Started Free
            <ArrowRight size={18} />
          </button>
          <button className="btn-secondary"
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
            <Play size={16} fill="currentColor" />
            See How It Works
          </button>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-number">10x</span>
            <span className="hero-stat-label">Faster Hiring</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-number">85%</span>
            <span className="hero-stat-label">Time Saved</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-number">500+</span>
            <span className="hero-stat-label">Companies Trust Us</span>
          </div>
        </div>
      </div>

      <div className="hero-visual">
        <div className="hero-card-container">
          <div className="hero-card hero-card-main">
            <div className="hero-card-top">
              <div className="hero-card-avatar">AK</div>
              <div className="hero-card-info">
                <h4>Aisha Khan</h4>
                <p>Senior React Developer • 5 yrs</p>
              </div>
              <span className="hero-card-badge">Shortlisted</span>
            </div>
            <div className="hero-card-skills">
              <span className="skill-tag">React</span>
              <span className="skill-tag">TypeScript</span>
              <span className="skill-tag">Node.js</span>
              <span className="skill-tag">AWS</span>
            </div>
            <div className="match-score">
              <span>AI Match Score</span>
              <span className="match-pct">96%</span>
            </div>
          </div>

          <div className="hero-card hero-card-float-1">
            <div className="float-card-label">Interviews Today</div>
            <div className="float-card-value">12</div>
            <div className="float-card-sub">Auto-scheduled by AI</div>
          </div>

          <div className="hero-card hero-card-float-2">
            <div className="float-card-label">Candidates Filtered</div>
            <div className="float-card-value">248</div>
            <div className="float-card-sub">From 1,200 applicants</div>
          </div>
        </div>
      </div>
    </section>
  );
}
