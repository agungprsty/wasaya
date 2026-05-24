import { defineStore } from 'pinia'
interface Session {
  id: string
  name: string
  status: string
  ready: boolean
  hasQr: boolean
  hasWebhook: boolean
  webhookUrl: string | null
  createdAt: string
}

export const useSessionsStore = defineStore('sessions', () => {
  const sessions = ref<Session[]>([])
  const loading = ref(false)

  async function fetchSessions() {
    loading.value = true
    try {
      const data = await $fetch('/api/whatsapp/sessions')
      if ((data as any)?.success) {
        sessions.value = (data as any).sessions
      }
    } finally {
      loading.value = false
    }
  }

  async function createSession(id: string, name: string) {
    const data = await $fetch('/api/whatsapp/sessions', {
      method: 'POST',
      body: { id, name },
    })
    await fetchSessions()
    return data
  }

  async function deleteSession(id: string) {
    const data = await $fetch(`/api/whatsapp/sessions/${id}`, {
      method: 'DELETE',
    })
    await fetchSessions()
    return data
  }

  async function restartSession(id: string) {
    return await $fetch(`/api/whatsapp/sessions/${id}/restart`, {
      method: 'POST',
    })
  }

  async function logoutSession(id: string) {
    return await $fetch(`/api/whatsapp/sessions/${id}/logout`, {
      method: 'POST',
    })
  }

  const sessionList = computed(() => sessions.value)
  const sessionCount = computed(() => sessions.value.length)
  const connectedCount = computed(() => sessions.value.filter((s) => s.ready).length)

  return {
    sessions,
    loading,
    sessionList,
    sessionCount,
    connectedCount,
    fetchSessions,
    createSession,
    deleteSession,
    restartSession,
    logoutSession,
  }
})
