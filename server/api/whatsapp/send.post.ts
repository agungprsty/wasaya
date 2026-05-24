import { sessionManager } from '../../whatsapp/session-manager'
import { sendMessageSchema } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = sendMessageSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues.map((i) => i.message).join(', '),
    })
  }

  const client = sessionManager.getSession(parsed.data.sessionId || 'default')
  if (!client) {
    throw createError({ statusCode: 404, message: 'Session not found' })
  }

  if (!client.isClientReady()) {
    throw createError({ statusCode: 400, message: 'WhatsApp client is not ready' })
  }

  const messageId = await client.sendMessage(parsed.data.phone, parsed.data.message)

  return { success: true, messageId }
})
