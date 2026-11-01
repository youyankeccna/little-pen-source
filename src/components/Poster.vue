<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  title: string
  content: string
  type: string
}>()

const posterGenerated = ref(false)

// 生成海报
const generatePoster = async () => {
  // 实际项目中使用 uni.canvasToTempFilePath
  posterGenerated.value = true
  uni.showToast({ title: '海报已生成', icon: 'success' })
}

// 保存海报
const savePoster = () => {
  // 实际项目中调用 uni.saveImageToPhotosAlbum
  uni.showToast({ title: '已保存到相册', icon: 'success' })
}

// 分享
const sharePoster = () => {
  uni.showShareMenu({
    withShareTicket: true
  })
}
</script>

<template>
  <view class="poster-container">
    <view class="poster-card">
      <view class="poster-header">
        <text class="poster-title">智能字帖生成</text>
      </view>
      
      <view class="poster-content">
        <text class="content-label">练习内容</text>
        <text class="content-text">{{ content || '点击使用模板' }}</text>
      </view>
      
      <view class="poster-footer">
        <text class="footer-text">长按识别小程序码开始练习</text>
        <view class="qrcode">
          <text class="qr-icon">📱</text>
        </view>
      </view>
    </view>
    
    <view class="poster-actions">
      <button class="action-btn" @tap="generatePoster">重新生成</button>
      <button class="action-btn primary" @tap="savePoster">保存图片</button>
      <button class="action-btn" open-type="share">分享</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.poster-container {
  padding: 30rpx;
}

.poster-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.1);
}

.poster-header {
  background: linear-gradient(135deg, #07c160 0%, #05a050 100%);
  padding: 40rpx;
  text-align: center;
  
  .poster-title {
    font-size: 36rpx;
    font-weight: bold;
    color: #fff;
  }
}

.poster-content {
  padding: 40rpx;
  text-align: center;
  
  .content-label {
    display: block;
    font-size: 24rpx;
    color: #999;
    margin-bottom: 16rpx;
  }
  
  .content-text {
    display: block;
    font-size: 40rpx;
    font-weight: bold;
    color: #333;
    letter-spacing: 8rpx;
  }
}

.poster-footer {
  padding: 30rpx 40rpx;
  background: #f8f8f8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  .footer-text {
    font-size: 24rpx;
    color: #666;
  }
  
  .qrcode {
    width: 120rpx;
    height: 120rpx;
    background: #fff;
    border-radius: 8rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    
    .qr-icon {
      font-size: 60rpx;
    }
  }
}

.poster-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;
  
  .action-btn {
    flex: 1;
    height: 80rpx;
    line-height: 80rpx;
    font-size: 28rpx;
    border-radius: 12rpx;
    background: #f0f0f0;
    color: #666;
    border: none;
    
    &.primary {
      background: #07c160;
      color: #fff;
    }
  }
}
</style>
