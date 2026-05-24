import { sessionManager } from '../../../../whatsapp/session-manager'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const client = sessionManager.getSession(id)

  if (!client) {
    throw createError({ statusCode: 404, message: `Session '${id}' not found` })
  }

  const status = client.getStatus()

  if (status.ready) {
    return {
      success: true,
      ready: true,
      sessionId: id,
      message: 'WhatsApp already connected',
    }
  }

  if (!status.qr) {
    throw createError({
      statusCode: 404,
      message: 'No QR code available. Restart device to generate new QR.',
    })
  }

  return {
    success: true,
    ready: false,
    sessionId: id,
    qr: status.qr,
  }
})
