<script setup lang="ts">
import { useCounterStore } from '@/store/counter'
const countStore = useCounterStore()
</script>
<template>
  <p>{{ countStore.count }}</p>
</template>
