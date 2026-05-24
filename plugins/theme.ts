export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:created', () => {
    const colorMode = useColorMode()
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('themePreference')
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        colorMode.preference = stored as 'light' | 'dark' | 'system'
      }
      else {
        colorMode.preference = 'light'
      }
    }
  })

  watch(
    () => useColorMode().preference,
    (pref) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('themePreference', pref as string)
      }
    },
  )

  watch(
    () => useColorMode().value,
    () => {
      const isDark = useColorMode().value === 'dark'
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('theme-light', !isDark)
      }
    },
    { immediate: true },
  )
})
