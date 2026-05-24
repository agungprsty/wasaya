<script setup lang="ts">
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const keys = ref<any[]>([])
const showForm = ref(false)
const keyName = ref('')
const loading = ref(false)

async function loadKeys() {
  try {
    const data = await $fetch('/api/auth/api-keys')
    if ((data as any)?.success) {
      keys.value = (data as any).apiKeys
    }
  }
  catch {
    keys.value = []
  }
}

async function createKey() {
  if (!keyName.value.trim()) return
  loading.value = true
  try {
    await $fetch('/api/auth/api-keys', {
      method: 'POST',
      body: { name: keyName.value.trim() },
    })
    keyName.value = ''
    showForm.value = false
    await loadKeys()
  }
  finally {
    loading.value = false
  }
}

async function revokeKey(id: string) {
  if (!confirm('Yakin ingin menghapus API key ini?')) return
  await $fetch(`/api/auth/api-keys/revoke?id=${id}`, { method: 'POST' })
  await loadKeys()
}

onMounted(loadKeys)
</script>

<template>
  <div
    :class="[
      'rounded-2xl p-6 space-y-4 border transition-colors duration-200',
      isDark
        ? 'bg-[#111b21] border-[#222e35]'
        : 'bg-white border-slate-200',
    ]"
  >
    <div class="flex items-center justify-between">
      <div>
        <h2 :class="['text-lg font-semibold', isDark ? 'text-white' : 'text-slate-900']">API Keys</h2>
        <p class="text-sm" :class="isDark ? 'text-slate-400' : 'text-slate-500'">Kelola API key untuk mengakses API.</p>
      </div>
      <button
        @click="showForm = !showForm"
        class="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2 rounded-xl transition whitespace-nowrap"
      >
        <i class="fas fa-plus mr-2 text-sm"></i>Buat API Key
      </button>
    </div>

    <div
      v-if="showForm"
      :class="[
        'p-4 space-y-3 rounded-xl border',
        isDark ? 'bg-[#202c33] border-[#222e35]' : 'bg-slate-50 border-slate-200',
      ]"
    >
      <input
        v-model="keyName"
        type="text"
        placeholder="Nama API Key"
        :class="[
          'w-full rounded-lg px-4 py-2 text-sm transition-colors',
          isDark
            ? 'bg-[#111b21] border border-[#222e35] text-white placeholder-slate-500'
            : 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400',
        ]"
      />
      <div class="flex gap-2">
        <button
          @click="createKey"
          :disabled="loading"
          class="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          {{ loading ? 'Menyimpan...' : 'Simpan' }}
        </button>
        <button @click="showForm = false" :class="['px-4 py-2', isDark ? 'text-slate-400' : 'text-slate-500']">Batal</button>
      </div>
    </div>

    <div class="space-y-2">
      <p v-if="keys.length === 0" :class="['text-sm', isDark ? 'text-slate-400' : 'text-slate-500']">
        Belum ada API key. Buat key pertama Anda.
      </p>
      <div
        v-for="k in keys"
        :key="k.id"
        :class="[
          'flex items-center justify-between p-3 rounded-xl transition-colors',
          isDark ? 'bg-[#202c33]' : 'bg-slate-50',
        ]"
      >
        <div>
          <p :class="['font-medium', isDark ? 'text-white' : 'text-slate-900']">{{ k.name }}</p>
          <p :class="['text-xs font-mono', isDark ? 'text-slate-400' : 'text-slate-500']">{{ k.key }}</p>
        </div>
        <button @click="revokeKey(k.id)" class="text-rose-400 hover:text-rose-300 text-sm transition">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  </div>
</template>
