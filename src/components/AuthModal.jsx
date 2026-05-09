import { useState } from 'react';
import { X, Eye, EyeOff, Briefcase } from 'lucide-react';
import { api } from '../api';

export default function AuthModal({ mode, onClose, onSwitch, onToast, onAuthSuccess }) {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', company: '', remember: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isSignIn = mode === 'signin';

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
    setError('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!isSignIn && form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let data;
      if (isSignIn) {
        data = await api.signIn({ email: form.email, password: form.password, remember: form.remember });
      } else {
        data = await api.signUp({ name: form.name, email: form.email, password: form.password, company: form.company || undefined });
      }
      onAuthSuccess(data, isSignIn ? 'signin' : 'signup');
      if (isSignIn) onClose();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}><X size={16} /></button>

        <div className="modal-logo">
          <div className="modal-logo-icon"><Briefcase size={14} /></div>
          RecEasy
        </div>

        <h2>{isSignIn ? 'Welcome back' : 'Create your account'}</h2>
        <p>{isSignIn ? 'Sign in to your RecEasy dashboard' : 'Start hiring smarter today — it\'s free'}</p>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
            borderRadius: 8, padding: '10px 14px', fontSize: '0.85rem', marginBottom: 12
          }}>
            {error}
          </div>
        )}

        <form className="modal-form" onSubmit={handleSubmit}>
          {!isSignIn && (
            <div className="form-group">
              <label>Full Name</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="Jane Smith" required />
            </div>
          )}

          {!isSignIn && (
            <div className="form-group">
              <label>Company Name</label>
              <input name="company" value={form.company} onChange={handleChange} placeholder="Your company" />
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@company.com" required />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-input-wrapper">
              <input
                name="password"
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                placeholder={isSignIn ? 'Enter your password' : 'Create a strong password'}
                required
              />
              <button type="button" className="password-toggle" onClick={() => setShowPass(p => !p)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {!isSignIn && (
            <div className="form-group">
              <label>Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  name="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={handleChange}
                  placeholder="Repeat your password"
                  required
                />
                <button type="button" className="password-toggle" onClick={() => setShowConfirm(p => !p)}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {isSignIn && (
            <div className="remember-row">
              <label>
                <input name="remember" type="checkbox" checked={form.remember} onChange={handleChange} />
                Remember me
              </label>
              <span className="forgot-link">Forgot password?</span>
            </div>
          )}

          <button type="submit" className="modal-submit" disabled={loading}>
            {loading ? 'Please wait…' : isSignIn ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="modal-switch">
          {isSignIn ? (
            <>Don't have an account? <button onClick={onSwitch}>Sign up free</button></>
          ) : (
            <>Already have an account? <button onClick={onSwitch}>Sign in</button></>
          )}
        </div>
      </div>
    </div>
  );
}
