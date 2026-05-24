import { defineStore } from 'pinia'
export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const user = ref<{ id: string; email: string; name: string } | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  function init() {
    if (import.meta.client) {
      const saved = localStorage.getItem('auth')
      if (saved) {
        try {
          const data = JSON.parse(saved)
          token.value = data.token
          user.value = data.user
        } catch {
          localStorage.removeItem('auth')
        }
      }
    }
  }

  function setAuth(newToken: string, newUser: { id: string; email: string; name: string }) {
    token.value = newToken
    user.value = newUser
    if (import.meta.client) {
      localStorage.setItem('auth', JSON.stringify({ token: newToken, user: newUser }))
    }
  }

  function logout() {
    token.value = null
    user.value = null
    if (import.meta.client) {
      localStorage.removeItem('auth')
    }
  }

  return { token, user, isAuthenticated, init, setAuth, logout }
})
