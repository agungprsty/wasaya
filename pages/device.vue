<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const sessionsStore = useSessionsStore()
const selectedSession = ref('default')

onMounted(() => sessionsStore.fetchSessions())
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center space-x-3">
      <label class="text-sm text-slate-400">Session:</label>
      <select
        v-model="selectedSession"
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
    <QrDisplay :key="selectedSession" :session-id="selectedSession" />
  </div>
</template>
