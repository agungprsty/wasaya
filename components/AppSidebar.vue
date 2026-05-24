<script setup lang="ts">

const authStore = useAuthStore()
const route = useRoute()
const colorMode = useColorMode()

const isDark = computed(() => colorMode.value === 'dark')

const navItems = [
  { path: '/dashboard', label: 'Overview', icon: 'chart-pie' },
  { path: '/sessions', label: 'Sessions', icon: 'layer-group' },
  { path: '/device', label: 'Device Link', icon: 'qrcode' },
  { path: '/send', label: 'Kirim Pesan', icon: 'paper-plane' },
  { path: '/webhook', label: 'Webhook', icon: 'bolt' },
]

function isActive(path: string) {
  return route.path === path
}

function handleLogout() {
  authStore.logout()
  navigateTo('/login')
}

function toggleTheme() {
  const newTheme = isDark.value ? 'light' : 'dark'
  colorMode.preference = newTheme
  localStorage.setItem('theme', newTheme)
}
</script>

<template>
  <aside
    :class="[
      'w-64 hidden md:flex flex-col justify-between p-6 border-r transition-colors duration-200',
      isDark
        ? 'bg-[#111b21] border-[#222e35]'
        : 'bg-white border-slate-200',
    ]"
  >
    <div class="space-y-8">
      <div class="flex items-center space-x-2 px-2">
        <i class="fab fa-whatsapp text-emerald-500 text-2xl"></i>
        <span :class="['text-lg font-bold tracking-tight', isDark ? 'text-white' : 'text-slate-900']">
          WA<span class="text-emerald-500">Blaster</span>
        </span>
      </div>

      <nav class="space-y-1">
        <NuxtLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          :class="[
            'flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition',
            isActive(item.path)
              ? isDark
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-emerald-50 text-emerald-600'
              : isDark
                ? 'text-slate-400 hover:bg-[#202c33] hover:text-slate-200'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
          ]"
        >
          <i :class="['fas', `fa-${item.icon}`, 'w-5']"></i>
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>
    </div>

    <div :class="['border-t pt-4', isDark ? 'border-[#222e35]' : 'border-slate-200']">
      <!-- Theme Toggle -->
      <button
        @click="toggleTheme"
        :class="[
          'w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition mb-2',
          isDark
            ? 'text-slate-400 hover:bg-[#202c33] hover:text-white'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
        ]"
        :title="isDark ? 'Light Mode' : 'Dark Mode'"
      >
        <i :class="['fas', isDark ? 'fa-moon' : 'fa-sun', 'w-5']"></i>
        <span>{{ isDark ? 'Light Mode' : 'Dark Mode' }}</span>
      </button>

      <!-- Logout -->
      <button
        @click="handleLogout"
        class="w-full flex items-center space-x-3 text-rose-400 hover:bg-rose-500/10 px-4 py-3 rounded-xl font-medium transition"
      >
        <i class="fas fa-sign-out-alt w-5"></i>
        <span>Keluar</span>
      </button>
    </div>
  </aside>
</template>
