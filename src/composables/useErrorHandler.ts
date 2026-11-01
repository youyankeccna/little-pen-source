// composables/useErrorHandler.ts - 错误处理
import { ref } from 'vue'

interface ErrorInfo {
  message: string
  code?: string
  timestamp: number
}

export function useErrorHandler() {
  const error = ref<ErrorInfo | null>(null)
  const errorHistory = ref<ErrorInfo[]>([])

  /**
   * 处理错误
   */
  const handleError = (err: any, options: { 
    showToast?: boolean
    toastTitle?: string
    log?: boolean 
  } = {}) => {
    const { showToast = true, toastTitle = '操作失败', log = true } = options
    
    // 提取错误信息
    let message = '未知错误'
    let code = ''
    
    if (typeof err === 'string') {
      message = err
    } else if (err instanceof Error) {
      message = err.message
    } else if (err?.message) {
      message = err.message
      code = err.code || ''
    }

    // 记录错误
    const errorInfo: ErrorInfo = {
      message,
      code,
      timestamp: Date.now()
    }
    
    error.value = errorInfo
    errorHistory.value.unshift(errorInfo)
    
    // 限制历史记录数量
    if (errorHistory.value.length > 10) {
      errorHistory.value = errorHistory.value.slice(0, 10)
    }

    // 显示提示
    if (showToast) {
      uni.showToast({
        title: message,
        icon: 'none',
        duration: 3000
      })
    }

    // 日志
    if (log) {
      console.error('[ErrorHandler]', err)
    }

    return errorInfo
  }

  /**
   * 清除错误
   */
  const clearError = () => {
    error.value = null
  }

  /**
   * 显示错误弹窗
   */
  const showErrorModal = (title = '出错了', content?: string) => {
    uni.showModal({
      title,
      content: content || error.value?.message || '操作失败，请重试',
      showCancel: false
    })
  }

  /**
   * 包装异步函数，自动处理错误
   */
  const wrapAsync = <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options: Parameters<typeof handleError>[1] = {}
  ) => {
    return async (...args: Parameters<T>): Promise<ReturnType<T> | null> => {
      try {
        clearError()
        return await fn(...args)
      } catch (err) {
        handleError(err, options)
        return null
      }
    }
  }

  return {
    error,
    errorHistory,
    handleError,
    clearError,
    showErrorModal,
    wrapAsync
  }
}
