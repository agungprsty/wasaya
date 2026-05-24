<script setup lang="ts">

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
const showThemeDropdown = ref(false)

definePageMeta({ layout: false })

const authStore = useAuthStore()
const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)

onMounted(() => {
  authStore.init()
  if (authStore.isAuthenticated) {
    router.push('/dashboard')
  }
})

async function handleRegister() {
  loading.value = true
  error.value = ''

  try {
    const data = await $fetch('/api/auth/register', {
      method: 'POST',
      body: { name: name.value, email: email.value, password: password.value },
    })
    const result = data as any
    if (result.success) {
      success.value = true
    }
    else {
      error.value = result.error || 'Registrasi gagal'
    }
  }
  catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Registrasi gagal'
  }
  finally {
    loading.value = false
  }
}

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
  <div class="min-h-screen bg-[#0b141a] flex items-center justify-center px-4">
    <!-- Theme Dropdown -->
    <div class="fixed top-4 right-4 z-10">
      <button
        @click="showThemeDropdown = !showThemeDropdown"
        class="w-10 h-10 rounded-xl bg-[#111b21] border border-[#222e35] text-slate-400 hover:text-white flex items-center justify-center transition"
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
          <span>{{ opt.value.charAt(0).toUpperCase() + opt.value.slice(1) }}</span>
          <i v-if="colorMode.preference === opt.value" class="fas fa-check ml-auto text-emerald-500"></i>
        </button>
      </div>
    </div>

    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <i class="fab fa-whatsapp text-emerald-500 text-5xl mb-4"></i>
        <h1 class="text-2xl font-bold text-white">WA<span class="text-emerald-500">Blaster</span></h1>
        <p class="text-slate-400 text-sm mt-1">Buat akun baru</p>
      </div>

      <div v-if="success" class="bg-[#111b21] border border-[#222e35] rounded-2xl p-6 text-center">
        <div class="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-check text-emerald-500 text-2xl"></i>
        </div>
        <p class="text-white font-medium mb-2">Registrasi Berhasil!</p>
        <p class="text-slate-400 text-sm mb-4">Silakan login dengan akun baru Anda.</p>
        <NuxtLink
          to="/login"
          class="inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-6 py-2 rounded-xl transition"
        >
          Login Sekarang
        </NuxtLink>
      </div>

      <div v-else class="bg-[#111b21] border border-[#222e35] rounded-2xl p-6">
        <form @submit.prevent="handleRegister" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-1">Nama</label>
            <input
              v-model="name"
              type="text"
              placeholder="Nama Anda"
              required
              class="w-full bg-[#202c33] border border-[#222e35] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-1">Email</label>
            <input
              v-model="email"
              type="email"
              placeholder="email@example.com"
              required
              class="w-full bg-[#202c33] border border-[#222e35] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-1">Password</label>
            <input
              v-model="password"
              type="password"
              placeholder="Minimal 6 karakter"
              required
              minlength="6"
              class="w-full bg-[#202c33] border border-[#222e35] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <p v-if="error" class="text-rose-400 text-sm">{{ error }}</p>
          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 rounded-xl transition disabled:opacity-50"
          >
            {{ loading ? 'Memproses...' : 'Daftar' }}
          </button>
        </form>
        <p class="text-center text-sm text-slate-400 mt-4">
          Sudah punya akun?
          <NuxtLink to="/login" class="text-emerald-400 hover:text-emerald-300 font-medium">Login</NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>
