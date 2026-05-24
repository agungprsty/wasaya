import { pg } from '../../../utils/postgrest'

export default defineEventHandler(async (event) => {
  const user = event.context.auth
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const keyId = query.id as string

  if (!keyId) {
    throw createError({ statusCode: 400, message: 'API key ID required' })
  }

  await pg.updateByColumn('api_keys', 'id', keyId, { is_active: false })

  return { success: true, message: 'API key revoked' }
})
