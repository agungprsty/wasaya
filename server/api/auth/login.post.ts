import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pg } from '../../utils/postgrest'
import { loginSchema } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = loginSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues.map((i) => i.message).join(', '),
    })
  }

  const user = await pg.findByColumn<any>('users', 'email', parsed.data.email)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Invalid credentials' })
  }

  if (!user.is_active) {
    throw createError({ statusCode: 401, message: 'Account is disabled' })
  }

  const validPassword = await bcrypt.compare(parsed.data.password, user.password)
  if (!validPassword) {
    throw createError({ statusCode: 401, message: 'Invalid credentials' })
  }

  const jwtSecret = process.env.JWT_SECRET || ''
  const token = jwt.sign({ userId: user.id, email: user.email }, jwtSecret, {
    expiresIn: '7d',
  })

  return {
    success: true,
    token,
    user: { id: user.id, email: user.email, name: user.name },
  }
})
