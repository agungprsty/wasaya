import { sessionManager } from '../whatsapp/session-manager'

const serverStartTime = Date.now()

export default defineEventHandler(() => {
  const sessions = sessionManager.getAllSessionInfo()
  const readySessions = sessions.filter((s) => s.ready)
  const memory = process.memoryUsage()

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - serverStartTime) / 1000),
    environment: process.env.NODE_ENV || 'development',
    sessions: {
      total: sessions.length,
      connected: readySessions.length,
    },
    memory: {
      rss: memory.rss,
      heapTotal: memory.heapTotal,
    },
  }
})
