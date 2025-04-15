// app/api/authService.js
import axios from 'axios';
import { API_URL } from '@env';

const API_ENDPOINT = API_URL || 'https://famlynook.com';

export default {

  login: async (email, password) => {
    const response = await axios.post(`${API_ENDPOINT}/api/auth/login`, {
      email, password
    });
    return response.data;
  },

  register: async (name, email, password, passkey = null) => {
    const payload = { name, email, password };
    if (passkey) payload.passkey = passkey;
    
    const response = await axios.post(`${API_ENDPOINT}/api/auth/register`, payload);
    return response.data;
  },

  registerWithInvitation: async (name, email, password, token) => {
    const response = await axios.post(`${API_ENDPOINT}/api/auth/register-invited`, {
      name, email, password, token
    });
    return response.data;
  },

  refreshToken: async (refreshToken) => {
    const response = await axios.post(
      `${API_ENDPOINT}/api/auth/refresh-token`,
      { refreshToken },
      { 
        withCredentials: true,
        timeout: 15000
      }
    );
    return response.data;
  },

  logout: async () => {
    return await axios.post(`${API_ENDPOINT}/api/auth/logout`);
  },

  checkInvitation: async (token) => {
    const response = await axios.get(`${API_ENDPOINT}/api/invitations/check/${token}`);
    return response.data;
  },
  getUserProfile: async () => {
    const response = await axios.get(`${API_ENDPOINT}/api/dashboard/profile`);
    return response.data;
  }
};