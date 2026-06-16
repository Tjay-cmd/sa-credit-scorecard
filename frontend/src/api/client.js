import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 120000,
})

export const getHealth = () => api.get('/health').then((r) => r.data)
export const trainModel = () => api.post('/train', {}).then((r) => r.data)
export const getModelStats = () => api.get('/model/stats').then((r) => r.data)
export const getWoeTables = () => api.get('/model/woe-tables').then((r) => r.data)
export const getInclusionAnalysis = () =>
  api.get('/inclusion-analysis').then((r) => r.data)
export const scoreApplicant = (applicant) =>
  api.post('/score', applicant).then((r) => r.data)

export default api
