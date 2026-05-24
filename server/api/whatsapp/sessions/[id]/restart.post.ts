import { sessionManager } from '../../../../whatsapp/session-manager'
import { existsSync, rmSync } from 'fs'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)

  try {
    const client = sessionManager.getSession(id)
    if (client) {
      await client.destroy()
    }
  } catch (e) {
    // ignore
  }

  const sessionPath = process.env.SESSION_PATH || './data/.session'
  const sessionDir = join(sessionPath, id)
  if (existsSync(sessionDir)) {
    try {
      rmSync(sessionDir, { recursive: true, force: true })
    } catch (e) {
      // ignore
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 1000))

  await sessionManager.removeSession(id)
  const newClient = await sessionManager.createSession(id, id)
  await newClient.initialize()

  return { success: true, message: 'Restart initiated' }
})
