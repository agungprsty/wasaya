<script setup lang="ts">
const props = defineProps<{
  sessionId: string
}>()

const qrCode = ref<string | null>(null)
const ready = ref(false)
const loading = ref(true)
const error = ref('')

async function loadQr() {
  loading.value = true
  error.value = ''
  qrCode.value = null
  ready.value = false

  try {
    const data = await $fetch(`/api/whatsapp/sessions/${props.sessionId}/qr`)
    const result = data as any
    if (result.ready) {
      ready.value = true
    } else if (result.qr) {
      qrCode.value = result.qr
    }
  } catch (e: any) {
    error.value = e?.message || 'Gagal memuat QR code'
  } finally {
    loading.value = false
  }
}

async function restart() {
  try {
    await $fetch(`/api/whatsapp/sessions/${props.sessionId}/restart`, {
      method: 'POST',
    })
    setTimeout(loadQr, 5000)
  } catch (e: any) {
    error.value = e?.message || 'Gagal restart'
  }
}

async function logout() {
  if (!confirm(`Logout session '${props.sessionId}'?`)) return
  try {
    await $fetch(`/api/whatsapp/sessions/${props.sessionId}/logout`, {
      method: 'POST',
    })
    setTimeout(async () => {
      await $fetch(`/api/whatsapp/sessions/${props.sessionId}/restart`, {
        method: 'POST',
      })
      setTimeout(loadQr, 5000)
    }, 1000)
  } catch (e: any) {
    error.value = e?.message || 'Gagal logout'
  }
}

onMounted(loadQr)
watch(() => props.sessionId, loadQr)
</script>

<template>
  <div class="bg-[#111b21] border border-[#222e35] rounded-2xl p-6">
    <h2 class="text-lg font-semibold text-white mb-1">WhatsApp Device</h2>
    <p class="text-sm text-slate-400 mb-4">Hubungkan WhatsApp dengan QR code.</p>

    <div class="text-center py-8">
      <div v-if="loading" class="text-slate-400">Loading QR Code...</div>

      <div v-else-if="error && !qrCode" class="text-rose-400">{{ error }}</div>

      <div v-else-if="ready">
        <div
          class="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <i class="fab fa-whatsapp text-emerald-500 text-4xl"></i>
        </div>
        <p class="text-emerald-400 font-medium">
          {{ sessionId === 'default' ? 'WhatsApp Terhubung!' : `${sessionId} Terhubung!` }}
        </p>
      </div>

      <div v-else-if="qrCode">
        <div class="mx-auto rounded-xl border border-[#222e35] inline-block p-2 bg-white">
          <img
            :src="`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCode)}`"
            alt="QR Code"
            class="mx-auto"
          />
        </div>
        <p class="text-slate-400 text-sm mt-4">Scan QR ini dengan WhatsApp Anda</p>
      </div>

      <div v-else class="text-slate-400">
        Tidak ada QR. Klik Restart untuk generate.
      </div>
    </div>

    <div class="flex gap-3 flex-wrap">
      <button
        @click="restart"
        class="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl font-medium"
      >
        <i class="fas fa-sync-alt mr-2"></i>Restart
      </button>
      <button
        @click="logout"
        class="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl font-medium"
      >
        <i class="fas fa-sign-out-alt mr-2"></i>Logout
      </button>
    </div>
  </div>
</template>
