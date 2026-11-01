<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const showGuide = ref(false)
const currentStep = ref(0)

const steps = [
  { icon: '📝', title: '选择类型', desc: '选择要练习的字帖类型' },
  { icon: '⚙️', title: '配置参数', desc: '设置方格、字体、描红等' },
  { icon: '👁️', title: '预览效果', desc: '实时预览字帖效果' },
  { icon: '📤', title: '导出打印', desc: '导出图片或PDF，打印练习' }
]

const nextStep = () => {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  } else {
    finishGuide()
  }
}

const finishGuide = () => {
  showGuide.value = false
  uni.setStorageSync('hasSeenGuide', 'true')
}

const skipGuide = () => {
  finishGuide()
}

onLoad(() => {
  const hasSeen = uni.getStorageSync('hasSeenGuide')
  if (!hasSeen) {
    showGuide.value = true
  }
})
</script>

<template>
  <!-- 新手引导 -->
  <view v-if="showGuide" class="guide-overlay">
    <view class="guide-content">
      <view class="step-icon">{{ steps[currentStep].icon }}</view>
      <view class="step-title">{{ steps[currentStep].title }}</view>
      <view class="step-desc">{{ steps[currentStep].desc }}</view>
      
      <view class="step-dots">
        <text 
          v-for="(s, i) in steps" 
          :key="i" 
          class="dot"
          :class="{ active: i === currentStep }"
        ></text>
      </view>
      
      <view class="guide-actions">
        <text class="skip-btn" @tap="skipGuide">跳过</text>
        <button class="next-btn" @tap="nextStep">
          {{ currentStep === steps.length - 1 ? '开始使用' : '下一步' }}
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.guide-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.guide-content {
  width: 600rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 60rpx 40rpx;
  text-align: center;
}

.step-icon {
  font-size: 120rpx;
  margin-bottom: 30rpx;
}

.step-title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.step-desc {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 40rpx;
}

.step-dots {
  display: flex;
  justify-content: center;
  gap: 16rpx;
  margin-bottom: 40rpx;
  
  .dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    background: #ddd;
    
    &.active {
      background: #07c160;
      width: 32rpx;
      border-radius: 8rpx;
    }
  }
}

.guide-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  .skip-btn {
    font-size: 28rpx;
    color: #999;
  }
  
  .next-btn {
    width: 300rpx;
    height: 80rpx;
    line-height: 80rpx;
    background: #07c160;
    color: #fff;
    font-size: 30rpx;
    border-radius: 40rpx;
    border: none;
  }
}
</style>
