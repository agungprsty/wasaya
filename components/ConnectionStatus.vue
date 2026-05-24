<script setup lang="ts">
const props = defineProps<{
  status: string
  ready: boolean
}>()

const indicatorClass = computed(() => {
  if (props.ready) return 'bg-emerald-500 animate-pulse'
  if (props.status === 'qr') return 'bg-amber-500'
  return 'bg-slate-500'
})

const label = computed(() => {
  if (props.ready) return 'WhatsApp Active'
  if (props.status === 'qr') return 'Scan QR'
  if (props.status === 'authenticated') return 'Authenticated'
  return props.status || 'Disconnected'
})
</script>

<template>
  <div class="flex items-center space-x-2">
    <div :class="['w-2.5 h-2.5 rounded-full', indicatorClass]"></div>
    <span class="text-xs text-slate-400 font-medium">{{ label }}</span>
  </div>
</template>
