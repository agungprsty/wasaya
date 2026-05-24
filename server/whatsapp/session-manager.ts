import { WhatsAppClientWrapper } from './client'
import { logger } from '../utils/logger'
import { pg } from '../utils/postgrest'
import type { IncomingMessage, WebhookConfig } from './types'

interface SessionCache {
  client: WhatsAppClientWrapper
  webhook: WebhookConfig | null
}

class SessionManagerSingleton {
  private sessions: Map<string, SessionCache> = new Map()

  async createSession(id: string, name: string): Promise<WhatsAppClientWrapper> {
    if (this.sessions.has(id)) {
      throw new Error(`Session '${id}' already exists`)
    }

    const client = new WhatsAppClientWrapper(id)
    this.sessions.set(id, { client, webhook: null })

    client.setStateChangeCallback((state) => {
      this.handleStateChange(id, state.status)
    })

    client.setMessageHandler((msg) => {
      this.handleIncomingMessage(id, msg)
    })

    await this.ensureSessionInDb(id, name)

    return client
  }

  getSession(id: string): WhatsAppClientWrapper | undefined {
    return this.sessions.get(id)?.client
  }

  getAllSessions(): WhatsAppClientWrapper[] {
    return Array.from(this.sessions.values()).map((s) => s.client)
  }

  getAllSessionInfo() {
    return Array.from(this.sessions.entries()).map(([id, cache]) => {
      const client = cache.client
      const status = client.getStatus()
      const state = client.getConnectionState()
      return {
        id,
        name: id,
        status: state.status,
        ready: status.ready,
        hasQr: status.qr !== null,
        sessionExists: status.sessionExists,
        webhookUrl: cache.webhook?.url || null,
        hasWebhook: cache.webhook !== null,
        createdAt: new Date().toISOString(),
      }
    })
  }

  async removeSession(id: string): Promise<void> {
    const cache = this.sessions.get(id)
    if (!cache) return

    try {
      await cache.client.destroy()
    } catch (error) {
      logger.warn({ sessionId: id, error }, 'Error destroying client on removal')
    }

    this.sessions.delete(id)

    try {
      await pg.updateByColumn('whatsapp_sessions', 'id', id, {
        is_active: false,
        updated_at: new Date().toISOString(),
      })
    } catch (error) {
      logger.warn({ sessionId: id, error }, 'Error updating session in DB')
    }
  }

  async setWebhook(id: string, config: WebhookConfig): Promise<void> {
    const cache = this.sessions.get(id)
    if (!cache) throw new Error(`Session '${id}' not found`)

    cache.webhook = config

    try {
      await pg.updateByColumn('whatsapp_sessions', 'id', id, {
        webhook_url: config.url,
        webhook_events: config.events.join(','),
        updated_at: new Date().toISOString(),
      })
    } catch (error) {
      logger.warn({ sessionId: id, error }, 'Error saving webhook config to DB')
    }
  }

  getWebhook(id: string): WebhookConfig | null {
    return this.sessions.get(id)?.webhook ?? null
  }

  async removeWebhook(id: string): Promise<void> {
    const cache = this.sessions.get(id)
    if (!cache) return
    cache.webhook = null

    try {
      await pg.updateByColumn('whatsapp_sessions', 'id', id, {
        webhook_url: null,
        webhook_events: null,
        updated_at: new Date().toISOString(),
      })
    } catch (error) {
      logger.warn({ sessionId: id, error }, 'Error removing webhook')
    }
  }

  private async handleStateChange(sessionId: string, status: string): Promise<void> {
    try {
      await pg.updateByColumn('whatsapp_sessions', 'id', sessionId, {
        status,
        updated_at: new Date().toISOString(),
      })
    } catch (error) {
      logger.warn({ sessionId: sessionId, error }, 'Error updating session status in DB')
    }
  }

  private async handleIncomingMessage(sessionId: string, msg: IncomingMessage): Promise<void> {
    const cache = this.sessions.get(sessionId)
    if (!cache || !cache.webhook || !cache.webhook.isActive) return
    if (!cache.webhook.events.includes('message')) return

    try {
      const payload = {
        event: msg.isMedia ? 'message_media' : 'message',
        sessionId,
        data: msg as unknown as Record<string, unknown>,
        timestamp: new Date().toISOString(),
      }

      const response = await fetch(cache.webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      logger.info(
        { sessionId, webhookUrl: cache.webhook.url, statusCode: response.status },
        'Webhook delivered'
      )

      this.logWebhook(sessionId, 'message', response.status, 'OK', payload)
    } catch (error) {
      const err = error as Error
      logger.error(
        { sessionId, webhookUrl: cache.webhook.url, error: err.message },
        'Webhook delivery failed'
      )
      this.logWebhook(sessionId, 'message', 0, err.message, null)
    }
  }

  private async logWebhook(
    sessionId: string,
    event: string,
    statusCode: number,
    response: string,
    payload: Record<string, unknown> | null
  ): Promise<void> {
    try {
      await pg.create('webhook_logs', {
        session_id: sessionId,
        event,
        status_code: String(statusCode),
        response,
        payload: payload ? JSON.stringify(payload).substring(0, 4096) : null,
      })
    } catch (error) {
      logger.warn({ sessionId, error }, 'Error logging webhook delivery')
    }
  }

  private async ensureSessionInDb(id: string, name: string): Promise<void> {
    try {
      const existing = await pg.findByColumn<any>('whatsapp_sessions', 'id', id)
      if (!existing) {
        await pg.create('whatsapp_sessions', {
          id,
          name,
          status: 'disconnected',
        })
      } else {
        await pg.updateByColumn('whatsapp_sessions', 'id', id, {
          is_active: true,
          updated_at: new Date().toISOString(),
        })
      }
    } catch (error) {
      logger.warn({ sessionId: id, error }, 'Error ensuring session in DB')
    }
  }

  async initializeDefaultSession(): Promise<void> {
    await this.ensureSessionInDb('default', 'Default Session')
  }

  async destroyAll(): Promise<void> {
    const destroyPromises = Array.from(this.sessions.entries()).map(
      async ([id, cache]) => {
        try {
          await cache.client.destroy()
        } catch (error) {
          logger.warn({ sessionId: id, error }, 'Error destroying client')
        }
      }
    )
    await Promise.all(destroyPromises)
    this.sessions.clear()
  }
}

export const sessionManager = new SessionManagerSingleton()
