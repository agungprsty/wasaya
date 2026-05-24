import { sessionManager } from '../../whatsapp/session-manager'
import { webhookSchema } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = webhookSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues.map((i) => i.message).join(', '),
    })
  }

  await sessionManager.setWebhook(parsed.data.sessionId, {
    url: parsed.data.url,
    events: parsed.data.events,
    isActive: true,
  })

  return {
    success: true,
    message: 'Webhook configured',
    webhook: {
      sessionId: parsed.data.sessionId,
      url: parsed.data.url,
      events: parsed.data.events,
    },
  }
})
