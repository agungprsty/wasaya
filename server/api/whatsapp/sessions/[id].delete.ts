import { sessionManager } from '../../../whatsapp/session-manager'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)

  if (id === 'default') {
    throw createError({ statusCode: 400, message: 'Cannot delete default session' })
  }

  await sessionManager.removeSession(id)

  return { success: true, message: `Session '${id}' deleted` }
})
