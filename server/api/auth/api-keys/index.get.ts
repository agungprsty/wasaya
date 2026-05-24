import { pg } from '../../../utils/postgrest'

export default defineEventHandler(async (event) => {
  const user = event.context.auth
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { rows: keys } = await pg.query<any>(
    `SELECT * FROM api_keys WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC`,
    [user.userId]
  )

  const maskedKeys = (keys || []).map((k: any) => ({
    id: k.id,
    name: k.name,
    key: k.key.substring(0, 8) + '...' + k.key.substring(k.key.length - 4),
    createdAt: k.created_at,
    lastUsedAt: k.last_used_at,
    expiresAt: k.expires_at,
  }))

  return { success: true, apiKeys: maskedKeys }
})
