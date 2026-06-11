import { useState, useEffect } from 'react';
import { api } from '../api';
import './Apply.css';

const EDUCATION_LEVELS = ["High School", "Bachelor's", "Master's", "PhD"];
const WORK_TYPE_LABELS = { remote: 'Remote', 'on-site': 'On-site', hybrid: 'Hybrid' };

function formatDeadline(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function computeCountdown(iso) {
  if (!iso) return null;
  const diff = new Date(iso) - Date.now();
  if (diff <= 0) return 'Closing soon';
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const secs = totalSec % 60;
  return `${days}d ${hours}h ${secs}s`;
}

export default function Apply({ publicId }) {
  const [job, setJob]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    education_level: "Bachelor's",
    university: '',
    years_of_experience: '',
    salary_expectation: '',
    salary_negotiable: false,
    comfortable_with_work_type: false,
    github_link: '',
  });
  const [resume, setResume] = useState(null);
  const [errors, setErrors] = useState({});
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!job?.applicationDeadline) return;
    const tick = () => setCountdown(computeCountdown(job.applicationDeadline));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [job?.applicationDeadline]);

  useEffect(() => {
    api.getPublicJob(publicId)
      .then(data => setJob(data))
      .catch(err => setError(err.message || 'Job not found or no longer accepting applications.'))
      .finally(() => setLoading(false));
  }, [publicId]);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const validate = () => {
    const e = {};
    if (!form.full_name.trim())          e.full_name = 'Required';
    if (!form.email.trim())              e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.phone.trim())              e.phone = 'Required';
    if (!form.years_of_experience && form.years_of_experience !== 0) e.years_of_experience = 'Required';
    else if (isNaN(Number(form.years_of_experience)) || Number(form.years_of_experience) < 0) e.years_of_experience = 'Enter a valid number';
    if (!form.salary_expectation)        e.salary_expectation = 'Required';
    else if (isNaN(Number(form.salary_expectation)) || Number(form.salary_expectation) <= 0) e.salary_expectation = 'Enter a valid amount';
    if (!resume)                         e.resume = 'Please upload your resume';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    const formData = new FormData();
    formData.append('full_name', form.full_name.trim());
    formData.append('email', form.email.trim());
    formData.append('phone', form.phone.trim());
    formData.append('education_level', form.education_level);
    if (form.university.trim()) formData.append('university', form.university.trim());
    formData.append('years_of_experience', Number(form.years_of_experience));
    formData.append('salary_expectation', Number(form.salary_expectation));
    formData.append('salary_negotiable', form.salary_negotiable);
    formData.append('comfortable_with_work_type', form.comfortable_with_work_type);
    if (form.github_link.trim()) formData.append('github_link', form.github_link.trim());
    formData.append('resume', resume);

    setSubmitting(true);
    try {
      await api.applyToJob(publicId, formData);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="apply-page">
        <div className="apply-loading">
          <div className="apply-spinner" />
          <p>Loading job details…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="apply-page">
        <div className="apply-error-card">
          <div className="apply-error-icon">✕</div>
          <h2>Job Unavailable</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="apply-page">
        <div className="apply-success-card">
          <div className="apply-success-icon">✓</div>
          <h2>Application Submitted!</h2>
          <p>
            Thanks, <strong>{form.full_name}</strong>! We've received your application for{' '}
            <strong>{job.positionName}</strong>. You'll receive a confirmation email at{' '}
            <strong>{form.email}</strong>.
          </p>
          <p className="apply-success-sub">We'll review your profile and reach out if you're shortlisted.</p>
        </div>
      </div>
    );
  }

  const workTypeLabel = WORK_TYPE_LABELS[job.workType] || job.workType;

  return (
    <div className="apply-page">
      {/* Header */}
      <header className="apply-header">
        <div className="apply-header-inner">
          <div className="apply-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
            RecEasy
          </div>
        </div>
      </header>

      <main className="apply-main">
        {/* Job overview */}
        <div className="apply-job-card">
          <div className="apply-job-top">
            <div className="apply-job-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
            </div>
            <div className="apply-job-info">
              <h1 className="apply-job-title">{job.positionName}</h1>
              <div className="apply-job-meta">
                <span>📍 {job.location}</span>
                <span>💼 {workTypeLabel}</span>
                <span>⏱ {job.minYearsExperience}+ yrs exp</span>
                <span>💰 PKR {job.salaryMin?.toLocaleString()} – {job.salaryMax?.toLocaleString()}/mo</span>
              </div>
            </div>
          </div>

          {job.description && (
            <p className="apply-job-desc" style={{ whiteSpace: 'pre-wrap' }}>{job.description}</p>
          )}

          {job.requiredSkills?.length > 0 && (
            <div className="apply-skills">
              {job.requiredSkills.map(s => (
                <span key={s} className="apply-skill-tag">{s}</span>
              ))}
            </div>
          )}

          {/* Deadline */}
          {job.applicationDeadline && (
            <div className={`apply-deadline${countdown && !countdown.startsWith('Closing') && parseInt(countdown) <= 3 ? ' apply-deadline--urgent' : ''}`}>
              <span>
                🗓 Apply by {formatDeadline(job.applicationDeadline)}
                {countdown && (
                  <strong> · {countdown} left</strong>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Application Form */}
        <div className="apply-form-card">
          <h2 className="apply-form-title">Your Application</h2>
          <p className="apply-form-sub">Fill in all required fields and attach your resume.</p>

          <form onSubmit={handleSubmit} noValidate>

            {/* Personal Information */}
            <div className="apply-section-label">Personal Information</div>

            <div className="apply-form-row">
              <div className={`apply-form-group${errors.full_name ? ' has-error' : ''}`}>
                <label>Full Name <span className="apply-req">*</span></label>
                <input
                  type="text"
                  placeholder="Jane Smith"
                  value={form.full_name}
                  onChange={e => set('full_name', e.target.value)}
                />
                {errors.full_name && <span className="apply-error">{errors.full_name}</span>}
              </div>
              <div className={`apply-form-group${errors.email ? ' has-error' : ''}`}>
                <label>Email <span className="apply-req">*</span></label>
                <input
                  type="email"
                  placeholder="jane@example.com"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                />
                {errors.email && <span className="apply-error">{errors.email}</span>}
              </div>
            </div>

            <div className={`apply-form-group${errors.phone ? ' has-error' : ''}`}>
              <label>Phone Number <span className="apply-req">*</span></label>
              <input
                type="tel"
                placeholder="+1 555 000 0000"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
              />
              {errors.phone && <span className="apply-error">{errors.phone}</span>}
            </div>

            {/* Education & Experience */}
            <div className="apply-section-label">Education &amp; Experience</div>

            <div className="apply-form-row">
              <div className="apply-form-group">
                <label>Education Level <span className="apply-req">*</span></label>
                <select value={form.education_level} onChange={e => set('education_level', e.target.value)}>
                  {EDUCATION_LEVELS.map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>
              <div className="apply-form-group">
                <label>University / Institution</label>
                <input
                  type="text"
                  placeholder="e.g. MIT"
                  value={form.university}
                  onChange={e => set('university', e.target.value)}
                />
              </div>
            </div>

            <div className={`apply-form-group${errors.years_of_experience ? ' has-error' : ''}`} style={{ maxWidth: 220 }}>
              <label>Years of Experience <span className="apply-req">*</span></label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 3"
                value={form.years_of_experience}
                onChange={e => set('years_of_experience', e.target.value)}
              />
              {errors.years_of_experience && <span className="apply-error">{errors.years_of_experience}</span>}
            </div>

            {/* Job Fit */}
            <div className="apply-section-label">Job Fit &amp; Compensation</div>

            <div className={`apply-form-group${errors.salary_expectation ? ' has-error' : ''}`} style={{ maxWidth: 280 }}>
              <label>Expected Monthly Salary (PKR) <span className="apply-req">*</span></label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 150000"
                value={form.salary_expectation}
                onChange={e => set('salary_expectation', e.target.value)}
              />
              {errors.salary_expectation && <span className="apply-error">{errors.salary_expectation}</span>}
            </div>

            <div className="apply-yn-groups">
              <div className="apply-yn-group">
                <div className="apply-yn-question">My salary expectation is negotiable</div>
                <div className="apply-yn-options">
                  <label className={`apply-yn-option${form.salary_negotiable === true ? ' selected' : ''}`}>
                    <input
                      type="radio"
                      name="salary_negotiable"
                      checked={form.salary_negotiable === true}
                      onChange={() => set('salary_negotiable', true)}
                    />
                    Yes
                  </label>
                  <label className={`apply-yn-option${form.salary_negotiable === false ? ' selected' : ''}`}>
                    <input
                      type="radio"
                      name="salary_negotiable"
                      checked={form.salary_negotiable === false}
                      onChange={() => set('salary_negotiable', false)}
                    />
                    No
                  </label>
                </div>
              </div>

              <div className="apply-yn-group">
                <div className="apply-yn-question">
                  I am comfortable with <strong>{workTypeLabel}</strong> work mode
                </div>
                <div className="apply-yn-options">
                  <label className={`apply-yn-option${form.comfortable_with_work_type === true ? ' selected' : ''}`}>
                    <input
                      type="radio"
                      name="comfortable_with_work_type"
                      checked={form.comfortable_with_work_type === true}
                      onChange={() => set('comfortable_with_work_type', true)}
                    />
                    Yes
                  </label>
                  <label className={`apply-yn-option${form.comfortable_with_work_type === false ? ' selected' : ''}`}>
                    <input
                      type="radio"
                      name="comfortable_with_work_type"
                      checked={form.comfortable_with_work_type === false}
                      onChange={() => set('comfortable_with_work_type', false)}
                    />
                    No
                  </label>
                </div>
              </div>
            </div>

            {/* Additional */}
            <div className="apply-section-label">Additional (Optional)</div>

            <div className="apply-form-group">
              <label>GitHub Profile URL</label>
              <input
                type="url"
                placeholder="https://github.com/yourusername"
                value={form.github_link}
                onChange={e => set('github_link', e.target.value)}
              />
            </div>

            {/* Resume Upload */}
            <div className="apply-section-label">Resume</div>

            <div className={`apply-upload-zone${errors.resume ? ' has-error' : ''}${resume ? ' has-file' : ''}`}>
              <input
                id="resume-upload"
                type="file"
                accept=".pdf,.doc,.docx"
                style={{ display: 'none' }}
                onChange={e => {
                  setResume(e.target.files[0] || null);
                  if (errors.resume) setErrors(er => ({ ...er, resume: undefined }));
                }}
              />
              <label htmlFor="resume-upload" className="apply-upload-label">
                {resume ? (
                  <>
                    <span className="apply-upload-file-icon">📄</span>
                    <span className="apply-upload-filename">{resume.name}</span>
                    <span className="apply-upload-change">Click to change</span>
                  </>
                ) : (
                  <>
                    <span className="apply-upload-icon">⬆</span>
                    <span className="apply-upload-text">Click to upload your resume</span>
                    <span className="apply-upload-hint">PDF, DOC, or DOCX · Max 10 MB</span>
                  </>
                )}
              </label>
              {errors.resume && <span className="apply-error" style={{ marginTop: 6 }}>{errors.resume}</span>}
            </div>

            {submitError && (
              <div className="apply-submit-error">{submitError}</div>
            )}

            <button type="submit" className="apply-submit-btn" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="apply-btn-spinner" />
                  Submitting…
                </>
              ) : 'Submit Application'}
            </button>
          </form>
        </div>
      </main>

      <footer className="apply-footer">
        Powered by <strong>RecEasy</strong>
      </footer>
    </div>
  );
}
