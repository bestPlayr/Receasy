const steps = [
  {
    number: '01',
    title: 'Post Your Job',
    description: 'Enter your job requirements and let RecEasy auto-generate a job description and distribute it across all major platforms instantly.',
  },
  {
    number: '02',
    title: 'AI Screens Applicants',
    description: 'Our AI engine reads every application and scores each candidate against your criteria, eliminating manual resume review entirely.',
  },
  {
    number: '03',
    title: 'Schedule Interviews',
    description: 'Top candidates are automatically invited to interview slots that work for everyone — no emails, no scheduling conflicts.',
  },
  {
    number: '04',
    title: 'Hire with Confidence',
    description: 'Receive a ranked shortlist with AI scorecards. Review, collaborate with your team, and extend offers — all in one place.',
  },
];

export default function HowItWorks() {
  return (
    <section className="how-it-works" id="how-it-works">
      <div className="section-header">
        <span className="section-tag">How It Works</span>
        <h2>From Job Post to <span>Hired</span> in 4 Steps</h2>
        <p>
          RecEasy streamlines your entire recruitment workflow so you can go from
          posting a job to making an offer in record time.
        </p>
      </div>

      <div className="steps-grid">
        {steps.map((step) => (
          <div className="step-card" key={step.number}>
            <div className="step-number">{step.number}</div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
