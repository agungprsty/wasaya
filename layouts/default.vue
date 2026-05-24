<script setup lang="ts">

const authStore = useAuthStore()
const route = useRoute()
const colorMode = useColorMode()

onMounted(() => {
  authStore.init()
})

// Initialize theme from localStorage
const storedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : 'dark'
if (storedTheme && storedTheme !== colorMode.value) {
  colorMode.preference = storedTheme as 'dark' | 'light'
}

const isDark = computed(() => colorMode.value === 'dark')

function toggleTheme() {
  const newTheme = isDark.value ? 'light' : 'dark'
  colorMode.preference = newTheme
  localStorage.setItem('theme', newTheme)
}

const pageTitles: Record<string, string> = {
  'dashboard': 'Overview',
  'sessions': 'Sessions',
  'device': 'Device Link',
  'send': 'Kirim Pesan',
  'webhook': 'Webhook',
}

const pageTitle = computed(() => {
  const name = route.name as string
  return pageTitles[name] || 'Dashboard'
})
</script>

<template>
  <div :class="['min-h-screen flex', isDark ? 'bg-[#0b141a] text-slate-200' : 'bg-[#f8fafc] text-slate-700']">
    <AppSidebar />

    <main class="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <header
        :class="[
          'h-16 border-b flex items-center justify-between px-6',
          isDark
            ? 'border-[#222e35] bg-[#111b21]/50 backdrop-blur'
            : 'border-slate-200 bg-white/80 backdrop-blur',
        ]"
      >
        <h1 :class="['text-lg font-semibold', isDark ? 'text-white' : 'text-slate-900']">{{ pageTitle }}</h1>

        <div class="flex items-center space-x-3">
          <!-- Theme Toggle -->
          <button
            @click="toggleTheme"
            :class="[
              'w-9 h-9 rounded-xl flex items-center justify-center transition',
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-[#202c33]'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
            ]"
            :title="isDark ? 'Light Mode' : 'Dark Mode'"
          >
            <i :class="['fas text-sm', isDark ? 'fa-moon' : 'fa-sun']"></i>
          </button>

          <!-- User Avatar -->
          <div
            v-if="authStore.user"
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border',
              isDark
                ? 'bg-slate-700 text-emerald-400 border-[#222e35]'
                : 'bg-emerald-100 text-emerald-600 border-slate-200',
            ]"
          >
            {{ authStore.user.name ? authStore.user.name.charAt(0).toUpperCase() : 'U' }}
          </div>
        </div>
      </header>

      <div class="p-6 space-y-6 max-w-7xl w-full mx-auto">
        <slot />
      </div>
    </main>
  </div>
</template>
