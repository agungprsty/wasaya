export interface WhatsAppStatus {
  ready: boolean
  qr: string | null
  sessionExists: boolean
}

export interface MediaAttachment {
  mimetype: string
  data: string
  filename?: string
}

export interface SendMessageRequest {
  phone: string
  message: string
  sessionId?: string
}

export interface SendMediaRequest {
  phone: string
  message?: string
  media: MediaAttachment
  sessionId?: string
}

export interface SessionInfo {
  id: string
  name: string
  status: string
  ready: boolean
  hasQr: boolean
  hasWebhook: boolean
  webhookUrl: string | null
  createdAt: string
}

export interface IncomingMessage {
  messageId: string
  from: string
  body: string
  timestamp: number
  type: string
  isMedia: boolean
  media?: {
    mimetype: string
    filename?: string
    data: string
  }
}

export interface WebhookConfig {
  url: string
  events: string[]
  isActive: boolean
}

export interface WebhookPayload {
  event: string
  sessionId: string
  data: Record<string, unknown>
  timestamp: string
}
