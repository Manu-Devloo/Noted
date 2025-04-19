import axios from 'axios';

const API_BASE = '/.netlify/functions';

const api = axios.create({
  baseURL: API_BASE,
});

// Generic request wrapper
export const apiRequest = async (endpoint, method = 'GET', data = null, token = null, config = {}) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.request({
      url: endpoint,
      method,
      data,
      headers: { ...headers, ...(config.headers || {}) },
      ...config,
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
};

// Helper for file uploads (images, etc)
export const apiUpload = async (endpoint, files, token = null, extraData = {}) => {
  const formData = new FormData();
  files.forEach((file, idx) => formData.append(`file${idx}`, file));
  Object.entries(extraData).forEach(([key, value]) => formData.append(key, value));
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await api.post(endpoint, formData, {
    headers: { ...headers, 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export default api;
