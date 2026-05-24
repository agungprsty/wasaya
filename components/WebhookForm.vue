<script setup lang="ts">
const sessionsStore = useSessionsStore()
const webhookStore = useWebhookStore()

const sessionId = ref('default')
const url = ref('')
const events = ref<string[]>(['message'])
const saving = ref(false)
const statusMsg = ref<{ type: 'success' | 'error'; text: string } | null>(null)

const eventOptions = [
  { value: 'message', label: 'message - Pesan masuk' },
  { value: 'message_media', label: 'message_media - Media masuk' },
]

async function loadConfig() {
  await webhookStore.fetchWebhook(sessionId.value)
  if (webhookStore.currentConfig) {
    url.value = webhookStore.currentConfig.url || ''
    events.value = webhookStore.currentConfig.events || ['message']
  } else {
    url.value = ''
    events.value = ['message']
  }
  statusMsg.value = null
}

async function save() {
  if (!url.value.trim()) {
    alert('Webhook URL wajib diisi')
    return
  }
  saving.value = true
  statusMsg.value = null

  try {
    await webhookStore.setWebhook(sessionId.value, url.value, events.value)
    statusMsg.value = { type: 'success', text: 'Webhook berhasil disimpan!' }
  } catch (e: any) {
    statusMsg.value = { type: 'error', text: e?.message || 'Gagal menyimpan webhook' }
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!confirm('Hapus webhook untuk session ini?')) return
  saving.value = true
  statusMsg.value = null

  try {
    await webhookStore.removeWebhook(sessionId.value)
    url.value = ''
    events.value = ['message']
    statusMsg.value = { type: 'success', text: 'Webhook dihapus!' }
  } catch (e: any) {
    statusMsg.value = { type: 'error', text: e?.message || 'Gagal menghapus webhook' }
  } finally {
    saving.value = false
  }
}

function toggleEvent(val: string) {
  if (events.value.includes(val)) {
    events.value = events.value.filter((e) => e !== val)
  } else {
    events.value.push(val)
  }
}

onMounted(async () => {
  await sessionsStore.fetchSessions()
  await loadConfig()
})

watch(sessionId, loadConfig)
</script>

<template>
  <div class="bg-[#111b21] border border-[#222e35] rounded-2xl p-6 space-y-4">
    <div>
      <h2 class="text-lg font-semibold text-white">Webhook Configuration</h2>
      <p class="text-sm text-slate-400">Forward pesan masuk ke URL eksternal.</p>
    </div>

    <div class="flex items-center space-x-3">
      <label class="text-sm text-slate-400">Session:</label>
      <select
        v-model="sessionId"
        class="bg-[#202c33] border border-[#222e35] rounded-lg px-3 py-2 text-white text-sm"
      >
        <option
          v-for="s in sessionsStore.sessionList"
          :key="s.id"
          :value="s.id"
        >
          {{ s.name }} ({{ s.id }})
        </option>
      </select>
    </div>

    <div class="space-y-4 max-w-lg">
      <div>
        <label class="block text-sm font-medium text-slate-400 mb-1">Webhook URL</label>
        <input
          v-model="url"
          type="url"
          placeholder="https://example.com/webhook"
          class="w-full bg-[#202c33] border border-[#222e35] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-400 mb-2">Events</label>
        <div class="space-y-2">
          <label
            v-for="opt in eventOptions"
            :key="opt.value"
            class="flex items-center space-x-2 cursor-pointer"
          >
            <input
              type="checkbox"
              :value="opt.value"
              :checked="events.includes(opt.value)"
              @change="toggleEvent(opt.value)"
              class="rounded bg-[#202c33] border-[#222e35] text-emerald-500"
            />
            <span class="text-sm">{{ opt.label }}</span>
          </label>
        </div>
      </div>

      <div class="flex gap-2">
        <button
          @click="save"
          :disabled="saving"
          class="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl font-medium disabled:opacity-50"
        >
          <i class="fas fa-save mr-2"></i>{{ saving ? 'Menyimpan...' : 'Simpan Webhook' }}
        </button>
        <button
          @click="remove"
          :disabled="saving"
          class="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2 rounded-xl font-medium disabled:opacity-50"
        >
          <i class="fas fa-trash mr-2"></i>Hapus
        </button>
      </div>
    </div>

    <div
      v-if="statusMsg"
      :class="[
        'p-4 rounded-xl',
        statusMsg.type === 'success'
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      ]"
    >
      <i
        :class="[
          'mr-2',
          statusMsg.type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle',
        ]"
      ></i>
      {{ statusMsg.text }}
    </div>
  </div>
</template>
