<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

// 全局错误处理
onLaunch(() => {
  console.log('智能字帖生成小程序启动')
  
  // 屏蔽游客模式下的部分 API 警告
  const originalConsoleError = console.error
  console.error = (...args: any[]) => {
    const msg = args[0]?.toString?.() || ''
    if (msg.includes('webapi_getwxaasyncsecinfo') || msg.includes('operateWXData')) {
      return // 忽略这些警告
    }
    originalConsoleError.apply(console, args)
  }
})

onShow(() => {
  console.log('App Show')
})

onHide(() => {
  console.log('App Hide')
})
</script>

<style lang="scss">
page {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.container {
  padding: 20rpx;
}
</style>
