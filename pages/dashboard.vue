<script setup lang="ts">

const authStore = useAuthStore()
authStore.init()

definePageMeta({ middleware: 'auth' })

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
const showThemeDropdown = ref(false)

const sessionsStore = useSessionsStore()
const health = ref<any>(null)

onMounted(async () => {
  try {
    health.value = await $fetch('/api/health')
  }
  catch {
    // ignore
  }
  sessionsStore.fetchSessions()
})

const themeOptions: Array<{ value: 'light' | 'dark' | 'system'; icon: string }> = [
  { value: 'light', icon: 'fa-sun' },
  { value: 'dark', icon: 'fa-moon' },
  { value: 'system', icon: 'fa-desktop' },
]

function setTheme(value: 'light' | 'dark' | 'system') {
  colorMode.preference = value
  showThemeDropdown.value = false
}

const currentIcon = computed(() => {
  const pref = colorMode.preference as string
  const opt = themeOptions.find(o => o.value === pref)
  return opt?.icon || 'fa-desktop'
})
</script>

<template>
  <div class="space-y-6">
    <!-- Top bar -->
    <div class="flex items-center justify-between mb-2">
      <h2 :class="['text-xl font-semibold', isDark ? 'text-white' : 'text-slate-900']">Dashboard</h2>
      <div class="relative">
        <button
          @click="showThemeDropdown = !showThemeDropdown"
          :class="[
            'w-9 h-9 rounded-xl flex items-center justify-center transition',
            isDark ? 'text-slate-400 hover:text-white hover:bg-[#202c33]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
          ]"
        >
          <i :class="['fas', currentIcon, 'text-sm']"></i>
        </button>
        <div v-if="showThemeDropdown" :class="[
          'absolute right-0 top-10 w-36 rounded-xl border shadow-lg overflow-hidden z-20',
          isDark ? 'bg-[#1b2838] border-[#444c56]' : 'bg-white border-slate-200',
        ]">
          <button
            v-for="opt in themeOptions"
            :key="opt.value"
            @click="setTheme(opt.value)"
            :class="[
              'w-full text-left px-4 py-2.5 text-sm flex items-center space-x-3 transition',
              colorMode.preference === opt.value
                ? (isDark ? 'bg-[#202c33] text-white' : 'bg-emerald-50 text-emerald-700')
                : (isDark ? 'text-slate-400 hover:bg-[#202c33] hover:text-white' : 'text-slate-600 hover:bg-slate-50'),
            ]"
          >
            <i :class="['fas', opt.icon, 'w-4 text-center']"></i>
            <span>{{ opt.value.charAt(0).toUpperCase() + opt.value.slice(1) }}</span>
            <i v-if="colorMode.preference === opt.value" class="fas fa-check ml-auto text-emerald-500"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div
        :class="[
          'p-5 rounded-2xl flex items-center justify-between border transition-colors duration-200',
          isDark ? 'bg-[#111b21] border-[#222e35]' : 'bg-white border-slate-200',
        ]"
      >
        <div>
          <p class="text-xs font-medium uppercase tracking-wider" :class="isDark ? 'text-slate-400' : 'text-slate-500'">Sessions Aktif</p>
          <h3 class="text-2xl font-bold mt-1" :class="isDark ? 'text-white' : 'text-slate-900'">
            {{ sessionsStore.connectedCount }} / {{ sessionsStore.sessionCount }}
          </h3>
        </div>
        <div class="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
          <i class="fab fa-whatsapp"></i>
        </div>
      </div>

      <div
        :class="[
          'p-5 rounded-2xl flex items-center justify-between border transition-colors duration-200',
          isDark ? 'bg-[#111b21] border-[#222e35]' : 'bg-white border-slate-200',
        ]"
      >
        <div>
          <p class="text-xs font-medium uppercase tracking-wider" :class="isDark ? 'text-slate-400' : 'text-slate-500'">Total Sessions</p>
          <h3 class="text-2xl font-bold mt-1" :class="isDark ? 'text-white' : 'text-slate-900'">{{ sessionsStore.sessionCount }}</h3>
        </div>
        <div class="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center">
          <i class="fas fa-layer-group"></i>
        </div>
      </div>

      <div
        :class="[
          'p-5 rounded-2xl flex items-center justify-between border transition-colors duration-200',
          isDark ? 'bg-[#111b21] border-[#222e35]' : 'bg-white border-slate-200',
        ]"
      >
        <div>
          <p class="text-xs font-medium uppercase tracking-wider" :class="isDark ? 'text-slate-400' : 'text-slate-500'">Server Status</p>
          <h3 class="text-lg font-bold mt-1">
            <span v-if="health?.status === 'healthy'" class="text-emerald-400">Healthy</span>
            <span v-else :class="isDark ? 'text-slate-500' : 'text-slate-400'">Unhealthy</span>
          </h3>
        </div>
        <div class="w-10 h-10 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center">
          <i class="fas fa-server"></i>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <NuxtLink
        to="/send"
        :class="[
          'p-5 rounded-2xl flex items-center space-x-4 border transition group',
          isDark ? 'bg-[#111b21] border-[#222e35] hover:border-emerald-500/20' : 'bg-white border-slate-200 hover:border-emerald-300',
        ]"
      >
        <div class="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center group-hover:bg-emerald-500/20 transition">
          <i class="fas fa-paper-plane"></i>
        </div>
        <div>
          <h3 :class="['font-medium', isDark ? 'text-white' : 'text-slate-900']">Kirim Pesan</h3>
          <p class="text-sm" :class="isDark ? 'text-slate-400' : 'text-slate-500'">Kirim pesan ke pelanggan</p>
        </div>
      </NuxtLink>

      <NuxtLink
        to="/sessions"
        :class="[
          'p-5 rounded-2xl flex items-center space-x-4 border transition group',
          isDark ? 'bg-[#111b21] border-[#222e35] hover:border-emerald-500/20' : 'bg-white border-slate-200 hover:border-emerald-300',
        ]"
      >
        <div class="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center group-hover:bg-amber-500/20 transition">
          <i class="fas fa-layer-group"></i>
        </div>
        <div>
          <h3 :class="['font-medium', isDark ? 'text-white' : 'text-slate-900']">Kelola Session</h3>
          <p class="text-sm" :class="isDark ? 'text-slate-400' : 'text-slate-500'">Atur sesi WhatsApp</p>
        </div>
      </NuxtLink>

      <NuxtLink
        to="/webhook"
        :class="[
          'p-5 rounded-2xl flex items-center space-x-4 border transition group',
          isDark ? 'bg-[#111b21] border-[#222e35] hover:border-emerald-500/20' : 'bg-white border-slate-200 hover:border-emerald-300',
        ]"
      >
        <div class="w-10 h-10 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center group-hover:bg-sky-500/20 transition">
          <i class="fas fa-webhook"></i>
        </div>
        <div>
          <h3 :class="['font-medium', isDark ? 'text-white' : 'text-slate-900']">Webhook</h3>
          <p class="text-sm" :class="isDark ? 'text-slate-400' : 'text-slate-500'">Konfigurasi callback</p>
        </div>
      </NuxtLink>
    </div>

    <!-- API Keys -->
    <ApiKeyManager />
  </div>
</template>
