export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:created', () => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
    if (!document.head.querySelector('[href*="font-awesome"]')) {
      document.head.appendChild(link)
    }
  })
})
