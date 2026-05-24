import { sessionManager } from '../../whatsapp/session-manager'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const sessionId = (query.sessionId as string) || 'default'

  const config = sessionManager.getWebhook(sessionId)

  return {
    success: true,
    webhook: config
      ? { sessionId, url: config.url, events: config.events, isActive: config.isActive }
      : null,
  }
})
