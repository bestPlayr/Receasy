import { useState } from 'react';
import {
  Briefcase, LogOut, ArrowLeft, MapPin, Clock, Mail, Phone,
  ChevronRight, Building2, Search, OctagonX, Bot,
  SendHorizonal, Settings, CheckCircle2, XCircle, Clock3,
  AlertCircle, UserCheck, Star, Users, FileText,
  LayoutDashboard, TrendingUp, CalendarCheck, Timer,
  Activity, CircleDot,
} from 'lucide-react';
import './Dashboard.css';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const INITIAL_JOBS = [
  // ── Active jobs ──────────────────────────────────────────────────────────
  {
    id: 1, title: 'Senior React Developer', department: 'Engineering',
    location: 'Remote', type: 'Full-time', postedAgo: '2 days ago',
    applicants: 45, shortlisted: 3, status: 'Active',
    description: 'We are looking for a Senior React Developer to join our growing engineering team, building high-quality web applications used by thousands of hiring managers worldwide.',
    requirements: ['5+ years React', 'TypeScript', 'Node.js', 'AWS', 'Problem-solving'],
    candidates: [
      { id: 1, name: 'Aisha Khan', initials: 'AK', color: '#4F46E5', experience: '6 years', location: 'San Francisco, CA', score: 96, status: 'Shortlisted', email: 'aisha.khan@email.com', phone: '+1 (415) 555-0123', skills: ['React', 'TypeScript', 'Node.js', 'AWS', 'GraphQL', 'Redux'], education: 'BS Computer Science, Stanford University', summary: 'Senior React Developer with 6 years building scalable web apps. Led frontend teams at two Series B startups and contributed to open-source React libraries with 2K+ GitHub stars.', appliedDate: 'May 7, 2026' },
      { id: 2, name: 'Priya Patel', initials: 'PP', color: '#0891B2', experience: '5 years', location: 'Austin, TX', score: 91, status: 'Shortlisted', email: 'priya.patel@email.com', phone: '+1 (512) 555-0187', skills: ['React', 'TypeScript', 'GraphQL', 'Docker', 'PostgreSQL'], education: 'MS Software Engineering, UT Austin', summary: 'Full-stack developer specialising in React with a strong background in GraphQL APIs and cloud-native applications.', appliedDate: 'May 6, 2026' },
      { id: 3, name: 'Marcus Chen', initials: 'MC', color: '#059669', experience: '5 years', location: 'Seattle, WA', score: 88, status: 'In Review', email: 'marcus.chen@email.com', phone: '+1 (206) 555-0142', skills: ['React', 'Vue.js', 'Python', 'Django', 'Redis'], education: 'BS Computer Engineering, UW', summary: 'Versatile frontend developer who led UI revamps for e-commerce platforms serving 2M+ users.', appliedDate: 'May 5, 2026' },
      { id: 4, name: 'Sara Williams', initials: 'SW', color: '#DC2626', experience: '4 years', location: 'New York, NY', score: 78, status: 'In Review', email: 'sara.williams@email.com', phone: '+1 (212) 555-0198', skills: ['React', 'Angular', 'Docker', 'Kubernetes', 'Jest'], education: 'BS Information Technology, NYU', summary: 'Frontend engineer with strong background in testing and CI/CD. Known for clean code and comprehensive documentation.', appliedDate: 'May 4, 2026' },
      { id: 5, name: 'James Okonkwo', initials: 'JO', color: '#D97706', experience: '7 years', location: 'Chicago, IL', score: 72, status: 'New', email: 'james.okonkwo@email.com', phone: '+1 (312) 555-0165', skills: ['React', 'Ruby on Rails', 'PostgreSQL', 'Heroku', 'Tailwind'], education: 'BS Computer Science, U of Illinois', summary: 'Full-stack developer with 7 years across the stack. Has built and launched 3 SaaS products from scratch.', appliedDate: 'May 3, 2026' },
    ],
  },
  {
    id: 2, title: 'Product Manager', department: 'Product',
    location: 'San Francisco, CA', type: 'Full-time', postedAgo: '4 days ago',
    applicants: 32, shortlisted: 5, status: 'Active',
    description: 'Looking for an experienced Product Manager to own our core recruitment product, working closely with engineering, design, and customers to ship features that delight users.',
    requirements: ['5+ years PM experience', 'SaaS background', 'Data-driven mindset', 'Excellent comms', 'Agile/Scrum'],
    candidates: [
      { id: 6, name: 'David Kim', initials: 'DK', color: '#7C3AED', experience: '8 years', location: 'San Francisco, CA', score: 94, status: 'Shortlisted', email: 'david.kim@email.com', phone: '+1 (415) 555-0211', skills: ['Product Strategy', 'Roadmapping', 'SQL', 'Figma', 'A/B Testing'], education: 'MBA, Harvard Business School', summary: 'Strategic product leader who led teams of 8+ at two unicorn startups, driving 3x revenue growth through data-driven features.', appliedDate: 'May 4, 2026' },
      { id: 7, name: 'Lisa Thompson', initials: 'LT', color: '#DB2777', experience: '6 years', location: 'Remote', score: 87, status: 'Shortlisted', email: 'lisa.thompson@email.com', phone: '+1 (650) 555-0177', skills: ['Product Vision', 'User Research', 'Jira', 'Mixpanel', 'GTM'], education: 'BS Business, UC Berkeley', summary: 'Customer-obsessed PM who launched 4 product lines generating $10M+ ARR. Deep expertise in user research and conversion optimisation.', appliedDate: 'May 4, 2026' },
      { id: 8, name: 'Ahmed Hassan', initials: 'AH', color: '#0284C7', experience: '5 years', location: 'Boston, MA', score: 76, status: 'In Review', email: 'ahmed.hassan@email.com', phone: '+1 (617) 555-0143', skills: ['API Products', 'Developer Experience', 'OKRs', 'SQL', 'Amplitude'], education: 'MS Computer Science, MIT', summary: 'Technical PM specialising in developer-facing products. Engineering background enables deep collaboration with dev teams.', appliedDate: 'May 3, 2026' },
    ],
  },
  {
    id: 3, title: 'UX / UI Designer', department: 'Design',
    location: 'Remote', type: 'Full-time', postedAgo: '3 days ago',
    applicants: 28, shortlisted: 2, status: 'Active',
    description: 'We need a talented UX/UI Designer to create exceptional experiences for our recruitment platform and own the design system.',
    requirements: ['4+ years UX/UI', 'Figma expert', 'Design systems', 'User research', 'Animation a plus'],
    candidates: [
      { id: 9, name: 'Sofia Martinez', initials: 'SM', color: '#F59E0B', experience: '5 years', location: 'Miami, FL', score: 93, status: 'Shortlisted', email: 'sofia.martinez@email.com', phone: '+1 (305) 555-0199', skills: ['Figma', 'Prototyping', 'Design Systems', 'User Research', 'Framer'], education: 'BFA Graphic Design, Parsons', summary: 'UX/UI Designer who shaped the design language for two YC-backed startups. Expert in Figma, user testing, and scalable design systems.', appliedDate: 'May 5, 2026' },
      { id: 10, name: 'Ryan Park', initials: 'RP', color: '#10B981', experience: '4 years', location: 'Los Angeles, CA', score: 85, status: 'Interview', email: 'ryan.park@email.com', phone: '+1 (213) 555-0134', skills: ['Figma', 'Adobe XD', 'Webflow', 'CSS', 'Accessibility'], education: 'BS HCI, Carnegie Mellon', summary: 'Detail-oriented UI designer specialising in accessible, inclusive design. Bridges the gap between design and code.', appliedDate: 'May 4, 2026' },
    ],
  },

  // ── Stopped job (already closed, for demo) ───────────────────────────────
  {
    id: 4, title: 'Data Scientist', department: 'AI / ML',
    location: 'New York, NY', type: 'Full-time', postedAgo: '6 days ago',
    applicants: 67, shortlisted: 8, status: 'Stopped',
    description: "Join our AI team to build the ML models powering RecEasy's candidate scoring and job-matching algorithms.",
    requirements: ['PhD/MS ML/Stats', 'Python · PyTorch', 'NLP experience', 'Production ML', 'SQL'],
    candidates: [
      { id: 11, name: 'Elena Volkov', initials: 'EV', color: '#6D28D9', experience: '4 years', location: 'New York, NY', score: 97, status: 'Shortlisted', email: 'elena.volkov@email.com', phone: '+1 (917) 555-0156', skills: ['PyTorch', 'NLP', 'Python', 'Kubernetes', 'Spark'], education: 'PhD ML, Columbia University', summary: 'ML researcher with deep NLP expertise. Published 6 papers on transformers. Built recommendation systems serving 10M+ users.', appliedDate: 'May 2, 2026' },
      { id: 12, name: 'Carlos Rivera', initials: 'CR', color: '#BE185D', experience: '5 years', location: 'Remote', score: 89, status: 'Shortlisted', email: 'carlos.rivera@email.com', phone: '+1 (512) 555-0188', skills: ['Python', 'TensorFlow', 'SQL', 'Tableau', 'SageMaker'], education: 'MS Statistics, Carnegie Mellon', summary: 'Applied data scientist specialised in HR analytics. Built attrition prediction models for Fortune 500 companies.', appliedDate: 'May 1, 2026' },
      { id: 13, name: 'Nina Osei', initials: 'NO', color: '#0EA5E9', experience: '3 years', location: 'Atlanta, GA', score: 74, status: 'In Review', email: 'nina.osei@email.com', phone: '+1 (404) 555-0177', skills: ['Python', 'scikit-learn', 'SQL', 'R', 'Tableau'], education: 'MS Data Science, Georgia Tech', summary: 'Data scientist with experience building classification and regression models for fintech platforms.', appliedDate: 'Apr 30, 2026' },
      { id: 14, name: 'Tom Zhang', initials: 'TZ', color: '#64748B', experience: '2 years', location: 'Boston, MA', score: 61, status: 'New', email: 'tom.zhang@email.com', phone: '+1 (617) 555-0199', skills: ['Python', 'Pandas', 'NumPy', 'Matplotlib'], education: 'BS Math, Boston University', summary: 'Entry-level data scientist with strong foundations in Python and statistics. Seeking first industry role.', appliedDate: 'Apr 29, 2026' },
      { id: 15, name: 'Ana Pereira', initials: 'AP', color: '#94A3B8', experience: '1 year', location: 'Miami, FL', score: 52, status: 'New', email: 'ana.pereira@email.com', phone: '+1 (305) 555-0133', skills: ['Excel', 'SQL', 'Python basics'], education: 'BS Biology, University of Miami', summary: 'Career-switcher with one year of self-taught data skills. Completed two online ML courses.', appliedDate: 'Apr 28, 2026' },
    ],
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const CANDIDATE_STATUSES = ['New', 'In Review', 'Interview', 'Shortlisted', 'Rejected', 'Hired'];

const STATUS_COLORS = {
  Shortlisted: { bg: '#dcfce7', text: '#16a34a' },
  Interview:   { bg: '#dbeafe', text: '#1d4ed8' },
  'In Review': { bg: '#fef9c3', text: '#a16207' },
  New:         { bg: '#f3f4f6', text: '#374151' },
  Rejected:    { bg: '#fee2e2', text: '#dc2626' },
  Hired:       { bg: '#f0fdf4', text: '#15803d' },
};

const INVITE_COLORS = {
  not_sent: { bg: '#f3f4f6', text: '#374151', label: 'Not Sent' },
  sent:     { bg: '#dbeafe', text: '#1d4ed8', label: 'Invited' },
  accepted: { bg: '#dcfce7', text: '#16a34a', label: 'Accepted' },
  declined: { bg: '#fee2e2', text: '#dc2626', label: 'Declined' },
};

const scoreColor = (s) => s >= 85 ? '#16a34a' : s >= 70 ? '#d97706' : '#dc2626';
const screeningLabel = (s) => s >= 85 ? 'Pass' : s >= 70 ? 'Review' : 'Fail';
const screeningColors = {
  Pass:   { bg: '#dcfce7', text: '#16a34a' },
  Review: { bg: '#fef9c3', text: '#a16207' },
  Fail:   { bg: '#fee2e2', text: '#dc2626' },
};

// ─── Shared small components ──────────────────────────────────────────────────

function Badge({ label, colors }) {
  return (
    <span className="db-badge" style={{ background: colors.bg, color: colors.text }}>
      {label}
    </span>
  );
}

function ScoreCircle({ score, size = 44 }) {
  const fs = size < 44 ? '0.7rem' : '0.78rem';
  return (
    <div className="db-score-circle" style={{ width: size, height: size, background: scoreColor(score), fontSize: fs }}>
      {score}%
    </div>
  );
}

// ─── Dashboard Home ────────────────────────────────────────────────────────────

const RECENT_ACTIVITY = [
  { icon: <Users size={14} />,        color: '#3b82f6', text: '3 new applicants for Senior React Developer',   time: '30 min ago' },
  { icon: <Star size={14} />,         color: '#9333ea', text: 'Elena Volkov shortlisted for Data Scientist',   time: '2 hours ago' },
  { icon: <CalendarCheck size={14} />,color: '#0891b2', text: 'Ryan Park moved to Interview — UX/UI Designer', time: '4 hours ago' },
  { icon: <OctagonX size={14} />,     color: '#ef4444', text: 'Data Scientist closed to new applications',     time: 'Yesterday' },
  { icon: <CheckCircle2 size={14} />, color: '#16a34a', text: 'David Kim accepted interview invitation',       time: 'Yesterday' },
  { icon: <Briefcase size={14} />,    color: '#f97316', text: 'Product Manager job posting published',         time: '4 days ago' },
];

const PIPELINE = [
  { label: 'Applied',      value: 172, color: '#3b82f6', pct: 100 },
  { label: 'AI Screened',  value: 148, color: '#6366f1', pct: 82 },
  { label: 'Shortlisted',  value: 18,  color: '#8b5cf6', pct: 60 },
  { label: 'Interview',    value: 6,   color: '#0891b2', pct: 40 },
  { label: 'Hired',        value: 3,   color: '#16a34a', pct: 22 },
];

function DashboardHomeView({ jobs, user }) {
  const active  = jobs.filter(j => j.status === 'Active');
  const stopped = jobs.filter(j => j.status === 'Stopped');
  const totalApplicants  = jobs.reduce((s, j) => s + j.applicants, 0);
  const totalShortlisted = jobs.reduce((s, j) => s + j.shortlisted, 0);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  })();

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const kpis = [
    { label: 'Total Jobs',       value: jobs.length,       icon: <FileText size={20} />,    bg: '#eff6ff', color: '#3b82f6', sub: `${stopped.length} closed` },
    { label: 'Active Positions', value: active.length,     icon: <Briefcase size={20} />,   bg: '#f0fdf4', color: '#16a34a', sub: 'Open to applicants' },
    { label: 'Total Applicants', value: totalApplicants,   icon: <Users size={20} />,       bg: '#faf5ff', color: '#9333ea', sub: 'Across all jobs' },
    { label: 'Shortlisted',      value: totalShortlisted,  icon: <Star size={20} />,        bg: '#fff7ed', color: '#f97316', sub: 'Ready for review' },
    { label: 'Interviews',       value: 6,                 icon: <CalendarCheck size={20} />,bg: '#ecfdf5', color: '#059669', sub: 'Scheduled this week' },
    { label: 'Avg. Time to Fill',value: '14d',             icon: <Timer size={20} />,       bg: '#fef9c3', color: '#b45309', sub: 'Across active jobs' },
  ];

  return (
    <>
      {/* Welcome banner */}
      <div className="db-home-banner">
        <div>
          <div className="db-home-greeting">{greeting}, {user?.split(' ')[0]}! 👋</div>
          <div className="db-home-date">{today}</div>
        </div>
        <div className="db-home-banner-stat">
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#3b82f6' }}>{active.length}</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Active positions<br/>accepting applications</div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="db-home-kpis">
        {kpis.map(k => (
          <div className="db-kpi-card" key={k.label}>
            <div className="db-kpi-icon" style={{ background: k.bg, color: k.color }}>{k.icon}</div>
            <div>
              <div className="db-kpi-value">{k.value}</div>
              <div className="db-kpi-label">{k.label}</div>
              <div className="db-kpi-sub">{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column body */}
      <div className="db-home-grid">

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Hiring Pipeline */}
          <div className="db-home-card">
            <div className="db-home-card-header">
              <span className="db-home-card-title"><TrendingUp size={16} /> Hiring Pipeline</span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>All jobs combined</span>
            </div>
            <div className="db-pipeline">
              {PIPELINE.map((stage, i) => {
                const next = PIPELINE[i + 1];
                const conv = next ? Math.round((next.value / stage.value) * 100) : null;
                return (
                  <div key={stage.label} className="db-pipeline-row">
                    <div className="db-pipeline-label">
                      <span>{stage.label}</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{stage.value}</span>
                    </div>
                    <div className="db-pipeline-bar-bg">
                      <div
                        className="db-pipeline-bar-fill"
                        style={{ width: `${stage.pct}%`, background: stage.color }}
                      />
                    </div>
                    {conv !== null && (
                      <div className="db-pipeline-conv">
                        <span>↓ {conv}%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Job Performance */}
          <div className="db-home-card">
            <div className="db-home-card-header">
              <span className="db-home-card-title"><Activity size={16} /> Active Job Performance</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
              {active.map(job => {
                const pct = Math.min(Math.round((job.applicants / 60) * 100), 100);
                return (
                  <div key={job.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>{job.title}</div>
                        <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>{job.department} · {job.applicants} applicants · {job.shortlisted} shortlisted</div>
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#3b82f6' }}>{pct}%</span>
                    </div>
                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#3b82f6,#6366f1)', borderRadius: 99, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Candidate Status Breakdown */}
          <div className="db-home-card">
            <div className="db-home-card-header">
              <span className="db-home-card-title"><CircleDot size={16} /> Candidate Breakdown</span>
            </div>
            {[
              { label: 'Shortlisted', count: 18, color: '#16a34a', bg: '#dcfce7' },
              { label: 'Interview',   count: 6,  color: '#1d4ed8', bg: '#dbeafe' },
              { label: 'In Review',   count: 29, color: '#a16207', bg: '#fef9c3' },
              { label: 'New',         count: 47, color: '#374151', bg: '#f3f4f6' },
              { label: 'Rejected',    count: 72, color: '#dc2626', bg: '#fee2e2' },
            ].map(row => (
              <div key={row.label} className="db-breakdown-row">
                <span className="db-badge" style={{ background: row.bg, color: row.color, minWidth: 80, textAlign: 'center' }}>{row.label}</span>
                <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', margin: '0 10px' }}>
                  <div style={{ height: '100%', width: `${Math.round((row.count / 172) * 100)}%`, background: row.color, borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', minWidth: 26, textAlign: 'right' }}>{row.count}</span>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="db-home-card" style={{ flex: 1 }}>
            <div className="db-home-card-header">
              <span className="db-home-card-title"><Clock size={16} /> Recent Activity</span>
            </div>
            <div className="db-activity-list">
              {RECENT_ACTIVITY.map((item, i) => (
                <div className="db-activity-row" key={i}>
                  <div className="db-activity-dot" style={{ background: item.color }}>
                    <span style={{ color: '#fff' }}>{item.icon}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.4 }}>{item.text}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Posted Jobs List ─────────────────────────────────────────────────────────

function PostedJobsView({ jobs, onSelectJob }) {
  const [search, setSearch] = useState('');
  const active = jobs.filter(j => j.status === 'Active');
  const filtered = active.filter(j =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.department.toLowerCase().includes(search.toLowerCase())
  );
  const totalApplicants = active.reduce((s, j) => s + j.applicants, 0);
  const totalShortlisted = active.reduce((s, j) => s + j.shortlisted, 0);

  return (
    <>
      <div className="db-stats">
        {[
          { label: 'Active Positions', value: active.length, icon: <Briefcase size={20} />, bg: '#eff6ff', color: '#3b82f6' },
          { label: 'Total Applicants', value: totalApplicants, icon: <Users size={20} />, bg: '#f0fdf4', color: '#16a34a' },
          { label: 'Shortlisted', value: totalShortlisted, icon: <Star size={20} />, bg: '#faf5ff', color: '#9333ea' },
          { label: 'Jobs Posted', value: jobs.length, icon: <FileText size={20} />, bg: '#fff7ed', color: '#f97316' },
        ].map(s => (
          <div className="db-stat-card" key={s.label}>
            <div className="db-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div>
              <div className="db-stat-number">{s.value}</div>
              <div className="db-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="db-section-header">
        <span className="db-section-title">Active Job Postings</span>
        <div className="db-search-bar">
          <Search size={14} />
          <input placeholder="Search jobs…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="db-jobs-grid">
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: 48 }}>No active jobs match your search.</div>
        )}
        {filtered.map(job => (
          <div className="db-job-card" key={job.id} onClick={() => onSelectJob(job)}>
            <div className="db-job-icon"><Briefcase size={20} /></div>
            <div className="db-job-info">
              <div className="db-job-title">{job.title}</div>
              <div className="db-job-meta">
                <span className="db-job-meta-item"><Building2 size={12} />{job.department}</span>
                <span className="db-job-meta-item"><MapPin size={12} />{job.location}</span>
                <span className="db-job-meta-item"><Clock size={12} />{job.postedAgo}</span>
                <span className="db-job-meta-item">{job.type}</span>
              </div>
            </div>
            <div className="db-job-counts">
              <div className="db-job-count">
                <div className="db-job-count-num">{job.applicants}</div>
                <div className="db-job-count-label">Applicants</div>
              </div>
              <div className="db-job-count">
                <div className="db-job-count-num" style={{ color: '#16a34a' }}>{job.shortlisted}</div>
                <div className="db-job-count-label">Shortlisted</div>
              </div>
            </div>
            <span className="db-badge" style={{ background: '#dcfce7', color: '#16a34a' }}>Active</span>
            <ChevronRight size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Active Job Detail (candidates + Stop Job) ────────────────────────────────

function ActiveJobDetailView({ job, onBack, onStopJob, onSelectCandidate }) {
  const [confirmStop, setConfirmStop] = useState(false);

  return (
    <>
      {/* Job info card */}
      <div className="db-job-detail-card">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <div className="db-job-detail-title">{job.title}</div>
            <div className="db-job-detail-meta">
              <span className="db-job-meta-item"><Building2 size={13} />{job.department}</span>
              <span className="db-job-meta-item"><MapPin size={13} />{job.location}</span>
              <span className="db-job-meta-item"><Clock size={13} />Posted {job.postedAgo}</span>
              <span className="db-job-meta-item">{job.type}</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.65, margin: '10px 0 0' }}>
              {job.description}
            </p>
            <div className="db-job-detail-reqs">
              {job.requirements.map(r => <span className="db-req-tag" key={r}>{r}</span>)}
            </div>
          </div>

          {/* Stop Job button */}
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            {!confirmStop ? (
              <button className="db-btn-stop" onClick={() => setConfirmStop(true)}>
                <OctagonX size={15} /> Stop Job
              </button>
            ) : (
              <div className="db-confirm-stop">
                <p>Stop accepting new applications?</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="db-btn-ghost" onClick={() => setConfirmStop(false)}>Cancel</button>
                  <button className="db-btn-stop" onClick={() => onStopJob(job.id)}>
                    <OctagonX size={14} /> Yes, Stop
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Candidates */}
      <div className="db-section-header">
        <span className="db-section-title">
          Candidates
          <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
            ({job.candidates.length} total)
          </span>
        </span>
      </div>

      <div className="db-candidates-list">
        {job.candidates.map(c => (
          <div className="db-candidate-row" key={c.id} onClick={() => onSelectCandidate(c)}>
            <div className="db-candidate-avatar" style={{ background: c.color }}>{c.initials}</div>
            <div className="db-candidate-info">
              <div className="db-candidate-name">{c.name}</div>
              <div className="db-candidate-sub">{c.experience} experience · {c.location} · Applied {c.appliedDate}</div>
              <div className="db-candidate-skills">
                {c.skills.slice(0, 4).map(sk => <span className="db-skill-tag" key={sk}>{sk}</span>)}
                {c.skills.length > 4 && <span className="db-skill-tag">+{c.skills.length - 4}</span>}
              </div>
            </div>
            <ScoreCircle score={c.score} />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3b82f6', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '5px 12px', whiteSpace: 'nowrap' }}>
              View
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Candidate Profile ────────────────────────────────────────────────────────

function CandidateProfileView({ candidate: c, job, onBack }) {
  const [status, setStatus] = useState(c.status);
  return (
    <div className="db-profile-card">
      <div className="db-profile-header">
        <div className="db-profile-avatar-lg" style={{ background: c.color }}>{c.initials}</div>
        <div style={{ flex: 1 }}>
          <div className="db-profile-name">{c.name}</div>
          <div className="db-profile-role">{job.title} · Applied {c.appliedDate}</div>
          <div className="db-profile-header-meta">
            <span className="db-profile-header-meta-item"><MapPin size={13} />{c.location}</span>
            <span className="db-profile-header-meta-item"><Briefcase size={13} />{c.experience}</span>
          </div>
        </div>
        <div className="db-profile-score-lg">
          <div className="db-profile-score-circle" style={{ background: scoreColor(c.score) }}>{c.score}%</div>
          <div className="db-profile-score-label">AI Match Score</div>
        </div>
      </div>

      <div className="db-profile-body">
        <div>
          <div className="db-profile-section">
            <div className="db-profile-section-title">Summary</div>
            <p className="db-profile-summary">{c.summary}</p>
          </div>
          <div className="db-profile-section">
            <div className="db-profile-section-title">Skills</div>
            <div className="db-profile-skills">
              {c.skills.map(sk => <span className="db-profile-skill" key={sk}>{sk}</span>)}
            </div>
          </div>
          <div className="db-profile-section">
            <div className="db-profile-section-title">Education</div>
            <p style={{ fontSize: '0.88rem', color: '#374151' }}>{c.education}</p>
          </div>
        </div>
        <div>
          <div className="db-profile-section-title">Contact Info</div>
          <div className="db-profile-sidebar-card">
            {[{ icon: <Mail size={14} />, val: c.email }, { icon: <Phone size={14} />, val: c.phone }, { icon: <MapPin size={14} />, val: c.location }].map((r, i) => (
              <div className="db-contact-row" key={i}>
                <div className="db-contact-icon">{r.icon}</div>{r.val}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <div className="db-profile-section-title">Application Status</div>
            <div className="db-profile-sidebar-card">
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 6 }}>Current Status</div>
              <Badge label={status} colors={STATUS_COLORS[status] || { bg: '#f3f4f6', text: '#374151' }} />
              <select className="db-status-select" value={status} onChange={e => setStatus(e.target.value)}>
                {CANDIDATE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stopped Jobs List ────────────────────────────────────────────────────────

function StoppedJobsView({ jobs, onSelectJob }) {
  const stopped = jobs.filter(j => j.status === 'Stopped');
  return (
    <>
      <div className="db-section-header" style={{ marginBottom: 16 }}>
        <span className="db-section-title">Closed Positions</span>
        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
          {stopped.length} position{stopped.length !== 1 ? 's' : ''} closed to new applications
        </span>
      </div>

      {stopped.length === 0 && (
        <div className="db-placeholder">
          <OctagonX size={40} style={{ color: '#cbd5e1' }} />
          <h3>No Closed Positions</h3>
              <p>Jobs you close to new applications will appear here.</p>
        </div>
      )}

      <div className="db-jobs-grid">
        {stopped.map(job => (
          <div className="db-job-card db-job-card--stopped" key={job.id} onClick={() => onSelectJob(job)}>
            <div className="db-job-icon" style={{ background: '#fef2f2', color: '#ef4444' }}><OctagonX size={20} /></div>
            <div className="db-job-info">
              <div className="db-job-title">{job.title}</div>
              <div className="db-job-meta">
                <span className="db-job-meta-item"><Building2 size={12} />{job.department}</span>
                <span className="db-job-meta-item"><MapPin size={12} />{job.location}</span>
                <span className="db-job-meta-item">{job.type}</span>
              </div>
            </div>
            <div className="db-job-counts">
              <div className="db-job-count">
                <div className="db-job-count-num">{job.applicants}</div>
                <div className="db-job-count-label">Applicants</div>
              </div>
              <div className="db-job-count">
                <div className="db-job-count-num" style={{ color: '#16a34a' }}>{job.shortlisted}</div>
                <div className="db-job-count-label">Shortlisted</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
              <span className="db-badge" style={{ background: '#fee2e2', color: '#dc2626' }}>Stopped</span>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Click to manage</span>
            </div>
            <ChevronRight size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Stopped Job Detail (AI Screening + Interview Invites) ────────────────────

function StoppedJobDetailView({ job, inviteStatuses, onSendInvite }) {
  const [panel, setPanel] = useState('screening'); // 'screening' | 'invites'
  const [screeningDone, setScreeningDone] = useState(false);

  const sorted = [...job.candidates].sort((a, b) => b.score - a.score);
  const shortlisted = job.candidates.filter(c => c.score >= 85);

  const passCount  = sorted.filter(c => c.score >= 85).length;
  const reviewCount = sorted.filter(c => c.score >= 70 && c.score < 85).length;
  const failCount  = sorted.filter(c => c.score < 70).length;

  return (
    <>
      {/* Job info header */}
      <div className="db-job-detail-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div className="db-job-detail-title" style={{ margin: 0 }}>{job.title}</div>
              <span className="db-badge" style={{ background: '#fee2e2', color: '#dc2626' }}>Stopped</span>
            </div>
            <div className="db-job-detail-meta">
              <span className="db-job-meta-item"><Building2 size={13} />{job.department}</span>
              <span className="db-job-meta-item"><MapPin size={13} />{job.location}</span>
              <span className="db-job-meta-item">{job.type}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>{job.applicants}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Total Applicants</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#16a34a' }}>{shortlisted.length}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Qualified</div>
            </div>
          </div>
        </div>
      </div>

      {/* Panel tabs */}
      <div className="db-panel-tabs">
        <button
          className={`db-panel-tab${panel === 'screening' ? ' active' : ''}`}
          onClick={() => setPanel('screening')}
        >
          <Bot size={16} /> AI Resume Screening
        </button>
        <button
          className={`db-panel-tab${panel === 'invites' ? ' active' : ''}`}
          onClick={() => setPanel('invites')}
        >
          <SendHorizonal size={16} /> Send Interview Invites
        </button>
      </div>

      {/* ── AI Resume Screening panel ── */}
      {panel === 'screening' && (
        <div className="db-panel-card">
          <div className="db-panel-card-header">
            <div>
              <h3 className="db-panel-title"><Bot size={18} /> AI Resume Screening</h3>
              <p className="db-panel-desc">Candidates are automatically ranked by our AI against the job requirements.</p>
            </div>
            {!screeningDone && (
              <button className="db-btn-primary" onClick={() => setScreeningDone(true)}>
                <Bot size={15} /> Run Screening
              </button>
            )}
            {screeningDone && (
              <div className="db-screening-summary">
                <span style={{ color: '#16a34a' }}><CheckCircle2 size={14} /> {passCount} Pass</span>
                <span style={{ color: '#d97706' }}><AlertCircle size={14} /> {reviewCount} Review</span>
                <span style={{ color: '#dc2626' }}><XCircle size={14} /> {failCount} Fail</span>
              </div>
            )}
          </div>

          {!screeningDone ? (
            <div className="db-panel-empty">
              <Bot size={36} style={{ color: '#cbd5e1' }} />
              <p>Click <strong>Run Screening</strong> to analyse all {job.candidates.length} resumes against the job requirements.</p>
            </div>
          ) : (
            <div className="db-screening-table">
              <div className="db-screening-row db-screening-row--header">
                <span>Candidate</span>
                <span>Experience</span>
                <span>Key Skills</span>
                <span style={{ textAlign: 'center' }}>AI Score</span>
                <span style={{ textAlign: 'center' }}>Result</span>
              </div>
              {sorted.map(c => {
                const label = screeningLabel(c.score);
                const sc = screeningColors[label];
                return (
                  <div className="db-screening-row" key={c.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="db-candidate-avatar" style={{ background: c.color, width: 34, height: 34, fontSize: '0.75rem' }}>{c.initials}</div>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>{c.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.location}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.83rem', color: '#475569' }}>{c.experience}</span>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {c.skills.slice(0, 2).map(sk => <span className="db-skill-tag" key={sk}>{sk}</span>)}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <ScoreCircle score={c.score} size={38} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span className="db-badge" style={{ background: sc.bg, color: sc.text }}>{label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Interview Invites panel ── */}
      {panel === 'invites' && (
        <div className="db-panel-card">
          <div className="db-panel-card-header">
            <div>
              <h3 className="db-panel-title"><SendHorizonal size={18} /> Send Interview Invites</h3>
              <p className="db-panel-desc">Shortlisted candidates (AI score ≥ 85%) eligible for interview invitations.</p>
            </div>
            <button
              className="db-btn-primary"
              onClick={() => shortlisted.forEach(c => onSendInvite(job.id, c.id))}
            >
              <SendHorizonal size={15} /> Invite All
            </button>
          </div>

          {shortlisted.length === 0 ? (
            <div className="db-panel-empty">
              <UserCheck size={36} style={{ color: '#cbd5e1' }} />
              <p>No candidates meet the shortlist threshold for this job.</p>
            </div>
          ) : (
            <div className="db-invite-list">
              {shortlisted.map(c => {
                const inviteKey = `${job.id}-${c.id}`;
                const inv = inviteStatuses[inviteKey] || 'not_sent';
                const ic = INVITE_COLORS[inv];
                return (
                  <div className="db-invite-row" key={c.id}>
                    <div className="db-candidate-avatar" style={{ background: c.color, width: 38, height: 38, fontSize: '0.8rem' }}>{c.initials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{c.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{c.email} · {c.experience}</div>
                    </div>
                    <ScoreCircle score={c.score} size={38} />
                    <span className="db-badge" style={{ background: ic.bg, color: ic.text }}>{ic.label}</span>
                    {inv === 'not_sent' ? (
                      <button className="db-btn-invite" onClick={() => onSendInvite(job.id, c.id)}>
                        <SendHorizonal size={13} /> Send Invite
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748b' }}>
                        {inv === 'accepted' && <CheckCircle2 size={15} style={{ color: '#16a34a' }} />}
                        {inv === 'declined' && <XCircle size={15} style={{ color: '#dc2626' }} />}
                        {inv === 'sent' && <Clock3 size={15} style={{ color: '#3b82f6' }} />}
                        {inv === 'sent' ? 'Awaiting response' : inv === 'accepted' ? 'Confirmed' : 'Declined'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── Settings placeholder ─────────────────────────────────────────────────────

function SettingsView() {
  return (
    <div className="db-placeholder">
      <Settings size={44} style={{ color: '#cbd5e1' }} />
      <h3>Settings</h3>
      <p>Account preferences, team management, and notification settings — coming soon.</p>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard({ user, onLogout }) {
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [activeNav, setActiveNav] = useState('home');
  const [view, setView] = useState('list');           // 'list' | 'job-detail' | 'candidate'
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [inviteStatuses, setInviteStatuses] = useState({});

  const initials = user
    ? user.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleSelectJob = (job) => {
    setSelectedJob(job);
    setView('job-detail');
  };

  const handleSelectCandidate = (c) => {
    setSelectedCandidate(c);
    setView('candidate');
  };

  const handleStopJob = (jobId) => {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'Stopped' } : j));
    setView('list');
    setSelectedJob(null);
    // Switch to Stopped Jobs nav so user sees the result
    setActiveNav('stopped');
  };

  const handleSendInvite = (jobId, candidateId) => {
    const key = `${jobId}-${candidateId}`;
    setInviteStatuses(prev => ({ ...prev, [key]: 'sent' }));
  };

  const handleNavClick = (nav) => {
    setActiveNav(nav);
    setView('list');
    setSelectedJob(null);
    setSelectedCandidate(null);
  };

  // ── Topbar title ───────────────────────────────────────────────────────────

  const topbarTitle = () => {
    if (view === 'candidate') return selectedCandidate?.name;
    if (view === 'job-detail') return selectedJob?.title;
    if (activeNav === 'home') return 'Dashboard';
    if (activeNav === 'posted') return 'Posted Jobs';
    if (activeNav === 'stopped') return 'Closed Positions';
    return 'Settings';
  };

  const topbarSub = () => {
    if (view === 'candidate') return `${selectedJob?.title} · AI Score: ${selectedCandidate?.score}%`;
    if (view === 'job-detail' && activeNav === 'posted') return `${selectedJob?.applicants} applicants · ${selectedJob?.department}`;
    if (view === 'job-detail' && activeNav === 'stopped') return `${selectedJob?.candidates?.length} candidates · closed to new applications`;
    return null;
  };

  // ── Nav items ──────────────────────────────────────────────────────────────

  const navItems = [
    { id: 'home',    label: 'Dashboard',        icon: <LayoutDashboard size={16} /> },
    { id: 'posted',  label: 'Posted Jobs',       icon: <Briefcase size={16} /> },
    { id: 'stopped', label: 'Closed Positions',  icon: <OctagonX size={16} /> },
    { id: 'settings',label: 'Settings',          icon: <Settings size={16} /> },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="db-sidebar">
        <div className="db-sidebar-logo">
          <div className="db-sidebar-logo-icon"><Briefcase size={16} /></div>
          RecEasy
        </div>

        <div className="db-sidebar-nav">
          <div className="db-nav-section">Menu</div>
          {navItems.map(item => (
            <button
              key={item.id}
              className={`db-nav-item${activeNav === item.id ? ' active' : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        <div className="db-sidebar-footer">
          <div className="db-user-card">
            <div className="db-user-avatar">{initials}</div>
            <div className="db-user-info">
              <div className="db-user-name">{user}</div>
              <div className="db-user-role">Recruiter</div>
            </div>
            <button className="db-logout-btn" onClick={onLogout} title="Sign out">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="db-main">
        {/* Topbar */}
        <div className="db-topbar">
          <div>
            <div className="db-topbar-title">{topbarTitle()}</div>
            {topbarSub() && <div className="db-topbar-subtitle">{topbarSub()}</div>}
          </div>
          <div className="db-topbar-actions">
            {view === 'candidate' && (
              <button className="db-back-btn" onClick={() => { setSelectedCandidate(null); setView('job-detail'); }}>
                <ArrowLeft size={14} /> Back to Candidates
              </button>
            )}
            {view === 'job-detail' && (
              <button className="db-back-btn" onClick={() => { setSelectedJob(null); setView('list'); }}>
                <ArrowLeft size={14} /> Back to Jobs
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="db-content">
          {/* Home */}
          {activeNav === 'home' && (
            <DashboardHomeView jobs={jobs} user={user} />
          )}

          {/* Posted Jobs */}
          {activeNav === 'posted' && view === 'list' && (
            <PostedJobsView jobs={jobs} onSelectJob={handleSelectJob} />
          )}
          {activeNav === 'posted' && view === 'job-detail' && selectedJob && (
            <ActiveJobDetailView
              job={selectedJob}
              onBack={() => { setSelectedJob(null); setView('list'); }}
              onStopJob={handleStopJob}
              onSelectCandidate={handleSelectCandidate}
            />
          )}
          {activeNav === 'posted' && view === 'candidate' && selectedCandidate && (
            <CandidateProfileView candidate={selectedCandidate} job={selectedJob} />
          )}

          {/* Stopped Jobs */}
          {activeNav === 'stopped' && view === 'list' && (
            <StoppedJobsView jobs={jobs} onSelectJob={handleSelectJob} />
          )}
          {activeNav === 'stopped' && view === 'job-detail' && selectedJob && (
            <StoppedJobDetailView
              job={selectedJob}
              inviteStatuses={inviteStatuses}
              onSendInvite={handleSendInvite}
            />
          )}

          {/* Settings */}
          {activeNav === 'settings' && <SettingsView />}
        </div>
      </div>
    </div>
  );
}
