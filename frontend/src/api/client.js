import axios from 'axios'

const PROD_BACKEND_ORIGIN = 'https://neural-trade-39s2.onrender.com'

function getDefaultApiOrigin() {
  if (typeof window === 'undefined') {
    return 'http://localhost:5050'
  }

  const { hostname } = window.location
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5050'
  }

  return PROD_BACKEND_ORIGIN
}

const apiOrigin = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL
const fallbackApiOrigin = getDefaultApiOrigin()

const normalizedApiOrigin = apiOrigin
  ? apiOrigin.replace(/\/api\/?$/, '')
  : fallbackApiOrigin.replace(/\/api\/?$/, '')

const baseURL = normalizedApiOrigin + '/api'

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
