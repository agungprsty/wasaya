import jwt from 'jsonwebtoken'
import { pg } from '../utils/postgrest'

const API_KEY_HEADER = 'x-api-key'

export async function authenticateRequest(event: H3Event): Promise<{ userId: string; email: string; name: string } | null> {
  const providedKey = getHeader(event, API_KEY_HEADER)
  if (!providedKey) return null

  // Try API key first
  const key = await pg.findByColumn<any>('api_keys', 'key', providedKey)
  if (key && key.is_active) {
    const user = await pg.findByColumn<any>('users', 'id', key.user_id)
    if (user && user.is_active) {
      await pg.updateByColumn('api_keys', 'id', key.id, {
        last_used_at: new Date().toISOString(),
      })
      return { userId: user.id, email: user.email, name: user.name }
    }
  }

  // Try JWT
  const jwtSecret = process.env.JWT_SECRET || ''
  try {
    const decoded = jwt.verify(providedKey, jwtSecret) as { userId: string; email: string }
    return { userId: decoded.userId, email: decoded.email, name: '' }
  } catch {
    return null
  }
}

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // Skip auth for non-API routes (pages, assets, etc.) and public endpoints
  if (
    !path.startsWith('/api/') ||
    path === '/api/health' ||
    path === '/api/auth/login' ||
    path === '/api/auth/register'
  ) {
    return
  }

  const user = await authenticateRequest(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Invalid or missing API key',
    })
  }

  event.context.auth = user
})
