import { defineStore } from 'pinia'
export const useWebhookStore = defineStore('webhook', () => {
  const currentConfig = ref<{
    sessionId: string
    url: string
    events: string[]
    isActive: boolean
  } | null>(null)

  async function fetchWebhook(sessionId: string) {
    try {
      const data = await $fetch(`/api/webhook?sessionId=${sessionId}`)
      if ((data as any)?.success) {
        currentConfig.value = (data as any).webhook
      }
    } catch {
      currentConfig.value = null
    }
  }

  async function setWebhook(sessionId: string, url: string, events: string[]) {
    const data = await $fetch('/api/webhook', {
      method: 'POST',
      body: { sessionId, url, events },
    })
    await fetchWebhook(sessionId)
    return data
  }

  async function removeWebhook(sessionId: string) {
    const data = await $fetch('/api/webhook', {
      method: 'DELETE',
      body: { sessionId },
    })
    currentConfig.value = null
    return data
  }

  return { currentConfig, fetchWebhook, setWebhook, removeWebhook }
})
