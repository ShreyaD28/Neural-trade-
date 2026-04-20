import axios from 'axios'

const apiOrigin = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL
const mlOrigin = import.meta.env.VITE_ML_URL || import.meta.env.VITE_ML_API_URL

const normalizedApiOrigin = apiOrigin
  ? apiOrigin.replace(/\/api\/?$/, '')
  : null

const baseURL = normalizedApiOrigin
  ? normalizedApiOrigin + '/api'
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
  baseURL: mlOrigin || 'http://localhost:8000',
  timeout: 120_000,
})
