export default defineNuxtConfig({
  devtools: { enabled: false },
  ssr: true,
  srcDir: './',

  compatibilityDate: '2026-05-23',

  modules: ['@nuxtjs/tailwindcss'],

  tailwindcss: {
    configPath: 'tailwind.config.ts',
    cssPath: '~/assets/css/tailwind.css',
  },

  app: {
    head: {
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
        },
        {
          rel: 'stylesheet',
          href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
        },
      ],
    },
  },
})
