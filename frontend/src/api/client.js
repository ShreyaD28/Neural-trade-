import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api

/** ML service — used for predictions, risk analytics, signals */
export const mlApi = axios.create({
  baseURL: import.meta.env.VITE_ML_API_URL || 'http://localhost:8000',
  timeout: 120_000,
})
