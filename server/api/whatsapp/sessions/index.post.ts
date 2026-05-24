import { sessionManager } from '../../../whatsapp/session-manager'
import { createSessionSchema } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = createSessionSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues.map((i) => i.message).join(', '),
    })
  }

  const client = await sessionManager.createSession(parsed.data.id, parsed.data.name)
  await client.initialize()
  const state = client.getConnectionState()

  return {
    success: true,
    session: {
      id: parsed.data.id,
      name: parsed.data.name,
      status: state.status,
      ready: client.isClientReady(),
      createdAt: new Date().toISOString(),
    },
  }
})
