import { Megaphone, Filter, CalendarCheck, Star, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: <Megaphone size={24} />,
    iconClass: 'icon-blue',
    title: 'Automated Job Posting',
    description:
      'Publish job openings across 50+ platforms simultaneously with a single click. RecEasy crafts compelling job descriptions using AI and targets the right talent pools automatically.',
    points: ['Multi-platform distribution', 'AI-written job descriptions', 'Smart targeting'],
  },
  {
    icon: <Filter size={24} />,
    iconClass: 'icon-indigo',
    title: 'Intelligent Candidate Filtering',
    description:
      'Our AI engine screens thousands of resumes in seconds, scoring candidates against your requirements and surfacing only the best matches — eliminating manual review.',
    points: ['Resume parsing & scoring', 'Custom filter criteria', 'Bias-free screening'],
  },
  {
    icon: <CalendarCheck size={24} />,
    iconClass: 'icon-cyan',
    title: 'Interview Scheduling',
    description:
      'Eliminate back-and-forth emails. RecEasy automatically coordinates calendars between candidates and interviewers, sends reminders, and handles rescheduling effortlessly.',
    points: ['Two-way calendar sync', 'Automated reminders', 'Video link generation'],
  },
  {
    icon: <Star size={24} />,
    iconClass: 'icon-violet',
    title: 'Shortlisting Best Candidates',
    description:
      'Get AI-powered rankings of your top candidates with detailed scorecards. Make confident hiring decisions backed by data, skill assessments, and predictive fit scores.',
    points: ['Ranked shortlists', 'Detailed scorecards', 'Predictive fit analysis'],
  },
];

export default function Features() {
  return (
    <section className="section features" id="features">
      <div className="section-header">
        <span className="section-tag">Features</span>
        <h2>Everything You Need to <span>Hire Better</span></h2>
        <p>
          RecEasy brings together powerful AI tools that automate every stage of your
          recruitment process — saving time, reducing cost, and improving quality of hire.
        </p>
      </div>

      <div className="features-grid">
        {features.map((f) => (
          <div className="feature-card" key={f.title}>
            <div className={`feature-icon ${f.iconClass}`}>{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.description}</p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
              {f.points.map(pt => (
                <li key={pt} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.83rem', color: 'var(--gray-600)', fontWeight: 500 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue-400)', flexShrink: 0 }} />
                  {pt}
                </li>
              ))}
            </ul>
            <span className="feature-link">
              Learn more <ArrowRight size={14} />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
