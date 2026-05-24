import { z } from 'zod'

export const sendMessageSchema = z.object({
  phone: z.string().min(8, 'Phone number minimal 8 digits'),
  message: z.string().min(1, 'Message tidak boleh kosong'),
  sessionId: z.string().optional(),
})

export const sendMediaSchema = z.object({
  phone: z.string().min(8, 'Phone number minimal 8 digits'),
  message: z.string().optional(),
  media: z.object({
    mimetype: z.string().min(1),
    data: z.string().min(1),
    filename: z.string().optional(),
  }),
  sessionId: z.string().optional(),
})

export const createSessionSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, hyphens, underscores'),
  name: z.string().min(1).max(255),
})

export const webhookSchema = z.object({
  sessionId: z.string().min(1).default('default'),
  url: z.string().url('Must be a valid URL'),
  events: z
    .array(z.enum(['message', 'message_ack', 'message_media', 'status']))
    .default(['message']),
})

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export const createApiKeySchema = z.object({
  name: z.string().min(1),
  expiresIn: z.number().optional(),
})
