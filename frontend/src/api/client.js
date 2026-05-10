import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

let refreshPromise = null

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`

  // FormData + Content-Type: application/json (default) rompe multipart en DRF.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type')
    } else {
      delete config.headers['Content-Type']
    }
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = sessionStorage.getItem('refresh_token')
      if (!refresh) {
        sessionStorage.clear()
        window.location.href = '/login'
        return Promise.reject(err)
      }
      refreshPromise ??= api.post('/auth/token/refresh/', { refresh })
      try {
        const { data } = await refreshPromise
        refreshPromise = null
        sessionStorage.setItem('access_token', data.access)
        sessionStorage.setItem('refresh_token', data.refresh)
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
      } catch (e) {
        refreshPromise = null
        sessionStorage.clear()
        window.location.href = '/login'
        return Promise.reject(e)
      }
    }
    return Promise.reject(err)
  }
)

export default api
