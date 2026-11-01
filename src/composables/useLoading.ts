// composables/useLoading.ts - 加载状态管理
import { ref } from 'vue'

interface LoadingState {
  loading: boolean
  error: string
  progress: number
}

export function useLoading() {
  const state = ref<LoadingState>({
    loading: false,
    error: '',
    progress: 0
  })

  const start = (initialProgress = 0) => {
    state.value.loading = true
    state.value.error = ''
    state.value.progress = initialProgress
  }

  const updateProgress = (progress: number) => {
    state.value.progress = Math.min(100, Math.max(0, progress))
  }

  const setError = (error: string) => {
    state.value.error = error
    state.value.loading = false
  }

  const finish = () => {
    state.value.loading = false
    state.value.progress = 100
  }

  const reset = () => {
    state.value.loading = false
    state.value.error = ''
    state.value.progress = 0
  }

  return {
    state,
    start,
    updateProgress,
    setError,
    finish,
    reset
  }
}
