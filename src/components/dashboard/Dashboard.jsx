import { useState, useRef, useEffect } from 'react';
import {
  Briefcase, LogOut, ArrowLeft, MapPin, Mail, Phone,
  ChevronRight, OctagonX, Bot, SendHorizonal,
  CheckCircle2, XCircle, Clock3, FileText, LayoutDashboard,
  Plus, X, ExternalLink, GraduationCap, DollarSign,
  Calendar, Laptop, Building, Globe, Filter, Search,
  Settings, Link, AlertTriangle, Eye, EyeOff, Trash2,
  MoreVertical, UserCheck,
} from 'lucide-react';

import { api } from '../../api';

function GithubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}
import './Dashboard.css';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const INITIAL_JOBS = []; // Data now comes from API

// ─── Constants / helpers ──────────────────────────────────────────────────────

const WORK_TYPE_LABELS = { remote: 'Remote', 'on-site': 'On-site', hybrid: 'Hybrid' };
const WORK_TYPE_ICONS = {
  remote: <Laptop size={13} />,
  'on-site': <Building size={13} />,
  hybrid: <Globe size={13} />,
};

// Education levels in ascending order — selecting a level means "this level or higher"
const EDUCATION_LEVELS = ["All", "High School", "Bachelor's", "Master's", "PhD"];
const EDU_ORDER = ["High School", "Bachelor's", "Master's", "PhD"];

// Experience as minimum thresholds — selecting "3+ yrs" shows everyone with >= 3 years
const EXP_RANGES = [
  { label: 'Any',     min: 0  },
  { label: '1+ yrs',  min: 1  },
  { label: '3+ yrs',  min: 3  },
  { label: '5+ yrs',  min: 5  },
  { label: '7+ yrs',  min: 7  },
  { label: '10+ yrs', min: 10 },
];
// Salary filter options are built dynamically per-job using the job's salaryMin/salaryMax

const scoreColor = (s) => s >= 85 ? '#16a34a' : s >= 70 ? '#d97706' : '#dc2626';

function computeCountdown(iso) {
  if (!iso) return null;
  const diff = new Date(iso) - Date.now();
  if (diff <= 0) return 'Closed';
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const secs = totalSec % 60;
  return `${days}d ${hours}h ${secs}s`;
}

function useCountdown(iso) {
  const [label, setLabel] = useState(() => computeCountdown(iso));
  useEffect(() => {
    if (!iso) return;
    const id = setInterval(() => setLabel(computeCountdown(iso)), 1000);
    return () => clearInterval(id);
  }, [iso]);
  return label;
}

// ─── Shared components ────────────────────────────────────────────────────────

function ScoreCircle({ score, size = 44 }) {
  const display = typeof score === 'number' ? (Number.isInteger(score) ? score : score.toFixed(1)) : score;
  return (
    <div
      className="db-score-circle"
      style={{ width: size, height: size, background: '#0284c7', fontSize: size < 44 ? '0.7rem' : '0.78rem' }}
    >
      {display}%
    </div>
  );
}

// ─── Create Job Modal ─────────────────────────────────────────────────────────

function CreateJobModal({ onClose, onCreate, onGoToSettings, linkedinConfigured }) {
  const [form, setForm] = useState({
    positionName: '',
    description: '',
    requiredSkills: [],
    skillInput: '',
    customQuestions: [],
    questionInput: '',
    minYearsExperience: '',
    salaryMin: '',
    salaryMax: '',
    workType: 'remote',
    location: '',
    platforms: ['linkedin'],
    closingDays: 7,
    closingHours: 0,
    closingSecs: 0,
    interviewDays: 7,
    interviewHours: 0,
    interviewSecs: 0,
  });
  const [errors, setErrors] = useState({});

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const addSkill = () => {
    const sk = form.skillInput.trim();
    if (sk && !form.requiredSkills.includes(sk)) {
      set('requiredSkills', [...form.requiredSkills, sk]);
    }
    set('skillInput', '');
  };

  const removeSkill = (sk) =>
    set('requiredSkills', form.requiredSkills.filter(s => s !== sk));

  const addQuestion = () => {
    const q = form.questionInput.trim();
    if (q && !form.customQuestions.includes(q)) {
      set('customQuestions', [...form.customQuestions, q]);
    }
    set('questionInput', '');
  };

  const removeQuestion = (q) =>
    set('customQuestions', form.customQuestions.filter(x => x !== q));

  const validate = () => {
    const e = {};
    if (!form.positionName.trim())   e.positionName = 'Required';
    if (!form.description.trim())    e.description  = 'Required';
    if (form.requiredSkills.length === 0) e.requiredSkills = 'Add at least one skill';
    if (!form.minYearsExperience || isNaN(Number(form.minYearsExperience)))
      e.minYearsExperience = 'Enter a valid number';
    if (!form.salaryMin || isNaN(Number(form.salaryMin)))
      e.salaryMin = 'Enter a valid amount';
    if (!form.salaryMax || isNaN(Number(form.salaryMax)))
      e.salaryMax = 'Enter a valid amount';
    if (Number(form.salaryMin) > Number(form.salaryMax))
      e.salaryMax = 'Max must be ≥ min';
    if (!form.location.trim())       e.location = 'Required';
    if (form.platforms.includes('linkedin') && !linkedinConfigured)
      e.platforms = 'LinkedIn token not configured. Please set it up in Settings first.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const closingTotalSecs =
      Number(form.closingDays) * 86400 +
      Number(form.closingHours) * 3600 +
      Number(form.closingSecs);
    const deadlineDate = new Date(Date.now() + closingTotalSecs * 1000);

    const interviewTotalSecs =
      Number(form.interviewDays) * 86400 +
      Number(form.interviewHours) * 3600 +
      Number(form.interviewSecs);
    // backend stores as days (float) — timedelta(days=x) handles fractional days fine
    const interviewDeadlineDays = interviewTotalSecs / 86400;

    onCreate({
      positionName: form.positionName.trim(),
      description: form.description.trim(),
      requiredSkills: form.requiredSkills,
      customQuestions: form.customQuestions,
      minYearsExperience: Number(form.minYearsExperience),
      salaryMin: Number(form.salaryMin),
      salaryMax: Number(form.salaryMax),
      workType: form.workType,
      location: form.location.trim(),
      platforms: form.platforms,
      applicationDeadline: deadlineDate.toISOString(),
      interviewDeadlineDays,
    });
  };

  return (
    <div className="db-modal-overlay" onClick={onClose}>
      <div className="db-modal" onClick={e => e.stopPropagation()}>
        <div className="db-modal-header">
          <h2 className="db-modal-title">
            <Briefcase size={18} /> Create Job
          </h2>
          <button className="db-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="db-modal-body">
          <form onSubmit={handleSubmit}>

            {/* Position Name */}
            <div className="db-form-group">
              <label className="db-form-label">
                Position Name <span className="db-form-req">*</span>
              </label>
              <input
                className={`db-form-input${errors.positionName ? ' db-input-error' : ''}`}
                placeholder="e.g. Senior React Developer"
                value={form.positionName}
                onChange={e => set('positionName', e.target.value)}
              />
              {errors.positionName && <span className="db-form-error">{errors.positionName}</span>}
            </div>

            {/* Job Description */}
            <div className="db-form-group">
              <label className="db-form-label">
                Job Description <span className="db-form-req">*</span>
              </label>
              <textarea
                className={`db-form-textarea${errors.description ? ' db-input-error' : ''}`}
                placeholder="Describe the role, responsibilities, and what you're looking for..."
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={4}
              />
              {errors.description && <span className="db-form-error">{errors.description}</span>}
            </div>

            {/* Required Skills */}
            <div className="db-form-group">
              <label className="db-form-label">
                Required Skills <span className="db-form-req">*</span>
              </label>
              <div className="db-skills-input-row">
                <input
                  className="db-form-input"
                  style={{ flex: 1 }}
                  placeholder="Type a skill and press Add or Enter"
                  value={form.skillInput}
                  onChange={e => set('skillInput', e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                />
                <button type="button" className="db-btn-primary" style={{ padding: '9px 16px' }} onClick={addSkill}>
                  Add
                </button>
              </div>
              {form.requiredSkills.length > 0 && (
                <div className="db-skills-tags">
                  {form.requiredSkills.map(sk => (
                    <span key={sk} className="db-skill-tag-removable">
                      {sk}
                      <button type="button" onClick={() => removeSkill(sk)}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {errors.requiredSkills && <span className="db-form-error">{errors.requiredSkills}</span>}
            </div>

            {/* Custom Questions */}
            <div className="db-form-group">
              <label className="db-form-label">
                Custom Interview Questions (Optional)
              </label>
              <div className="db-skills-input-row">
                <input
                  className="db-form-input"
                  style={{ flex: 1 }}
                  placeholder="Type a question and press Add or Enter"
                  value={form.questionInput}
                  onChange={e => set('questionInput', e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addQuestion(); } }}
                />
                <button type="button" className="db-btn-primary" style={{ padding: '9px 16px' }} onClick={addQuestion}>
                  Add
                </button>
              </div>
              {form.customQuestions.length > 0 && (
                <div className="db-skills-tags">
                  {form.customQuestions.map(q => (
                    <span key={q} className="db-skill-tag-removable" style={{ background: '#f1f5f9', color: '#334155' }}>
                      {q}
                      <button type="button" onClick={() => removeQuestion(q)}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Experience + Work Type */}
            <div className="db-form-row">
              <div className="db-form-group" style={{ flex: 1 }}>
                <label className="db-form-label">
                  Min. Years of Experience <span className="db-form-req">*</span>
                </label>
                <input
                  className={`db-form-input${errors.minYearsExperience ? ' db-input-error' : ''}`}
                  type="number" min="0" placeholder="e.g. 3"
                  value={form.minYearsExperience}
                  onChange={e => set('minYearsExperience', e.target.value)}
                />
                {errors.minYearsExperience && <span className="db-form-error">{errors.minYearsExperience}</span>}
              </div>
              <div className="db-form-group" style={{ flex: 1 }}>
                <label className="db-form-label">
                  Work Type <span className="db-form-req">*</span>
                </label>
                <select
                  className="db-form-select"
                  value={form.workType}
                  onChange={e => set('workType', e.target.value)}
                >
                  <option value="remote">Remote</option>
                  <option value="on-site">On-site</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            {/* Salary Range */}
            <div className="db-form-group">
              <label className="db-form-label">
                Salary Range (PKR / month) <span className="db-form-req">*</span>
              </label>
              <div className="db-form-row">
                <div style={{ flex: 1 }}>
                  <input
                    className={`db-form-input${errors.salaryMin ? ' db-input-error' : ''}`}
                    type="number" min="0" placeholder="Min e.g. 100000"
                    value={form.salaryMin}
                    onChange={e => set('salaryMin', e.target.value)}
                  />
                  {errors.salaryMin && <span className="db-form-error">{errors.salaryMin}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', color: '#94a3b8', fontWeight: 600 }}>–</div>
                <div style={{ flex: 1 }}>
                  <input
                    className={`db-form-input${errors.salaryMax ? ' db-input-error' : ''}`}
                    type="number" min="0" placeholder="Max e.g. 250000"
                    value={form.salaryMax}
                    onChange={e => set('salaryMax', e.target.value)}
                  />
                  {errors.salaryMax && <span className="db-form-error">{errors.salaryMax}</span>}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="db-form-group">
              <label className="db-form-label">
                Location <span className="db-form-req">*</span>
              </label>
              <input
                className={`db-form-input${errors.location ? ' db-input-error' : ''}`}
                placeholder="e.g. San Francisco, CA"
                value={form.location}
                onChange={e => set('location', e.target.value)}
              />
              {errors.location && <span className="db-form-error">{errors.location}</span>}
            </div>

            {/* Closing Timeline */}
            <div className="db-form-group">
              <label className="db-form-label">
                <Calendar size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Job Closing Timeline <span className="db-form-req">*</span>
              </label>
              <div className="db-dhs-row">
                <div className="db-dhs-field">
                  <input
                    className="db-form-input db-dhs-input"
                    type="number" min="0" max="365"
                    value={form.closingDays}
                    onChange={e => set('closingDays', e.target.value)}
                  />
                  <span className="db-dhs-label">Days</span>
                </div>
                <div className="db-dhs-sep">:</div>
                <div className="db-dhs-field">
                  <input
                    className="db-form-input db-dhs-input"
                    type="number" min="0" max="23"
                    value={form.closingHours}
                    onChange={e => set('closingHours', e.target.value)}
                  />
                  <span className="db-dhs-label">Hours</span>
                </div>
                <div className="db-dhs-sep">:</div>
                <div className="db-dhs-field">
                  <input
                    className="db-form-input db-dhs-input"
                    type="number" min="0" max="59"
                    value={form.closingSecs}
                    onChange={e => set('closingSecs', e.target.value)}
                  />
                  <span className="db-dhs-label">Seconds</span>
                </div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 6, display: 'block' }}>
                Job closes automatically after this duration. You will be notified by email.
              </span>
            </div>

            {/* Interview Deadline */}
            <div className="db-form-group">
              <label className="db-form-label">
                Interview Deadline
              </label>
              <div className="db-dhs-row">
                <div className="db-dhs-field">
                  <input
                    className="db-form-input db-dhs-input"
                    type="number" min="0" max="60"
                    value={form.interviewDays}
                    onChange={e => set('interviewDays', e.target.value)}
                  />
                  <span className="db-dhs-label">Days</span>
                </div>
                <div className="db-dhs-sep">:</div>
                <div className="db-dhs-field">
                  <input
                    className="db-form-input db-dhs-input"
                    type="number" min="0" max="23"
                    value={form.interviewHours}
                    onChange={e => set('interviewHours', e.target.value)}
                  />
                  <span className="db-dhs-label">Hours</span>
                </div>
                <div className="db-dhs-sep">:</div>
                <div className="db-dhs-field">
                  <input
                    className="db-form-input db-dhs-input"
                    type="number" min="0" max="59"
                    value={form.interviewSecs}
                    onChange={e => set('interviewSecs', e.target.value)}
                  />
                  <span className="db-dhs-label">Seconds</span>
                </div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 6, display: 'block' }}>
                Time candidates have to complete their AI interview after receiving the invite.
              </span>
            </div>

            {/* Platforms */}
            <div className="db-form-group">
              <label className="db-form-label">Platforms to Post On</label>
              <div className="db-platform-checks">
                <label className="db-platform-check">
                  <input
                    type="checkbox"
                    checked={form.platforms.includes('linkedin')}
                    onChange={e => {
                      if (e.target.checked) set('platforms', [...form.platforms, 'linkedin']);
                      else set('platforms', form.platforms.filter(p => p !== 'linkedin'));
                    }}
                  />
                  <span className="db-platform-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#0A66C2">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    LinkedIn
                    {form.platforms.includes('linkedin') && (
                      linkedinConfigured
                        ? <span style={{ marginLeft: 6, color: '#16a34a', fontSize: '0.72rem', fontWeight: 600 }}>✓ Connected</span>
                        : <span style={{ marginLeft: 6, color: '#dc2626', fontSize: '0.72rem', fontWeight: 600 }}>⚠ Not configured</span>
                    )}
                  </span>
                </label>
              </div>
              {form.platforms.includes('linkedin') && !linkedinConfigured && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '8px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: '0.78rem', color: '#b91c1c' }}>
                  <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                  LinkedIn token not set.{' '}
                  <button
                    type="button"
                    onClick={() => { onClose(); onGoToSettings(); }}
                    style={{ color: '#2563eb', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
                  >
                    Configure it in Settings
                  </button>
                </div>
              )}
              {errors.platforms && <span className="db-form-error">{errors.platforms}</span>}
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 6 }}>
                More platforms coming soon.
              </div>
            </div>

            <div className="db-modal-footer">
              <button type="button" className="db-btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="db-btn-primary">
                <Briefcase size={14} /> Post Job
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Settings View ────────────────────────────────────────────────────────────

function SettingsView({ linkedinConfigured, onSave, onRemove }) {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [localConfigured, setLocalConfigured] = useState(linkedinConfigured);

  const handleSave = async () => {
    if (!token.trim()) return;
    setSaving(true);
    try {
      await onSave(token.trim());
      setLocalConfigured(true);
      setToken('');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await onRemove();
      setLocalConfigured(false);
      setToken('');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Settings</div>
        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Manage your integrations and account preferences.</div>
      </div>

      {/* LinkedIn Integration Card */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#0A66C2">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>LinkedIn Integration</span>
          {localConfigured
            ? <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '2px 10px' }}>
                <CheckCircle2 size={12} /> Connected
              </span>
            : <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 20, padding: '2px 10px' }}>
                <AlertTriangle size={12} /> Not configured
              </span>
          }
        </div>
        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '8px 0 20px' }}>
          Paste your LinkedIn OAuth access token below to enable automatic job posting to LinkedIn when you create a new job.
        </p>

        {localConfigured && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
            <CheckCircle2 size={15} style={{ color: '#16a34a', flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', color: '#15803d', flex: 1 }}>
              A LinkedIn token is currently saved. You can replace it or remove it below.
            </span>
            <button
              onClick={handleRemove}
              disabled={removing}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: '#dc2626', background: 'none', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 500 }}
            >
              <Trash2 size={12} />
              {removing ? 'Removing...' : 'Remove'}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type={showToken ? 'text' : 'password'}
              placeholder={localConfigured ? 'Paste new token to replace…' : 'Paste your LinkedIn access token…'}
              value={token}
              onChange={e => setToken(e.target.value)}
              style={{ width: '100%', padding: '9px 38px 9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', background: '#f8fafc' }}
            />
            <button
              type="button"
              onClick={() => setShowToken(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
            >
              {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !token.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: token.trim() ? '#0284c7' : '#e2e8f0', color: token.trim() ? '#fff' : '#94a3b8', border: 'none', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: token.trim() ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
          >
            {saving ? 'Saving…' : localConfigured ? 'Update Token' : 'Save Token'}
          </button>
        </div>

        <div style={{ marginTop: 14, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.6 }}>
          <strong style={{ color: '#475569' }}>How to get your token:</strong> Go to the{' '}
          <a href="https://www.linkedin.com/developers/" target="_blank" rel="noreferrer" style={{ color: '#0284c7' }}>LinkedIn Developer Portal</a>,
          create an app, and generate an OAuth 2.0 access token with <code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: 4 }}>w_member_social</code> scope.
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Home ────────────────────────────────────────────────────────────

function DashboardHomeView({ jobs, user, onCreateJob, onSelectJob, onDeleteJob }) {
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  })();
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const openCount   = jobs.filter(j => j.status === 'open').length;
  const closedCount = jobs.filter(j => j.status === 'closed').length;

  const [menuJobId, setMenuJobId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name, candidateCount }

  const openMenu = (e, job) => {
    e.stopPropagation();
    setMenuJobId(prev => prev === job.id ? null : job.id);
  };

  const confirmDelete = (e, job) => {
    e.stopPropagation();
    setMenuJobId(null);
    setDeleteTarget({ id: job.id, name: job.positionName, candidateCount: job.candidates.length });
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) onDeleteJob(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <>
      {/* Welcome Banner */}
      <div className="db-home-banner">
        <div>
          <div className="db-home-greeting">{greeting}, {user?.split(' ')[0]}! 👋</div>
          <div className="db-home-date">{today}</div>
        </div>
        <div className="db-home-banner-stats">
          <div className="db-home-banner-stat">
            <div className="db-home-banner-stat-num" style={{ color: '#4ade80' }}>{openCount}</div>
            <div className="db-home-banner-stat-label">Open Positions</div>
          </div>
          <div className="db-home-banner-divider" />
          <div className="db-home-banner-stat">
            <div className="db-home-banner-stat-num" style={{ color: '#f87171' }}>{closedCount}</div>
            <div className="db-home-banner-stat-label">Closed</div>
          </div>
        </div>
      </div>

      {/* Jobs section header */}
      <div className="db-section-header" style={{ marginBottom: 16 }}>
        <span className="db-section-title">Job Postings</span>
        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
          {jobs.length} total
        </span>
      </div>

      {/* Grid: Create card + Job cards */}
      <div className="db-dash-jobs-grid">
        {/* Create Job Card */}
        <div className="db-create-job-card" onClick={onCreateJob}>
          <div className="db-create-job-icon">
            <Plus size={30} />
          </div>
          <div className="db-create-job-label">Create Job</div>
          <div className="db-create-job-sub">Post a new position</div>
        </div>

        {/* Job Cards */}
        {jobs.map(job => (
          <div className="db-dash-job-card" key={job.id} onClick={() => { setMenuJobId(null); onSelectJob(job); }}
            style={{ position: 'relative' }}
          >
            <div className="db-dash-job-card-top">
              <div className="db-dash-job-icon">
                <Briefcase size={18} />
              </div>
              <span
                className="db-badge"
                style={
                  job.status === 'open'
                    ? { background: '#dcfce7', color: '#16a34a' }
                    : { background: '#fee2e2', color: '#dc2626' }
                }
              >
                {job.status === 'open' ? '● Open' : '● Closed'}
              </span>
              {/* Three-dot menu */}
              <button
                className="db-job-menu-btn"
                onClick={e => openMenu(e, job)}
                title="More options"
              >
                <MoreVertical size={15} />
              </button>
              {menuJobId === job.id && (
                <div className="db-job-menu-dropdown" onClick={e => e.stopPropagation()}>
                  <button className="db-job-menu-item db-job-menu-item--danger" onClick={e => confirmDelete(e, job)}>
                    <Trash2 size={13} /> Delete Job
                  </button>
                </div>
              )}
            </div>

            <div className="db-dash-job-name">{job.positionName}</div>

            <div className="db-dash-job-meta">
              <span className="db-job-meta-item">
                <MapPin size={11} />{job.location}
              </span>
              <span className="db-job-meta-item">
                {WORK_TYPE_ICONS[job.workType]}{WORK_TYPE_LABELS[job.workType]}
              </span>
            </div>

            <div className="db-dash-job-stats">
              <div>
                <div className="db-dash-job-stat-num">{job.candidates.length}</div>
                <div className="db-dash-job-stat-label">Candidates</div>
              </div>
              <div>
                <div className="db-dash-job-stat-num">{job.minYearsExperience}+</div>
                <div className="db-dash-job-stat-label">Yrs Req.</div>
              </div>
            </div>

            <div className="db-dash-job-footer">
              <span className="db-dash-job-posted">
                <Calendar size={11} /> {job.postedAt}
              </span>
              <ChevronRight size={14} style={{ color: '#94a3b8' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="db-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="db-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="db-modal-header">
              <h2 className="db-modal-title" style={{ color: '#dc2626' }}>
                <Trash2 size={17} /> Delete Job
              </h2>
              <button className="db-modal-close" onClick={() => setDeleteTarget(null)}><X size={18} /></button>
            </div>
            <div className="db-modal-body" style={{ padding: '20px 24px' }}>
              <p style={{ marginBottom: 10, color: '#1e293b', fontSize: '0.95rem' }}>
                Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>?
              </p>
              <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.55 }}>
                ⚠ This will permanently delete the job and all{' '}
                <strong>{deleteTarget.candidateCount}</strong> associated candidate
                {deleteTarget.candidateCount !== 1 ? 's' : ''}. This action cannot be undone.
              </p>
            </div>
            <div className="db-modal-footer">
              <button className="db-btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={handleDeleteConfirm}
              >
                <Trash2 size={14} /> Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Job Detail View ──────────────────────────────────────────────────────────

// Helper to apply filters to a candidate list
function applyFilters(candidates, filters, job) {
  const expMin = EXP_RANGES[filters.expRange].min;
  return candidates.filter(c => {
    // Education: minimum level — candidate must be at this level or higher
    if (filters.education !== 'All') {
      const requiredIdx  = EDU_ORDER.indexOf(filters.education);
      const candidateIdx = EDU_ORDER.indexOf(c.educationLevel);
      if (candidateIdx < requiredIdx) return false;
    }
    // Experience: minimum threshold
    if (c.yearsOfExperience < expMin) return false;
    // Salary vs job range
    if (filters.salary === 'within' && c.salaryExpectation > job.salaryMax) return false;
    if (filters.salary === 'above'  && c.salaryExpectation <= job.salaryMax) return false;
    // Negotiable
    if (filters.negotiable !== 'All') {
      if (c.salaryNegotiable !== (filters.negotiable === 'Yes')) return false;
    }
    // Work type comfort
    if (filters.workTypeComfort !== 'All') {
      if (c.comfortableWithWorkType !== (filters.workTypeComfort === 'Yes')) return false;
    }
    return true;
  });
}

function JobDetailView({ job, onCloseJob, onRunAIScoring, onSendInvites, onSendCandidateInvite, onSelectCandidate }) {
  const [confirmClose, setConfirmClose] = useState(false);
  const [aiRunning, setAiRunning]       = useState(false);
  const [inviteCount, setInviteCount]   = useState(1);
  const [invitingId, setInvitingId]     = useState(null);
  const closingCountdown = useCountdown(job.applicationDeadline);
  const [filters, setFilters] = useState({
    education:       'All',
    expRange:        0,
    salary:          'all',   // 'all' | 'within' | 'above'
    negotiable:      'All',
    workTypeComfort: 'All',
  });

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  let candidates = [...job.candidates];
  if (job.aiScoringDone) candidates.sort((a, b) => b.aiScore - a.aiScore);

  // Visual filtering — always applies
  candidates = applyFilters(candidates, filters, job);

  // For the invite count max, only count candidates who were actually AI-scored
  const scoredCandidates = job.candidates.filter(c => c.aiScore !== null);

  const handleRunAI = async () => {
    setAiRunning(true);
    await onRunAIScoring(job.id, filters);
    setAiRunning(false);
  };

  return (
    <>
      {/* Job Info Card */}
      <div className="db-job-detail-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div className="db-job-detail-title" style={{ margin: 0 }}>{job.positionName}</div>
              <span
                className="db-badge"
                style={
                  job.status === 'open'
                    ? { background: '#dcfce7', color: '#16a34a' }
                    : { background: '#fee2e2', color: '#dc2626' }
                }
              >
                {job.status === 'open' ? '● Open' : '● Closed'}
              </span>
            </div>
            <div className="db-job-detail-meta">
              <span className="db-job-meta-item"><MapPin size={13} />{job.location}</span>
              <span className="db-job-meta-item">
                {WORK_TYPE_ICONS[job.workType]}{WORK_TYPE_LABELS[job.workType]}
              </span>
              <span className="db-job-meta-item">
                <Briefcase size={13} />{job.minYearsExperience}+ yrs exp
              </span>
              {job.salaryMin && job.salaryMax && (
                <span className="db-job-meta-item">
                  <DollarSign size={13} />PKR {job.salaryMin.toLocaleString()} – {job.salaryMax.toLocaleString()}/mo
                </span>
              )}
              <span className="db-job-meta-item">
                <Calendar size={13} />Posted {job.postedAt}
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.65, margin: '10px 0' }}>
              {job.description}
            </p>
            <div className="db-job-detail-reqs">
              {job.requiredSkills.map(r => (
                <span className="db-req-tag" key={r}>{r}</span>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: '0.77rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
              Posted on:
              {job.linkedin_url ? (
                <a href={job.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, color: '#0A66C2', textDecoration: 'none' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#0A66C2">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                </a>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, color: '#0A66C2' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#0A66C2">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                </span>
              )}
            </div>

            {/* Apply link + deadline */}
            {job.applicationFormUrl && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.77rem', color: '#64748b', fontWeight: 600, flexShrink: 0 }}>
                  <ExternalLink size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Apply at:
                </span>
                <a
                  href={job.applicationFormUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.77rem', color: '#0284c7', fontWeight: 500, wordBreak: 'break-all', flex: 1 }}
                >
                  {job.applicationFormUrl}
                </a>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(job.applicationFormUrl)}
                  style={{ fontSize: '0.72rem', padding: '3px 10px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', flexShrink: 0 }}
                >
                  Copy
                </button>
                {job.applicationDeadline && (
                  <span style={{ fontSize: '0.72rem', color: job.status === 'open' && closingCountdown !== 'Closed' ? '#d97706' : '#94a3b8', fontWeight: 600, flexShrink: 0 }}>
                    <Calendar size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                    {job.status === 'open' && closingCountdown && closingCountdown !== 'Closed'
                      ? `Closes in ${closingCountdown}`
                      : `Closed ${new Date(job.applicationDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Panel */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end', minWidth: 200 }}>
            {/* Close Job */}
            {job.status === 'open' && !confirmClose && (
              <button className="db-btn-stop" onClick={() => setConfirmClose(true)}>
                <OctagonX size={14} /> Close Job
              </button>
            )}
            {job.status === 'open' && confirmClose && (
              <div className="db-confirm-stop">
                <p>Close this job to new applications?</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="db-btn-ghost" onClick={() => setConfirmClose(false)}>Cancel</button>
                  <button className="db-btn-stop" onClick={() => onCloseJob(job.id)}>
                    Yes, Close
                  </button>
                </div>
              </div>
            )}

            {/* AI Scoring */}
            {job.status === 'closed' && !job.aiScoringDone && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                <div className="db-filter-note">
                  Active filters will determine which candidates are scored
                </div>
                <button className="db-btn-primary" onClick={handleRunAI} disabled={aiRunning}>
                  <Bot size={14} /> {aiRunning ? 'Running AI…' : 'Run AI Scoring'}
                </button>
              </div>
            )}

            {/* Send Invites */}
            {job.status === 'closed' && job.aiScoringDone && !job.invitesSent && (
              <div className="db-invite-controls">
                <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600, marginBottom: 2 }}>
                  Top candidates to invite
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 8 }}>
                  From {scoredCandidates.length} scored candidate{scoredCandidates.length !== 1 ? 's' : ''}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number" min={1} max={scoredCandidates.length}
                    className="db-form-input"
                    style={{ width: 64, textAlign: 'center', padding: '7px' }}
                    value={inviteCount}
                    onChange={e =>
                      setInviteCount(Math.max(1, Math.min(scoredCandidates.length, Number(e.target.value))))
                    }
                  />
                  <button
                    className="db-btn-primary"
                    onClick={() => onSendInvites(job.id, inviteCount)}
                  >
                    <SendHorizonal size={14} /> Send Invites
                  </button>
                </div>
              </div>
            )}

            {job.invitesSent && (
              <span className="db-badge" style={{ background: '#dcfce7', color: '#16a34a', padding: '7px 14px', fontSize: '0.8rem' }}>
                <CheckCircle2 size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                Invites Sent
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="db-filter-bar">
        <div className="db-filter-bar-inner">
          <div className="db-filter-group">
            <span className="db-filter-label"><Filter size={11} /> Education</span>
            <div className="db-filter-options">
              {EDUCATION_LEVELS.map(lvl => (
                <button
                  key={lvl}
                  className={`db-filter-chip${filters.education === lvl ? ' active' : ''}`}
                  onClick={() => setFilter('education', lvl)}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="db-filter-group">
            <span className="db-filter-label">Experience</span>
            <div className="db-filter-options">
              {EXP_RANGES.map((r, i) => (
                <button
                  key={r.label}
                  className={`db-filter-chip${filters.expRange === i ? ' active' : ''}`}
                  onClick={() => setFilter('expRange', i)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="db-filter-group">
            <span className="db-filter-label">
              Salary (PKR {job.salaryMin?.toLocaleString()} – {job.salaryMax?.toLocaleString()}/mo)
            </span>
            <div className="db-filter-options">
              {[
                { key: 'all',    label: 'All' },
                { key: 'within', label: `Within / Below (≤ ${job.salaryMax?.toLocaleString()})` },
                { key: 'above',  label: `Above (> ${job.salaryMax?.toLocaleString()})` },
              ].map(opt => (
                <button
                  key={opt.key}
                  className={`db-filter-chip${filters.salary === opt.key ? ' active' : ''}`}
                  onClick={() => setFilter('salary', opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="db-filter-group">
            <span className="db-filter-label">Negotiable</span>
            <div className="db-filter-options">
              {['All', 'Yes', 'No'].map(opt => (
                <button
                  key={opt}
                  className={`db-filter-chip${filters.negotiable === opt ? ' active' : ''}`}
                  onClick={() => setFilter('negotiable', opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="db-filter-group">
            <span className="db-filter-label">Work Type Comfort</span>
            <div className="db-filter-options">
              {['All', 'Yes', 'No'].map(opt => (
                <button
                  key={opt}
                  className={`db-filter-chip${filters.workTypeComfort === opt ? ' active' : ''}`}
                  onClick={() => setFilter('workTypeComfort', opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Candidates */}
      <div className="db-section-header" style={{ marginTop: 20 }}>
        <span className="db-section-title">
          Candidates
          <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
            ({candidates.length} shown / {job.candidates.length} total)
          </span>
        </span>
        {job.aiScoringDone && (
          <span style={{ fontSize: '0.78rem', color: '#0ea5e9', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Bot size={13} /> Ranked by AI Score
          </span>
        )}
      </div>

      <div className="db-candidates-list">
        {candidates.length === 0 && (
          <div className="db-placeholder">
            <Search size={32} style={{ color: '#cbd5e1' }} />
            <p>No candidates match the current filters.</p>
          </div>
        )}

        {candidates.map((c, idx) => {
          const interviewBadge = (() => {
            if (!c.interviewStatus) return null;
            if (c.interviewStatus === 'filtered_out')
              return { bg: '#f3f4f6', color: '#6b7280', label: 'Filtered Out' };
            if (c.interviewStatus === 'invited' && !c.interviewGiven)
              return { bg: '#dbeafe', color: '#1d4ed8', label: 'Interview Not Given' };
            if (c.interviewStatus === 'invited' && c.interviewGiven)
              return { bg: '#dcfce7', color: '#16a34a', label: 'Interview Given' };
            return null;
          })();

          return (
            <div className="db-candidate-row" key={c.id} onClick={() => onSelectCandidate(c)}>
              {job.aiScoringDone && (
                <div className="db-rank-num">#{idx + 1}</div>
              )}
              <div className="db-candidate-avatar" style={{ background: c.color }}>{c.initials}</div>
              <div className="db-candidate-info">
                <div className="db-candidate-name">{c.name}</div>
                <div className="db-candidate-sub">
                  {c.yearsOfExperience} yrs exp · {c.educationLevel} · {c.university}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                  <span style={{ fontSize: '0.72rem', color: '#475569' }}>
                    PKR {c.salaryExpectation.toLocaleString()}/mo
                    {' '}·{' '}
                    <span style={{ color: c.salaryNegotiable ? '#16a34a' : '#dc2626' }}>
                      {c.salaryNegotiable ? 'Negotiable' : 'Fixed'}
                    </span>
                  </span>
                  <span style={{ fontSize: '0.72rem', color: c.comfortableWithWorkType ? '#16a34a' : '#dc2626' }}>
                    {c.comfortableWithWorkType ? '✓' : '✗'} Comfortable with {WORK_TYPE_LABELS[job.workType]}
                  </span>
                </div>
              </div>

              {job.aiScoringDone && c.aiScore !== null && (
                <ScoreCircle score={c.aiScore} />
              )}

              {c.interviewGiven && c.interviewScore !== null && (
                <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#0ea5e9' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: scoreColor(c.interviewScore) }}>
                    {c.interviewScore}%
                  </div>
                  <div>Interview</div>
                </div>
              )}

              {interviewBadge && (
                <span className="db-badge" style={{ background: interviewBadge.bg, color: interviewBadge.color }}>
                  {interviewBadge.label}
                </span>
              )}

              {/* Per-candidate invite button */}
              {job.aiScoringDone && c.aiScore !== null && !c.interviewStatus && (
                <button
                  className="db-btn-invite-cand"
                  disabled={invitingId === c.id}
                  onClick={async (e) => {
                    e.stopPropagation();
                    setInvitingId(c.id);
                    await onSendCandidateInvite(job.id, c.id);
                    setInvitingId(null);
                  }}
                  title="Send interview invite to this candidate"
                >
                  {invitingId === c.id
                    ? <><span className="db-btn-spinner" style={{ width: 12, height: 12 }} />Inviting…</>
                    : <><UserCheck size={13} />Send Invite</>}
                </button>
              )}

              <span className="db-view-btn">View</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Candidate Profile View ───────────────────────────────────────────────────

function CandidateProfileView({ candidate: c, job }) {
  const interviewBadge = (() => {
    if (!c.interviewStatus) return null;
    if (c.interviewStatus === 'filtered_out')
      return { bg: '#f3f4f6', color: '#6b7280', label: 'Filtered Out' };
    if (c.interviewStatus === 'invited' && !c.interviewGiven)
      return { bg: '#dbeafe', color: '#1d4ed8', label: 'Interview Invited — Not Given Yet' };
    if (c.interviewStatus === 'invited' && c.interviewGiven)
      return { bg: '#dcfce7', color: '#16a34a', label: 'Interview Given' };
    return null;
  })();

  return (
    <div className="db-profile-card">
      {/* Header */}
      <div className="db-profile-header">
        <div className="db-profile-avatar-lg" style={{ background: c.color }}>{c.initials}</div>
        <div style={{ flex: 1 }}>
          <div className="db-profile-name">{c.name}</div>
          <div className="db-profile-role">{job.positionName} · Applied {c.appliedAt}</div>
          <div className="db-profile-header-meta">
            <span className="db-profile-header-meta-item"><Mail size={13} />{c.email}</span>
            <span className="db-profile-header-meta-item"><Phone size={13} />{c.phone}</span>
          </div>
          {interviewBadge && (
            <span
              className="db-badge"
              style={{ background: interviewBadge.bg, color: interviewBadge.color, marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              {c.interviewStatus === 'invited' && !c.interviewGiven && <Clock3 size={12} />}
              {c.interviewStatus === 'invited' && c.interviewGiven && <CheckCircle2 size={12} />}
              {c.interviewStatus === 'filtered_out' && <XCircle size={12} />}
              {interviewBadge.label}
            </span>
          )}
        </div>

        {/* AI Score */}
        {job.aiScoringDone && c.aiScore !== null && (
          <div className="db-profile-score-lg">
            <div className="db-profile-score-circle" style={{ background: '#0284c7' }}>
              {typeof c.aiScore === 'number' ? c.aiScore.toFixed(1) : c.aiScore}%
            </div>
            <div className="db-profile-score-label">AI Score</div>
          </div>
        )}

        {/* Interview Score */}
        {c.interviewGiven && c.interviewScore !== null && (
          <div className="db-profile-score-lg" style={{ marginLeft: 12 }}>
            <div className="db-profile-score-circle" style={{ background: scoreColor(c.interviewScore) }}>
              {c.interviewScore}%
            </div>
            <div className="db-profile-score-label">Interview</div>
          </div>
        )}
      </div>

      {/* AI Score Breakdown */}
      {job.aiScoringDone && c.aiScore !== null && c.aiScoreData && (
        <div style={{ padding: '0 28px 24px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 22px' }}>

            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  {c.aiScore.toFixed(1)}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>/ 100</span>
                <span style={{ marginLeft: 6, padding: '2px 10px', background: '#e0f2fe', color: '#0369a1', borderRadius: 100, fontSize: '0.75rem', fontWeight: 700 }}>
                  {c.aiScoreData.category}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                AI Score Breakdown
              </span>
            </div>

            {/* Breakdown bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {c.aiScoreData.breakdown.map(item => {
                const pct = item.penalty
                  ? Math.min(Math.abs(item.points) / item.max, 1)
                  : Math.min(item.points / item.max, 1);
                return (
                  <div key={item.key} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 52px', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </span>
                    <div style={{ height: 7, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct * 100}%`,
                        background: item.penalty ? '#f87171' : '#0ea5e9',
                        borderRadius: 99,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: item.penalty ? '#dc2626' : '#0f172a', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {item.penalty ? '−' : '+'}{Math.abs(item.points).toFixed(1)} / {item.max}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: '#e2e8f0', margin: '16px 0' }} />

            {/* Skills + metrics row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              {/* Matched skills */}
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>
                  Matched Skills ({c.aiScoreData.matched_skills?.length || 0})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {c.aiScoreData.matched_skills?.length > 0
                    ? c.aiScoreData.matched_skills.map(s => (
                        <span key={s} style={{ padding: '2px 9px', background: '#dcfce7', color: '#15803d', borderRadius: 100, fontSize: '0.72rem', fontWeight: 600 }}>{s}</span>
                      ))
                    : <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>None matched</span>
                  }
                </div>
              </div>

              {/* Missing skills */}
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>
                  Missing Skills ({c.aiScoreData.missing_skills?.length || 0})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {c.aiScoreData.missing_skills?.length > 0
                    ? c.aiScoreData.missing_skills.map(s => (
                        <span key={s} style={{ padding: '2px 9px', background: '#fee2e2', color: '#b91c1c', borderRadius: 100, fontSize: '0.72rem', fontWeight: 600 }}>{s}</span>
                      ))
                    : <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>None missing</span>
                  }
                </div>
              </div>
            </div>

            {/* Metric pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              <span style={{ padding: '4px 12px', background: '#f1f5f9', borderRadius: 100, fontSize: '0.76rem', color: '#475569' }}>
                🎯 Skill match <strong style={{ color: '#0f172a' }}>{c.aiScoreData.skill_match_pct}%</strong>
              </span>
              <span style={{ padding: '4px 12px', background: '#f1f5f9', borderRadius: 100, fontSize: '0.76rem', color: '#475569' }}>
                🔗 Semantic sim. <strong style={{ color: '#0f172a' }}>{(c.aiScoreData.semantic_similarity * 100).toFixed(1)}%</strong>
              </span>
              <span style={{ padding: '4px 12px', background: '#f1f5f9', borderRadius: 100, fontSize: '0.76rem', color: '#475569' }}>
                ⏱ Detected exp. <strong style={{ color: '#0f172a' }}>{c.aiScoreData.experience_years?.toFixed(1)} yrs</strong>
              </span>
              <span style={{ padding: '4px 12px', background: '#f1f5f9', borderRadius: 100, fontSize: '0.76rem', color: '#475569' }}>
                🎓 Education <strong style={{ color: '#0f172a' }}>{c.aiScoreData.education_level}</strong>
              </span>
              {c.aiScoreData.certifications?.length > 0 && (
                <span style={{ padding: '4px 12px', background: '#f1f5f9', borderRadius: 100, fontSize: '0.76rem', color: '#475569' }}>
                  📜 Certs: <strong style={{ color: '#0f172a' }}>{c.aiScoreData.certifications.slice(0, 3).join(', ')}</strong>
                </span>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Body */}
      <div className="db-profile-body">

        {/* Left column */}
        <div>
          <div className="db-profile-section">
            <div className="db-profile-section-title">Education</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <GraduationCap size={20} style={{ color: '#0ea5e9', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>{c.educationLevel}</div>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{c.university}</div>
              </div>
            </div>
          </div>

          <div className="db-profile-section">
            <div className="db-profile-section-title">Years of Experience</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              {c.yearsOfExperience} Years
            </div>
          </div>

          <div className="db-profile-section">
            <div className="db-profile-section-title">Salary Expectation</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              PKR {c.salaryExpectation.toLocaleString()} / month
            </div>
            <div style={{ marginTop: 6 }}>
              <span
                className="db-badge"
                style={
                  c.salaryNegotiable
                    ? { background: '#dcfce7', color: '#16a34a' }
                    : { background: '#fee2e2', color: '#dc2626' }
                }
              >
                {c.salaryNegotiable ? 'Negotiable' : 'Not Negotiable'}
              </span>
            </div>
          </div>

          <div className="db-profile-section">
            <div className="db-profile-section-title">Work Type Comfort</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {c.comfortableWithWorkType
                ? <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
                : <XCircle size={18} style={{ color: '#dc2626' }} />}
              <span style={{ fontSize: '0.88rem', color: '#374151' }}>
                {c.comfortableWithWorkType ? 'Comfortable' : 'Not comfortable'}{' '}
                with {WORK_TYPE_LABELS[job.workType]}
              </span>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div>
          <div className="db-profile-section-title">Contact</div>
          <div className="db-profile-sidebar-card">
            <div className="db-contact-row">
              <div className="db-contact-icon"><Mail size={14} /></div>{c.email}
            </div>
            <div className="db-contact-row">
              <div className="db-contact-icon"><Phone size={14} /></div>{c.phone}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="db-profile-section-title">GitHub</div>
            <div className="db-profile-sidebar-card">
              <a
                href={c.githubLink}
                target="_blank"
                rel="noopener noreferrer"
                className="db-contact-row"
                style={{ textDecoration: 'none', color: '#374151' }}
              >
                <div className="db-contact-icon"><GithubIcon /></div>
                <span style={{ fontSize: '0.82rem', color: '#3b82f6' }}>
                  {c.githubLink ? c.githubLink.replace('https://github.com/', '@') : 'Not Provided'}
                </span>
                <ExternalLink size={12} style={{ marginLeft: 'auto', color: '#94a3b8' }} />
              </a>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="db-profile-section-title">Resume</div>
            <div className="db-profile-sidebar-card">
              <a
                href={c.resumeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="db-contact-row"
                style={{ textDecoration: 'none', color: '#374151' }}
              >
                <div className="db-contact-icon"><FileText size={14} /></div>
                <span style={{ fontSize: '0.82rem', color: '#3b82f6' }}>View Resume</span>
                <ExternalLink size={12} style={{ marginLeft: 'auto', color: '#94a3b8' }} />
              </a>
            </div>
          </div>

          {c.interviewStatus === 'invited' && (
            <div style={{ marginTop: 14 }}>
              <div className="db-profile-section-title">Interview Status</div>
              <div className="db-profile-sidebar-card">
                {!c.interviewGiven ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#1d4ed8', fontWeight: 600 }}>
                    <Clock3 size={15} />
                    Invite sent — interview not yet given
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#16a34a', fontWeight: 600, marginBottom: 8 }}>
                      <CheckCircle2 size={15} /> Interview completed
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      Score:{' '}
                      <strong style={{ fontSize: '1rem', color: scoreColor(c.interviewScore) }}>
                        {c.interviewScore}%
                      </strong>
                    </div>
                    {c.interviewFeedback && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Bot size={12} /> AI Interview Feedback
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                          {c.interviewFeedback}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard({ user, onLogout }) {
  const [jobs, setJobs]                         = useState(INITIAL_JOBS);
  const [view, setView]                         = useState('home');
  const [selectedJobId, setSelectedJobId]       = useState(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [showCreateModal, setShowCreateModal]   = useState(false);
  const [toast, setToast]                       = useState(null);
  const [linkedinConfigured, setLinkedinConfigured] = useState(false);

  const initials = user
    ? user.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchJobs = async () => {
    try {
      const data = await api.getJobs();
      // Map backend snake_case to frontend camelCase for rendering
      const mappedJobs = data.map(job => ({
        ...job,
        positionName: job.position_name || job.positionName,
        requiredSkills: job.required_skills || job.requiredSkills || [],
        customQuestions: job.custom_questions || job.customQuestions || [],
        minYearsExperience: job.min_years_experience || job.minYearsExperience,
        salaryMin: job.salary_min || job.salaryMin,
        salaryMax: job.salary_max || job.salaryMax,
        workType: job.work_type || job.workType,
        aiScoringDone: job.ai_scoring_done ?? job.aiScoringDone,
        invitesSent: job.invites_sent ?? job.invitesSent,
        applicationFormUrl: job.application_form_url || job.applicationFormUrl || null,
        applicationDeadline: job.application_deadline || job.applicationDeadline || null,
        postedAt: new Date(job.posted_at || job.postedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        candidates: (job.candidates || []).map(c => ({
          ...c,
          name: c.full_name,
          initials: c.full_name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2),
          color: '#0284c7', // Mock color to maintain UI consistency
          educationLevel: c.education_level,
          yearsOfExperience: c.years_of_experience,
          salaryExpectation: c.salary_expectation,
          salaryNegotiable: c.salary_negotiable,
          comfortableWithWorkType: c.comfortable_with_work_type,
          githubLink: c.github_link,
          resumeLink: c.resume_link,
          aiScore: c.ai_score,
          aiScoreData: c.ai_score_data || null,
          interviewStatus: c.interview_status,
          interviewGiven: c.interview_given,
          interviewScore: c.interview_score,
          interviewFeedback: c.interview_feedback || null,
          appliedAt: new Date(c.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        }))
      }));
      setJobs(mappedJobs);
    } catch (err) {
      showToast('Error loading jobs from server');
    }
  };

  const fetchLinkedInStatus = async () => {
    try {
      const res = await api.getLinkedInStatus();
      setLinkedinConfigured(res.configured);
    } catch {
      // silently ignore if auth not yet available
    }
  };

  // Fetch jobs and LinkedIn status on mount
  useEffect(() => {
    fetchJobs();
    fetchLinkedInStatus();
  }, []);

  // Always read latest job/candidate from state
  const selectedJob       = jobs.find(j => j.id === selectedJobId) || null;
  const selectedCandidate = selectedJob?.candidates.find(c => c.id === selectedCandidateId) || null;

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleCreateJob = async (formData) => {
    try {
      const created = await api.createJob(formData);
      await fetchJobs();
      setShowCreateModal(false);
      if (created?.linkedinWarning) {
        showToast(created.linkedinWarning, 'warn');
      } else {
        showToast('Job successfully created!');
      }
    } catch (err) {
      showToast(err.message || 'Error creating job', 'error');
    }
  };

  const handleCloseJob = async (jobId) => {
    try {
      await api.closeJob(jobId);
      await fetchJobs();
      showToast('Job closed successfully.');
    } catch (err) {
      showToast(err.message || 'Error closing job');
    }
  };

  const handleRunAIScoring = async (jobId, filters) => {
    try {
      await api.runAIScoring(jobId, filters);
      await fetchJobs();
      showToast('AI Scoring complete! Filtered candidates ranked by score.');
    } catch (err) {
      showToast(err.message || 'Error running AI scoring');
    }
  };

  const handleSendInvites = async (jobId, count) => {
    try {
      const res = await api.sendInvites(jobId, count);
      await fetchJobs();
      showToast(`Interview invites sent to ${res.invited_count} candidate(s)!`);
    } catch (err) {
      showToast(err.message || 'Error sending invites');
    }
  };

  const handleDeleteJob = async (jobId) => {
    try {
      await api.deleteJob(jobId);
      if (selectedJobId === jobId) { setSelectedJobId(null); setView('home'); }
      await fetchJobs();
      showToast('Job deleted successfully.');
    } catch (err) {
      showToast(err.message || 'Error deleting job', 'error');
    }
  };

  const handleSendCandidateInvite = async (jobId, candidateId) => {
    try {
      await api.sendCandidateInvite(jobId, candidateId);
      await fetchJobs();
      showToast('Interview invite sent!');
    } catch (err) {
      showToast(err.message || 'Error sending invite', 'error');
    }
  };

  const handleSaveLinkedInToken = async (token) => {
    try {
      await api.saveLinkedInToken(token);
      setLinkedinConfigured(true);
      showToast('LinkedIn token saved successfully!');
    } catch (err) {
      showToast(err.message || 'Error saving LinkedIn token');
      throw err;
    }
  };

  const handleRemoveLinkedInToken = async () => {
    try {
      await api.removeLinkedInToken();
      setLinkedinConfigured(false);
      showToast('LinkedIn token removed.');
    } catch (err) {
      showToast(err.message || 'Error removing LinkedIn token');
      throw err;
    }
  };

  // ── Topbar ────────────────────────────────────────────────────────────────

  const topbarTitle = () => {
    if (view === 'candidate' && selectedCandidate) return selectedCandidate.name;
    if (view === 'job-detail' && selectedJob) return selectedJob.positionName;
    if (view === 'settings') return 'Settings';
    return 'Dashboard';
  };

  const topbarSub = () => {
    if (view === 'candidate' && selectedCandidate && selectedJob)
      return `${selectedJob.positionName} · Applied ${selectedCandidate.appliedAt}`;
    if (view === 'job-detail' && selectedJob)
      return `${selectedJob.candidates.length} candidate${selectedJob.candidates.length !== 1 ? 's' : ''}`;
    return null;
  };

  // ── Render ────────────────────────────────────────────────────────────────

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
          <button
            className={`db-nav-item${view === 'home' || view === 'job-detail' || view === 'candidate' ? ' active' : ''}`}
            onClick={() => { setView('home'); setSelectedJobId(null); setSelectedCandidateId(null); }}
          >
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <button
            className={`db-nav-item${view === 'settings' ? ' active' : ''}`}
            onClick={() => setView('settings')}
            style={{ position: 'relative' }}
          >
            <Settings size={16} /> Settings
            {!linkedinConfigured && (
              <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} title="LinkedIn not configured" />
            )}
          </button>
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
              <button
                className="db-back-btn"
                onClick={() => { setSelectedCandidateId(null); setView('job-detail'); }}
              >
                <ArrowLeft size={14} /> Back to Candidates
              </button>
            )}
            {view === 'job-detail' && (
              <button
                className="db-back-btn"
                onClick={() => { setSelectedJobId(null); setView('home'); }}
              >
                <ArrowLeft size={14} /> Back to Dashboard
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="db-content">
          {view === 'home' && (
            <DashboardHomeView
              jobs={jobs}
              user={user}
              onCreateJob={() => setShowCreateModal(true)}
              onSelectJob={(job) => { setSelectedJobId(job.id); setView('job-detail'); }}
              onDeleteJob={handleDeleteJob}
            />
          )}

          {view === 'job-detail' && selectedJob && (
            <JobDetailView
              job={selectedJob}
              onCloseJob={handleCloseJob}
              onRunAIScoring={handleRunAIScoring}
              onSendInvites={handleSendInvites}
              onSendCandidateInvite={handleSendCandidateInvite}
              onSelectCandidate={(c) => { setSelectedCandidateId(c.id); setView('candidate'); }}
            />
          )}

          {view === 'candidate' && selectedCandidate && selectedJob && (
            <CandidateProfileView
              candidate={selectedCandidate}
              job={selectedJob}
            />
          )}

          {view === 'settings' && (
            <SettingsView
              linkedinConfigured={linkedinConfigured}
              onSave={handleSaveLinkedInToken}
              onRemove={handleRemoveLinkedInToken}
            />
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="db-toast"
          style={
            toast.type === 'warn'
              ? { background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }
              : toast.type === 'error'
              ? { background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c' }
              : {}
          }
        >
          {toast.type === 'warn'
            ? <AlertTriangle size={16} style={{ color: '#d97706', flexShrink: 0 }} />
            : toast.type === 'error'
            ? <XCircle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
            : <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />}
          {toast.msg}
        </div>
      )}

      {/* Create Job Modal */}
      {showCreateModal && (
        <CreateJobModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateJob}
          linkedinConfigured={linkedinConfigured}
          onGoToSettings={() => setView('settings')}
        />
      )}
    </div>
  );
}