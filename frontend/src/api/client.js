import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL + '/api'
  : 'http://localhost:5050/api'

const api = axios.create({
  baseURL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api

export const mlApi = axios.create({
  baseURL: import.meta.env.VITE_ML_URL || 'http://localhost:8000',
  timeout: 120_000,
})