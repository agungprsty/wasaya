import { pg } from '../../../utils/postgrest'
import { createApiKeySchema } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  const user = event.context.auth
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const parsed = createApiKeySchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues.map((i) => i.message).join(', '),
    })
  }

  const apiKeyValue = crypto.randomUUID().replace(/-/g, '')
  const expiresAt = parsed.data.expiresIn
    ? new Date(Date.now() + parsed.data.expiresIn * 1000).toISOString()
    : null

  const createdKey = await pg.create<any>('api_keys', {
    user_id: user.userId,
    key: apiKeyValue,
    name: parsed.data.name,
    expires_at: expiresAt,
  })

  return {
    success: true,
    apiKey: {
      id: createdKey.id,
      key: apiKeyValue,
      name: createdKey.name,
      expiresAt: createdKey.expires_at,
    },
  }
})
