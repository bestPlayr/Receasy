// Local dev: Vite proxies /api → localhost:8000.
// Production (Vercel): set VITE_API_BASE_URL to your ngrok root (e.g. https://xxx.ngrok-free.dev).
const _apiRoot = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const API_BASE_URL = _apiRoot ? `${_apiRoot}/api` : '/api';
const IS_NGROK = _apiRoot.includes('ngrok');

const getHeaders = (contentType = 'application/json') => ({
  ...(contentType && { 'Content-Type': contentType }),
  ...(IS_NGROK && { 'ngrok-skip-browser-warning': 'true' }),
  ...(localStorage.getItem('receasy_token') && { Authorization: `Bearer ${localStorage.getItem('receasy_token')}` }),
});

const handleResponse = async (response) => {
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Server returned an invalid response. Make sure the backend and ngrok tunnel are running.');
  }
  if (!response.ok) {
    const error = (data && data.detail) || response.statusText;
    throw new Error(error);
  }
  return data;
};

const apiFetch = async (url, options = {}) => {
  try {
    return handleResponse(await fetch(url, options));
  } catch (err) {
    if (err.message === 'Failed to fetch') {
      throw new Error('Cannot reach the server. Make sure the backend and ngrok tunnel are running.');
    }
    throw err;
  }
};

export const api = {
  signUp: async (userData) => {
    const data = await apiFetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData),
    });
    if (data.access_token) {
      localStorage.setItem('receasy_token', data.access_token);
      localStorage.setItem('receasy_user', data.user_name);
    }
    return data;
  },

  signIn: async (credentials) => {
    const data = await apiFetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(credentials),
    });
    if (data.access_token) {
      localStorage.setItem('receasy_token', data.access_token);
      localStorage.setItem('receasy_user', data.user_name);
    }
    return data;
  },

  logout: () => {
    localStorage.removeItem('receasy_token');
    localStorage.removeItem('receasy_user');
  },

  sendMessage: async (messageData) => {
    return apiFetch(`${API_BASE_URL}/contact/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(messageData),
    });
  },

  getJobs: async () => {
    return apiFetch(`${API_BASE_URL}/jobs/`, {
      method: 'GET',
      headers: getHeaders(),
    });
  },

  createJob: async (jobData) => {
    return apiFetch(`${API_BASE_URL}/jobs/create`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(jobData),
    });
  },

  getPublicJob: async (publicId) => {
    return apiFetch(`${API_BASE_URL}/jobs/${publicId}/public`, {
      method: 'GET',
      headers: getHeaders(),
    });
  },

  applyToJob: async (publicId, formData) => {
    return apiFetch(`${API_BASE_URL}/jobs/${publicId}/apply`, {
      method: 'POST',
      headers: getHeaders(null),
      body: formData,
    });
  },

  closeJob: async (jobId) => {
    return apiFetch(`${API_BASE_URL}/jobs/${jobId}/close`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
  },

  runAIScoring: async (jobId, filters) => {
    return apiFetch(`${API_BASE_URL}/jobs/${jobId}/score`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(filters),
    });
  },

  sendInvites: async (jobId, count) => {
    return apiFetch(`${API_BASE_URL}/jobs/${jobId}/invite`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ count }),
    });
  },

  deleteJob: async (jobId) => {
    return apiFetch(`${API_BASE_URL}/jobs/${jobId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  },

  sendCandidateInvite: async (jobId, candidateId) => {
    return apiFetch(`${API_BASE_URL}/jobs/${jobId}/candidates/${candidateId}/invite`, {
      method: 'POST',
      headers: getHeaders(),
    });
  },

  getLinkedInStatus: async () => {
    return apiFetch(`${API_BASE_URL}/settings/linkedin`, {
      method: 'GET',
      headers: getHeaders(),
    });
  },

  saveLinkedInToken: async (token) => {
    return apiFetch(`${API_BASE_URL}/settings/linkedin`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ token }),
    });
  },

  removeLinkedInToken: async () => {
    return apiFetch(`${API_BASE_URL}/settings/linkedin`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  },

  getInterviewInfo: async (token) => {
    return apiFetch(`${API_BASE_URL}/interview/${token}`, {
      method: 'GET',
      headers: getHeaders(),
    });
  },

  getInterviewQuestions: async (token) => {
    return apiFetch(`${API_BASE_URL}/interview/${token}/questions`, {
      method: 'POST',
      headers: getHeaders(),
    });
  },

  submitInterview: async (token, answers) => {
    return apiFetch(`${API_BASE_URL}/interview/${token}/submit`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ answers }),
    });
  },
};
