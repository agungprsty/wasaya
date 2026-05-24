import bcrypt from 'bcryptjs'
import { pg } from '../../utils/postgrest'
import { registerSchema } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = registerSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues.map((i) => i.message).join(', '),
    })
  }

  const existing = await pg.findByColumn<any>('users', 'email', parsed.data.email)
  if (existing) {
    throw createError({ statusCode: 400, message: 'Email already registered' })
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10)

  const user = await pg.create<any>('users', {
    email: parsed.data.email,
    password: hashedPassword,
    name: parsed.data.name,
  })

  return {
    success: true,
    message: 'Registration successful',
    user: { id: user.id, email: user.email, name: user.name },
  }
})
