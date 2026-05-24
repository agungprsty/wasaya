<script setup lang="ts">
const sessionsStore = useSessionsStore()
const showForm = ref(false)
const newId = ref('')
const newName = ref('')
const creating = ref(false)

async function createSession() {
  if (!newId.value.trim() || !newName.value.trim()) return
  creating.value = true
  try {
    await sessionsStore.createSession(newId.value.trim(), newName.value.trim())
    newId.value = ''
    newName.value = ''
    showForm.value = false
  } finally {
    creating.value = false
  }
}

async function deleteSession(id: string) {
  if (!confirm(`Hapus session '${id}'? Semua data session akan hilang.`)) return
  try {
    await sessionsStore.deleteSession(id)
  } catch (e: any) {
    alert(e?.message || 'Gagal menghapus session')
  }
}

onMounted(() => sessionsStore.fetchSessions())
</script>

<template>
  <div class="bg-[#111b21] border border-[#222e35] rounded-2xl p-6 space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-white">WhatsApp Sessions</h2>
        <p class="text-sm text-slate-400">Kelola multiple WhatsApp account.</p>
      </div>
      <button
        @click="showForm = !showForm"
        class="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2 rounded-xl transition"
      >
        <i class="fas fa-plus mr-2 text-sm"></i>Tambah Session
      </button>
    </div>

    <div v-if="showForm" class="bg-[#202c33] p-4 rounded-xl space-y-3">
      <input
        v-model="newId"
        type="text"
        placeholder="ID session (contoh: cs-1)"
        class="w-full bg-[#111b21] border border-[#222e35] rounded-lg px-4 py-2 text-white placeholder-slate-500"
      />
      <input
        v-model="newName"
        type="text"
        placeholder="Nama session (contoh: Customer Service 1)"
        class="w-full bg-[#111b21] border border-[#222e35] rounded-lg px-4 py-2 text-white placeholder-slate-500"
      />
      <div class="flex gap-2">
        <button
          @click="createSession"
          :disabled="creating"
          class="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium"
        >
          {{ creating ? 'Menyimpan...' : 'Simpan' }}
        </button>
        <button @click="showForm = false" class="text-slate-400 px-4 py-2">Batal</button>
      </div>
    </div>

    <div class="space-y-3">
      <p v-if="sessionsStore.sessionList.length === 0 && !sessionsStore.loading" class="text-slate-400 text-sm">
        Belum ada session.
      </p>
      <p v-if="sessionsStore.loading" class="text-slate-400 text-sm">Memuat sessions...</p>

      <div
        v-for="s in sessionsStore.sessionList"
        :key="s.id"
        class="bg-[#202c33] p-4 rounded-xl flex items-center justify-between"
      >
        <div class="flex items-center space-x-3">
          <div
            :class="[
              'w-3 h-3 rounded-full',
              s.ready ? 'bg-emerald-500' : s.status === 'qr' ? 'bg-amber-500' : 'bg-slate-500',
            ]"
          ></div>
          <div>
            <p class="text-white font-medium">{{ s.name }}</p>
            <p class="text-slate-400 text-xs">
              {{ s.id }} · {{ s.ready ? 'Terhubung' : s.status === 'qr' ? 'QR Ready' : s.status }}
            </p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <NuxtLink
            to="/device"
            class="text-sky-400 hover:text-sky-300 text-sm px-2"
            title="Lihat QR"
          >
            <i class="fas fa-qrcode"></i>
          </NuxtLink>
          <button
            v-if="s.id !== 'default'"
            @click="deleteSession(s.id)"
            class="text-rose-400 hover:text-rose-300 text-sm px-2"
            title="Hapus session"
          >
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
