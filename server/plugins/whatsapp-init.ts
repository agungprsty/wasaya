import { sessionManager } from '../whatsapp/session-manager'
import { logger } from '../utils/logger'

export default defineNitroPlugin(async () => {
  logger.info('Initializing WhatsApp Gateway...')

  try {
    await sessionManager.initializeDefaultSession()
    const defaultClient = await sessionManager.createSession('default', 'Default Session')
    await defaultClient.initialize()
    logger.info('Default WhatsApp session initialized')
  } catch (error) {
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      cause: error instanceof Error && 'cause' in error ? error.cause : undefined,
    }
    logger.error({ error: errorDetails }, 'Failed to initialize default WhatsApp session')

    // Don't let the initialization failure crash the whole app
    // The session will be created on first use
  }
})
