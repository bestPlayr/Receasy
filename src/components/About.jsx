import { Target, Zap, ShieldCheck } from 'lucide-react';

const values = [
  {
    icon: <Target size={18} />,
    title: 'Mission-Driven',
    description: 'We exist to eliminate the inefficiencies of traditional hiring and help every company build the team they deserve.',
  },
  {
    icon: <Zap size={18} />,
    title: 'Speed & Accuracy',
    description: 'Our AI models are trained on millions of hiring outcomes to deliver fast, precise candidate matching every time.',
  },
  {
    icon: <ShieldCheck size={18} />,
    title: 'Fair & Unbiased',
    description: 'RecEasy is built with fairness at its core — structured scoring and anonymized screening remove unconscious bias.',
  },
];

export default function About() {
  return (
    <section className="about section" id="about">
      <div className="about-grid">
        <div className="about-visual">
          <div className="about-image-bg">
            <div className="about-icon-grid">
              {[
                { icon: '🤖', label: 'AI Engine' },
                { icon: '📊', label: 'Analytics' },
                { icon: '🎯', label: 'Precision' },
                { icon: '⚡', label: 'Speed' },
              ].map(item => (
                <div className="about-icon-block" key={item.label}>
                  <div className="icon">{item.icon}</div>
                  <p>{item.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="about-stat-badge">
            <span className="number">98%</span>
            <span className="label">Customer Satisfaction</span>
          </div>
        </div>

        <div className="about-content">
          <span className="section-tag">About Us</span>
          <h2>
            Built by Recruiters,<br />
            Powered by <span>Artificial Intelligence</span>
          </h2>
          <p>
            RecEasy was founded in 2024 by a team of HR professionals and AI engineers
            who were tired of watching great candidates slip through the cracks of
            broken recruitment processes.
          </p>
          <p>
            We built the platform we always wished existed — one that handles the
            tedious, time-consuming parts of hiring automatically, while keeping
            humans in control of the decisions that matter.
          </p>

          <div className="about-values">
            {values.map(v => (
              <div className="about-value" key={v.title}>
                <div className="about-value-icon">{v.icon}</div>
                <div className="about-value-text">
                  <h4>{v.title}</h4>
                  <p>{v.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
