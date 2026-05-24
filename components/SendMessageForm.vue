<script setup lang="ts">
const sessionsStore = useSessionsStore()

const sessionId = ref('default')
const phone = ref('')
const message = ref('')
const messageType = ref<'text' | 'media'>('text')
const mediaFile = ref<File | null>(null)
const mediaFilename = ref('')
const sending = ref(false)
const result = ref<{ success: boolean; message?: string; messageId?: string } | null>(null)

async function send() {
  sending.value = true
  result.value = null

  try {
    if (messageType.value === 'media') {
      if (!mediaFile.value) {
        alert('Pilih file terlebih dahulu')
        sending.value = false
        return
      }

      const base64 = await fileToBase64(mediaFile.value)
      const data = await $fetch('/api/whatsapp/send-media', {
        method: 'POST',
        body: {
          phone: phone.value,
          message: message.value || undefined,
          sessionId: sessionId.value,
          media: {
            mimetype: mediaFile.value.type || 'image/png',
            data: base64,
            filename: mediaFilename.value || mediaFile.value.name,
          },
        },
      })
      result.value = data as any
      if ((data as any).success) {
        phone.value = ''
        message.value = ''
        mediaFile.value = null
        mediaFilename.value = ''
      }
    } else {
      const data = await $fetch('/api/whatsapp/send', {
        method: 'POST',
        body: {
          phone: phone.value,
          message: message.value,
          sessionId: sessionId.value,
        },
      })
      result.value = data as any
      if ((data as any).success) {
        phone.value = ''
        message.value = ''
      }
    }
  } catch (e: any) {
    result.value = { success: false, message: e?.message || 'Gagal mengirim pesan' }
  } finally {
    sending.value = false
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.length) {
    mediaFile.value = input.files[0]
    if (!mediaFilename.value) {
      mediaFilename.value = input.files[0].name
    }
  }
}

onMounted(() => sessionsStore.fetchSessions())
</script>

<template>
  <div class="bg-[#111b21] border border-[#222e35] rounded-2xl p-6">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-lg font-semibold text-white">Kirim Pesan WhatsApp</h2>
        <p class="text-sm text-slate-400">Kirim teks atau media ke nomor WhatsApp.</p>
      </div>
      <div class="flex items-center space-x-2">
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
            {{ s.name }} ({{ s.id }}){{ s.ready ? ' ✅' : '' }}
          </option>
        </select>
      </div>
    </div>

    <form @submit.prevent="send" class="space-y-4 max-w-lg">
      <div>
        <label class="block text-sm font-medium text-slate-400 mb-1">Nomor WhatsApp</label>
        <input
          v-model="phone"
          type="text"
          placeholder="6281234567890"
          required
          class="w-full bg-[#202c33] border border-[#222e35] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <p class="text-xs text-slate-500 mt-1">Format: 6281234567890 (tanpa +)</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-400 mb-1">Jenis Pesan</label>
        <select
          v-model="messageType"
          class="w-full bg-[#202c33] border border-[#222e35] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="text">Teks</option>
          <option value="media">Media (Gambar/Dokumen/Audio/Video)</option>
        </select>
      </div>

      <div v-if="messageType === 'media'" class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-1">File</label>
          <input
            type="file"
            @change="handleFileSelect"
            class="w-full bg-[#202c33] border border-[#222e35] rounded-xl px-4 py-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-500 file:text-white hover:file:bg-emerald-600"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-1">Nama File (opsional)</label>
          <input
            v-model="mediaFilename"
            type="text"
            placeholder="nama-file.pdf"
            class="w-full bg-[#202c33] border border-[#222e35] rounded-xl px-4 py-3 text-white placeholder-slate-500"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-400 mb-1">
          {{ messageType === 'media' ? 'Caption' : 'Pesan' }}
        </label>
        <textarea
          v-model="message"
          rows="4"
          :placeholder="messageType === 'media' ? 'Tulis caption (opsional)...' : 'Tulis pesan Anda...'"
          :required="messageType === 'text'"
          class="w-full bg-[#202c33] border border-[#222e35] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        ></textarea>
      </div>

      <button
        type="submit"
        :disabled="sending"
        class="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50"
      >
        <i class="fas fa-paper-plane mr-2"></i>{{ sending ? 'Mengirim...' : 'Kirim Pesan' }}
      </button>
    </form>

    <div
      v-if="result"
      :class="[
        'mt-4 p-4 rounded-xl',
        result.success
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      ]"
    >
      <template v-if="result.success">
        <i class="fas fa-check-circle mr-2"></i>Pesan berhasil dikirim! ID: {{ result.messageId }}
      </template>
      <template v-else>
        <i class="fas fa-exclamation-circle mr-2"></i>Gagal: {{ result.message || 'Unknown error' }}
      </template>
    </div>
  </div>
</template>
