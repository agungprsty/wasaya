import wweb from 'whatsapp-web.js'
const { Client, LocalAuth, Message, MessageMedia } = wweb
import { join } from 'path'
import { logger } from '../utils/logger'
import type { WhatsAppStatus, MediaAttachment, IncomingMessage } from './types'

export type MessageHandler = (msg: IncomingMessage) => void
export type StateChangeHandler = (state: { status: string; qr?: string; error?: string }) => void

export class WhatsAppClientWrapper {
  private client: Client
  private sessionId: string
  private qrCode: string | null = null
  private isReady = false
  private connectionState: { status: string; qr?: string; error?: string } = {
    status: 'disconnected',
  }
  private onStateChange?: StateChangeHandler
  private onMessageReceived?: MessageHandler

  constructor(sessionId: string = 'default') {
    this.sessionId = sessionId
    const sessionPath = process.env.SESSION_PATH || './data/.session'

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: join(sessionPath, sessionId),
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-default-browser-check',
        ],
        processSingleton: false,
      },
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    this.client.on('qr', (qr: string) => {
      this.qrCode = qr
      this.connectionState = { status: 'qr', qr }
      logger.info({ sessionId: this.sessionId }, 'QR code received')
      this.onStateChange?.(this.connectionState)
    })

    this.client.on('ready', () => {
      this.isReady = true
      this.qrCode = null
      this.connectionState = { status: 'ready' }
      logger.info({ sessionId: this.sessionId }, 'WhatsApp client is ready')
      this.onStateChange?.(this.connectionState)
    })

    this.client.on('authenticated', () => {
      logger.info({ sessionId: this.sessionId }, 'WhatsApp authenticated')
      this.connectionState = { status: 'authenticated' }
      this.onStateChange?.(this.connectionState)
    })

    this.client.on('disconnected', (reason: string) => {
      this.isReady = false
      this.connectionState = { status: 'disconnected', error: reason }
      logger.warn({ sessionId: this.sessionId, reason }, 'WhatsApp disconnected')
      this.onStateChange?.(this.connectionState)
    })

    this.client.on('failure', (error: Error) => {
      this.isReady = false
      this.connectionState = { status: 'failure', error: error.message }
      logger.error({ sessionId: this.sessionId, error: error.message }, 'WhatsApp failure')
      this.onStateChange?.(this.connectionState)
    })

    this.client.on('message', async (msg: Message) => {
      try {
        const incoming: IncomingMessage = {
          messageId: msg.id._serialized,
          from: msg.from,
          body: msg.body,
          timestamp: msg.timestamp,
          type: msg.type,
          isMedia: msg.hasMedia,
        }

        if (msg.hasMedia) {
          const media = await msg.downloadMedia()
          if (media) {
            incoming.media = {
              mimetype: media.mimetype,
              filename: media.filename ?? undefined,
              data: media.data,
            }
          }
        }

        this.onMessageReceived?.(incoming)
      } catch (error) {
        logger.error(
          { sessionId: this.sessionId, error },
          'Error processing incoming message'
        )
      }
    })
  }

  async initialize(): Promise<void> {
    logger.info({ sessionId: this.sessionId }, 'Initializing WhatsApp client')
    await this.client.initialize()
  }

  async sendMessage(phone: string, message: string): Promise<string> {
    const formattedPhone = this.formatPhoneNumber(phone)
    const chatId = `${formattedPhone}@c.us`
    const msg: Message = await this.client.sendMessage(chatId, message)
    return msg.id._serialized
  }

  async sendMedia(phone: string, media: MediaAttachment, caption?: string): Promise<string> {
    const formattedPhone = this.formatPhoneNumber(phone)
    const chatId = `${formattedPhone}@c.us`
    const messageMedia = new MessageMedia(media.mimetype, media.data, media.filename)
    const msg: Message = await this.client.sendMessage(chatId, messageMedia, {
      caption,
    })
    return msg.id._serialized
  }

  formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1)
    }
    if (!cleaned.startsWith('62')) {
      cleaned = '62' + cleaned
    }
    return cleaned
  }

  async logout(): Promise<void> {
    await this.client.logout()
  }

  async destroy(): Promise<void> {
    await this.client.destroy()
  }

  getStatus(): WhatsAppStatus {
    return {
      ready: this.isReady,
      qr: this.qrCode,
      sessionExists: this.qrCode === null,
    }
  }

  setStateChangeCallback(callback: StateChangeHandler): void {
    this.onStateChange = callback
  }

  setMessageHandler(handler: MessageHandler): void {
    this.onMessageReceived = handler
  }

  getConnectionState(): { status: string; qr?: string; error?: string } {
    return this.connectionState
  }

  isClientReady(): boolean {
    return this.isReady
  }

  getSessionId(): string {
    return this.sessionId
  }
}
