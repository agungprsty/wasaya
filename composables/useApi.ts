export function useApi() {
  const authStore = useAuthStore()

  async function call<T = any>(
    url: string,
    options: { method?: string; body?: any } = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (authStore.token) {
      headers['X-API-Key'] = authStore.token
    }

    try {
      return await $fetch(url, {
        ...options,
        headers,
      })
    } catch (error: any) {
      if (error?.response?.status === 401) {
        authStore.logout()
        navigateTo('/login')
      }
      throw error
    }
  }

  return { call }
}
