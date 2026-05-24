import { sessionManager } from '../../whatsapp/session-manager'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const sessionId = (body as { sessionId?: string })?.sessionId || 'default'

  await sessionManager.removeWebhook(sessionId)

  return { success: true, message: 'Webhook removed' }
})
