import { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { api } from '../api';

export default function Contact({ onToast }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', company: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.sendMessage(form);
      onToast('Message sent! We\'ll get back to you within 24 hours.');
      setForm({ firstName: '', lastName: '', email: '', company: '', subject: '', message: '' });
    } catch (err) {
      setError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="contact" id="contact">
      <div className="contact-grid">
        <div className="contact-info">
          <span className="section-tag" style={{ marginBottom: 12 }}>Contact Us</span>
          <h2>Let's <span>Talk Recruitment</span></h2>
          <p>
            Have questions about RecEasy? Want to see a live demo?
            Our team is ready to help you transform your hiring process.
          </p>

          <div className="contact-details">
            <div className="contact-detail">
              <div className="contact-detail-icon"><Mail size={20} /></div>
              <div className="contact-detail-text">
                <h4>Email Us</h4>
                <p>hello@receasy.io</p>
              </div>
            </div>
            <div className="contact-detail">
              <div className="contact-detail-icon"><Phone size={20} /></div>
              <div className="contact-detail-text">
                <h4>Call Us</h4>
                <p>+1 (800) REC-EASY</p>
              </div>
            </div>
            <div className="contact-detail">
              <div className="contact-detail-icon"><MapPin size={20} /></div>
              <div className="contact-detail-text">
                <h4>Office</h4>
                <p>San Francisco, CA 94105</p>
              </div>
            </div>
          </div>
        </div>

        <div className="contact-form">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--gray-800)', marginBottom: 22 }}>
            Send Us a Message
          </h3>

          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
              borderRadius: 8, padding: '10px 14px', fontSize: '0.85rem', marginBottom: 14
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="John" required />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Doe" required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email Address</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="john@company.com" required />
              </div>
              <div className="form-group">
                <label>Company</label>
                <input name="company" value={form.company} onChange={handleChange} placeholder="Acme Corp" />
              </div>
            </div>
            <div className="form-group">
              <label>Subject</label>
              <input name="subject" value={form.subject} onChange={handleChange} placeholder="How can we help?" required />
            </div>
            <div className="form-group">
              <label>Message</label>
              <textarea name="message" value={form.message} onChange={handleChange} placeholder="Tell us about your recruitment challenges..." required />
            </div>
            <button type="submit" className="form-submit" disabled={loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Send size={16} />
              {loading ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
