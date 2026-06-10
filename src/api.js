const API_BASE_URL = '/api';

// Helper to handle API responses
const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    const error = (data && data.detail) || response.statusText;
    throw new Error(error);
  }
  return data;
};

// Helper to attach authorization token for protected routes
const getHeaders = () => {
  const token = localStorage.getItem('receasy_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export const api = {
  // Sign Up
  signUp: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await handleResponse(response);
    if (data.access_token) {
      localStorage.setItem('receasy_token', data.access_token);
      localStorage.setItem('receasy_user', data.user_name);
    }
    return data;
  },

  // Sign In
  signIn: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const data = await handleResponse(response);
    if (data.access_token) {
      localStorage.setItem('receasy_token', data.access_token);
      localStorage.setItem('receasy_user', data.user_name);
    }
    return data;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('receasy_token');
    localStorage.removeItem('receasy_user');
  },

  // Submit Contact Form
  sendMessage: async (messageData) => {
    const response = await fetch(`${API_BASE_URL}/contact/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData),
    });
    return handleResponse(response);
  },

  // Get all jobs for the logged-in recruiter
  getJobs: async () => {
    const response = await fetch(`${API_BASE_URL}/jobs/`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Create a new job
  createJob: async (jobData) => {
    const response = await fetch(`${API_BASE_URL}/jobs/create`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(jobData),
    });
    return handleResponse(response);
  },
  
  // Get job details for candidates (Public - No Auth Required)
  getPublicJob: async (jobId) => {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/public`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
  },

  // Close an open job
  closeJob: async (jobId) => {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/close`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Apply to a job (External facing, no Auth required)
  applyToJob: async (jobId, candidateData) => {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidateData),
    });
    return handleResponse(response);
  },

  // Run AI Scoring on candidates based on filters
  runAIScoring: async (jobId, filters) => {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/score`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(filters),
    });
    return handleResponse(response);
  },

  // Send interview invites to top N candidates
  sendInvites: async (jobId, count) => {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/invite`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ count }),
    });
    return handleResponse(response);
  },

  // Get LinkedIn token configuration status
  getLinkedInStatus: async () => {
    const response = await fetch(`${API_BASE_URL}/settings/linkedin`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Save LinkedIn token
  saveLinkedInToken: async (token) => {
    const response = await fetch(`${API_BASE_URL}/settings/linkedin`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ token }),
    });
    return handleResponse(response);
  },

  // Remove LinkedIn token
  removeLinkedInToken: async () => {
    const response = await fetch(`${API_BASE_URL}/settings/linkedin`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};