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
  }
};