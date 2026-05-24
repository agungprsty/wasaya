<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onClickOutside } from '@vueuse/core'

definePageMeta({ layout: false })

const colorMode = useColorMode()
const themeDropdownRef = ref(null)

onClickOutside(themeDropdownRef, () => {
  showThemeDropdown.value = false
})
const isDark = computed(() => colorMode.value === 'dark')

const themeOptions: Array<{ label: string; value: 'light' | 'dark' | 'system'; icon: string }> = [
  { label: 'Light', value: 'light', icon: 'fa-sun' },
  { label: 'Dark', value: 'dark', icon: 'fa-moon' },
  { label: 'System', value: 'system', icon: 'fa-desktop' },
]

const router = useRouter()
const authStore = useAuthStore()
const health = ref<any>(null)
const error = ref('')
const showThemeDropdown = ref(false)

onMounted(async () => {
  authStore.init()
  if (authStore.isAuthenticated) {
    router.push('/dashboard')
    return
  }
  try {
    health.value = await $fetch('/api/health')
  }
  catch (e: any) {
    error.value = e?.message || 'Gagal memuat data'
  }
})

function setTheme(value: 'light' | 'dark' | 'system') {
  colorMode.preference = value
  showThemeDropdown.value = false
}

function getCurrentLabel() {
  const pref = colorMode.preference as string
  const opt = themeOptions.find(o => o.value === pref)
  return opt?.label || 'System'
}

const currentIcon = computed(() => {
  const pref = colorMode.preference as string
  const opt = themeOptions.find(o => o.value === pref)
  return opt?.icon || 'fa-desktop'
})
</script>

<template>
  <div :class="['min-h-screen font-sans transition-colors duration-200', isDark ? 'bg-[#0b141a] text-slate-200' : 'bg-[#f8fafc] text-slate-700']">
    <!-- Navbar -->
    <nav :class="['border-b sticky top-0 z-10 backdrop-blur', isDark ? 'border-[#222e35] bg-[#111b21]/80' : 'border-slate-200 bg-white/80']">
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center space-x-2">
          <i class="fab fa-whatsapp text-emerald-500 text-2xl"></i>
          <span :class="['text-lg font-bold tracking-tight', isDark ? 'text-white' : 'text-slate-900']">
            WA<span class="text-emerald-500">Blaster</span>
          </span>
        </NuxtLink>

        <div class="flex items-center space-x-3">
          <!-- Theme Dropdown -->
          <div ref="themeDropdownRef" class="relative">
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
              'absolute right-0 top-12 w-36 rounded-xl border shadow-lg overflow-hidden z-20',
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
                <span>{{ opt.label }}</span>
                <i v-if="colorMode.preference === opt.value" class="fas fa-check ml-auto text-emerald-500"></i>
              </button>
            </div>
          </div>

          <NuxtLink
            to="/login"
            :class="['font-medium transition text-sm', isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900']"
          >
            Login
          </NuxtLink>
          <NuxtLink
            to="/register"
            class="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-5 py-2.5 rounded-xl transition text-sm"
          >
            Daftar Gratis
          </NuxtLink>
        </div>
      </div>
    </nav>

    <!-- Hero -->
    <section :class="isDark ? 'bg-[#0b141a]' : 'bg-[#f8fafc]'" class="max-w-7xl mx-auto px-6 pt-20 pb-16">
      <div class="text-center max-w-3xl mx-auto">
        <div class="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-6">
          <i class="fas fa-bolt text-emerald-400 text-sm"></i>
          <span class="text-emerald-400 text-sm font-medium">WhatsApp Business API</span>
        </div>

        <h1 :class="['text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6', isDark ? 'text-white' : 'text-slate-900']">
          Kirim Pesan WhatsApp
          <span class="text-emerald-500">Massal</span>
          <br>Tanpa Batas
        </h1>

        <p class="text-slate-400 text-lg sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
          Platform WhatsApp Gateway self-hosted untuk mengirim notifikasi, promo, dan blast message ke ribuan pelanggan Anda secara real-time.
        </p>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <NuxtLink
            to="/register"
            class="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3.5 rounded-xl transition text-lg w-full sm:w-auto text-center"
          >
            Mulai Gratis
            <i class="fas fa-arrow-right ml-2"></i>
          </NuxtLink>
          <NuxtLink
            to="/login"
            :class="['font-medium px-8 py-3.5 rounded-xl transition text-lg w-full sm:w-auto text-center border', isDark ? 'border-[#222e35] hover:border-slate-600 text-white' : 'border-slate-300 hover:border-slate-400 text-slate-900']"
          >
            Lihat Demo
          </NuxtLink>
        </div>

        <!-- Health Status -->
        <div v-if="health" :class="['mt-12 inline-flex items-center space-x-3 rounded-full px-6 py-2.5 border', isDark ? 'bg-[#111b21] border-[#222e35]' : 'bg-white border-slate-200']">
          <span class="flex h-2.5 w-2.5 relative">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span :class="['text-sm', isDark ? 'text-slate-400' : 'text-slate-500']">System Status:</span>
          <span class="text-emerald-400 font-medium text-sm">{{ health.status?.toUpperCase() || 'OK' }}</span>
          <span v-if="health.sessions" :class="['text-sm', isDark ? 'text-slate-500' : 'text-slate-400']">
            · {{ health.sessions.total }} session{{ health.sessions.total !== 1 ? 's' : '' }}
          </span>
        </div>

        <p v-else-if="error" class="mt-12 text-rose-400 text-sm">{{ error }}</p>
      </div>
    </section>

    <!-- Stats Bar -->
    <section :class="[isDark ? 'bg-[#111b21]/50 border-[#222e35]' : 'bg-white/50 border-slate-200']" class="border-y">
      <div class="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8">
        <div class="text-center">
          <p :class="['text-3xl font-bold mb-1', isDark ? 'text-white' : 'text-slate-900']">99.9%</p>
          <p :class="['text-sm', isDark ? 'text-slate-400' : 'text-slate-500']">Uptime</p>
        </div>
        <div class="text-center">
          <p :class="['text-3xl font-bold mb-1', isDark ? 'text-white' : 'text-slate-900']">10K+</p>
          <p :class="['text-sm', isDark ? 'text-slate-400' : 'text-slate-500']">Pesan / Hari</p>
        </div>
        <div class="text-center">
          <p :class="['text-3xl font-bold mb-1', isDark ? 'text-white' : 'text-slate-900']">&lt;50ms</p>
          <p :class="['text-sm', isDark ? 'text-slate-400' : 'text-slate-500']">Response Time</p>
        </div>
        <div class="text-center">
          <p :class="['text-3xl font-bold mb-1', isDark ? 'text-white' : 'text-slate-900']">Self-hosted</p>
          <p :class="['text-sm', isDark ? 'text-slate-400' : 'text-slate-500']">Full Control</p>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="max-w-7xl mx-auto px-6 py-20">
      <div class="text-center mb-14">
        <h2 :class="['text-3xl font-bold mb-4', isDark ? 'text-white' : 'text-slate-900']">Semua yang Anda Butuhkan</h2>
        <p class="text-slate-400 text-lg max-w-xl mx-auto">
          Fitur lengkap untuk mengirim pesan WhatsApp secara massal dan terautomasi.
        </p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div :class="[isDark ? 'bg-[#111b21] border-[#222e35]' : 'bg-white border-slate-200']" class="rounded-2xl p-6 hover:border-emerald-500/20 transition group border">
          <div class="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition">
            <i class="fas fa-paper-plane text-xl"></i>
          </div>
          <h3 :class="['font-semibold text-lg mb-2', isDark ? 'text-white' : 'text-slate-900']">Mass Messaging</h3>
          <p class="text-slate-400 text-sm leading-relaxed">
            Kirim ribuan pesan WhatsApp sekaligus. Support teks, gambar, dokumen, dan media lainnya.
          </p>
        </div>

        <div :class="[isDark ? 'bg-[#111b21] border-[#222e35]' : 'bg-white border-slate-200']" class="rounded-2xl p-6 hover:border-emerald-500/20 transition group border">
          <div class="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition">
            <i class="fas fa-qrcode text-xl"></i>
          </div>
          <h3 :class="['font-semibold text-lg mb-2', isDark ? 'text-white' : 'text-slate-900']">Multi Session</h3>
          <p class="text-slate-400 text-sm leading-relaxed">
            Kelola beberapa nomor WhatsApp sekaligus. Setiap session berjalan independen.
          </p>
        </div>

        <div :class="[isDark ? 'bg-[#111b21] border-[#222e35]' : 'bg-white border-slate-200']" class="rounded-2xl p-6 hover:border-emerald-500/20 transition group border">
          <div class="w-12 h-12 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center mb-4 group-hover:bg-sky-500/20 transition">
            <i class="fas fa-code text-xl"></i>
          </div>
          <h3 :class="['font-semibold text-lg mb-2', isDark ? 'text-white' : 'text-slate-900']">REST API</h3>
          <p class="text-slate-400 text-sm leading-relaxed">
            Integrasikan dengan mudah via REST API. Dokumentasi lengkap untuk developer.
          </p>
        </div>

        <div :class="[isDark ? 'bg-[#111b21] border-[#222e35]' : 'bg-white border-slate-200']" class="rounded-2xl p-6 hover:border-emerald-500/20 transition group border">
          <div class="w-12 h-12 bg-violet-500/10 text-violet-400 rounded-xl flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition">
            <i class="fas fa-webhook text-xl"></i>
          </div>
          <h3 :class="['font-semibold text-lg mb-2', isDark ? 'text-white' : 'text-slate-900']">Webhook Callback</h3>
          <p class="text-slate-400 text-sm leading-relaxed">
            Terima notifikasi real-time saat pesan terkirim, dibaca, atau diterima balasan dari pelanggan.
          </p>
        </div>

        <div :class="[isDark ? 'bg-[#111b21] border-[#222e35]' : 'bg-white border-slate-200']" class="rounded-2xl p-6 hover:border-emerald-500/20 transition group border">
          <div class="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center mb-4 group-hover:bg-rose-500/20 transition">
            <i class="fas fa-shield-halved text-xl"></i>
          </div>
          <h3 :class="['font-semibold text-lg mb-2', isDark ? 'text-white' : 'text-slate-900']">Keamanan Terjamin</h3>
          <p class="text-slate-400 text-sm leading-relaxed">
            API key authentication, JWT tokens, dan data tersimpan di server Anda sendiri.
          </p>
        </div>

        <div :class="[isDark ? 'bg-[#111b21] border-[#222e35]' : 'bg-white border-slate-200']" class="rounded-2xl p-6 hover:border-emerald-500/20 transition group border">
          <div class="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition">
            <i class="fab fa-docker text-xl"></i>
          </div>
          <h3 :class="['font-semibold text-lg mb-2', isDark ? 'text-white' : 'text-slate-900']">Docker Ready</h3>
          <p class="text-slate-400 text-sm leading-relaxed">
            Deploy dengan satu command. Lengkap dengan PostgreSQL dan Chromium, langsung siap produksi.
          </p>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section :class="[isDark ? 'border-[#222e35] bg-[#111b21]/30' : 'border-slate-200 bg-white/50']" class="border-t">
      <div class="max-w-7xl mx-auto px-6 py-20">
        <div class="text-center mb-14">
          <h2 :class="['text-3xl font-bold mb-4', isDark ? 'text-white' : 'text-slate-900']">Cara Kerja</h2>
          <p class="text-slate-400 text-lg max-w-xl mx-auto">
            Mulai kirim pesan dalam 3 langkah mudah.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="text-center">
            <div class="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold border border-emerald-500/20">
              1
            </div>
            <h3 :class="['font-semibold text-lg mb-2', isDark ? 'text-white' : 'text-slate-900']">Daftar & Scan QR</h3>
            <p class="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
              Buat akun, lalu scan QR code dengan WhatsApp phone Anda. Session langsung aktif.
            </p>
          </div>

          <div class="text-center">
            <div class="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold border border-emerald-500/20">
              2
            </div>
            <h3 :class="['font-semibold text-lg mb-2', isDark ? 'text-white' : 'text-slate-900']">Siapkan API Key</h3>
            <p class="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
              Generate API key dari dashboard atau gunakan langsung via web interface.
            </p>
          </div>

          <div class="text-center">
            <div class="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold border border-emerald-500/20">
              3
            </div>
            <h3 :class="['font-semibold text-lg mb-2', isDark ? 'text-white' : 'text-slate-900']">Kirim Pesan</h3>
            <p class="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
              Kirim pesan satu per satu atau blast message ke ribuan kontak sekaligus.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="max-w-7xl mx-auto px-6 py-20">
      <div :class="[isDark ? 'border-emerald-500/20' : 'border-emerald-200']" class="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border rounded-3xl p-10 sm:p-14 text-center">
        <h2 :class="['text-3xl sm:text-4xl font-bold mb-4', isDark ? 'text-white' : 'text-slate-900']">
          Siap Mulai?
        </h2>
        <p class="text-slate-400 text-lg max-w-xl mx-auto mb-8">
          Bergabunglah dengan ribuan pengguna yang sudah mempercayai WABlaster untuk komunikasi pelanggan mereka.
        </p>
        <NuxtLink
          to="/register"
          class="inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3.5 rounded-xl transition text-lg"
        >
          Daftar Sekarang — Gratis
          <i class="fas fa-arrow-right ml-2"></i>
        </NuxtLink>
      </div>
    </section>

    <!-- Footer -->
    <footer :class="[isDark ? 'border-[#222e35] bg-[#111b21]/50' : 'border-slate-200 bg-white/50']" class="border-t">
      <div class="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center space-x-2">
          <i class="fab fa-whatsapp text-emerald-500"></i>
          <span :class="['font-semibold', isDark ? 'text-white' : 'text-slate-900']">WA</span><span class="text-emerald-500 font-semibold">Blaster</span>
        </div>
        <p :class="['text-sm', isDark ? 'text-slate-500' : 'text-slate-400']">
          &copy; {{ new Date().getFullYear() }} WABlaster. Self-hosted WhatsApp Gateway.
        </p>
      </div>
    </footer>
  </div>
</template>
