import { useState, useEffect } from 'react';
import { api } from '../api';

export default function TestApply({ publicId }) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // 1. Test GET Public Job API
  useEffect(() => {
    const fetchJob = async () => {
      try {
        const data = await api.getPublicJob(publicId);
        setJob(data);
      } catch (err) {
        setError(err.message || "Job not found or closed.");
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [publicId]);

  // 2. Test POST Apply API
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('full_name', name);
    formData.append('email', email);
    formData.append('phone', '+923001234567');
    formData.append('education_level', "Bachelor's");
    formData.append('years_of_experience', 3);
    formData.append('salary_expectation', 150000);
    formData.append('salary_negotiable', true);
    formData.append('comfortable_with_work_type', true);
    formData.append('resume', file);

    try {
      await api.applyToJob(publicId, formData);
      alert("Applied successfully! Check your backend 'uploads/resumes' folder.");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  if (loading) return <div style={{ padding: 50 }}>Loading Job Details...</div>;
  if (error) return <div style={{ padding: 50, color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: 50, maxWidth: 500, margin: '0 auto' }}>
      <h2>Applying for: {job.position_name}</h2>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>
        {job.location} • {job.work_type} • {job.min_years_experience}+ Yrs Exp
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <input type="text" placeholder="Full Name" onChange={e => setName(e.target.value)} required />
        <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} required />
        
        {/* File Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Upload Resume (PDF/Doc)</label>
          <input 
            type="file" 
            accept=".pdf,.doc,.docx" 
            onChange={e => setFile(e.target.files[0])} 
            required 
          />
        </div>
        
        <button type="submit" style={{ padding: 10, cursor: 'pointer', background: '#4F46E5', color: 'white', border: 'none', borderRadius: 5 }}>
          Submit Application
        </button>
      </form>
    </div>
  );
}