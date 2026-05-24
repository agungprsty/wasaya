import { sessionManager } from '../../../../whatsapp/session-manager'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const client = sessionManager.getSession(id)

  if (!client) {
    throw createError({ statusCode: 404, message: `Session '${id}' not found` })
  }

  const status = client.getStatus()
  const state = client.getConnectionState()

  return {
    success: true,
    sessionId: id,
    ready: status.ready,
    sessionExists: status.sessionExists,
    hasQr: status.qr !== null,
    status: state.status,
  }
})
