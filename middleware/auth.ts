export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore()
  authStore.init()

  if (!authStore.isAuthenticated) {
    return navigateTo('/login')
  }
})
