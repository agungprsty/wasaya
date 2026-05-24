import { sessionManager } from '../../../whatsapp/session-manager'
import { pg } from '../../../utils/postgrest'

export default defineEventHandler(async () => {
  const sessions = sessionManager.getAllSessionInfo()

  let dbSessions: any[] = []
  try {
    dbSessions = await pg.get<any[]>('whatsapp_sessions', {
      where: "id IS NOT NULL AND id != ''",
      order: 'created_at ASC',
    })
  } catch {
    // DB might not be available
  }

  const enriched = sessions.map((s) => {
    const db = dbSessions?.find((d: any) => d.id === s.id)
    return {
      ...s,
      name: db?.name || s.name,
    }
  })

  return { success: true, sessions: enriched }
})
