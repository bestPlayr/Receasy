const companies = [
  { name: 'Google', abbr: 'G', color: '#4285F4' },
  { name: 'Microsoft', abbr: 'M', color: '#00A4EF' },
  { name: 'Amazon', abbr: 'A', color: '#FF9900' },
  { name: 'Spotify', abbr: 'S', color: '#1DB954' },
  { name: 'Airbnb', abbr: 'Ab', color: '#FF5A5F' },
  { name: 'Stripe', abbr: 'St', color: '#635BFF' },
  { name: 'Notion', abbr: 'N', color: '#000000' },
  { name: 'Figma', abbr: 'F', color: '#F24E1E' },
  { name: 'Shopify', abbr: 'Sh', color: '#96BF48' },
  { name: 'Slack', abbr: 'Sl', color: '#4A154B' },
  { name: 'Zoom', abbr: 'Z', color: '#2D8CFF' },
  { name: 'HubSpot', abbr: 'H', color: '#FF7A59' },
];

const doubled = [...companies, ...companies];

export default function Companies() {
  return (
    <section className="companies" id="companies">
      <div className="companies-header">
        <p>Trusted by teams at</p>
        <h3>500+ companies already using RecEasy to hire smarter</h3>
      </div>

      <div className="marquee-wrapper">
        <div className="marquee-track">
          {doubled.map((company, idx) => (
            <div className="company-logo-item" key={`${company.name}-${idx}`}>
              <div className="company-logo-box">
                <div
                  className="company-logo-icon"
                  style={{ background: company.color }}
                >
                  {company.abbr}
                </div>
                <span className="company-logo-name">{company.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
