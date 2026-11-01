<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'

const hasPermission = ref(false)
const imageUrl = ref('')
const recognizing = ref(false)
const evaluation = ref<any>(null)
const practiceRecords = ref<any[]>([])

// 检查相机权限
const checkPermission = () => {
  uni.getSetting({
    success: (res) => {
      if (res.authSetting['scope.camera']) {
        hasPermission.value = true
      } else {
        uni.authorize({
          scope: 'scope.camera',
          success: () => { hasPermission.value = true },
          fail: () => { hasPermission.value = false }
        })
      }
    }
  })
}

// 拍照
const takePhoto = () => {
  if (!hasPermission.value) {
    checkPermission()
    return
  }
  
  uni.chooseImage({
    count: 1,
    sourceType: ['camera'],
    success: (res) => {
      imageUrl.value = res.tempFilePaths[0]
      recognizeImage()
    }
  })
}

// 从相册选择
const chooseImage = () => {
  uni.chooseImage({
    count: 1,
    sourceType: ['album'],
    success: (res) => {
      imageUrl.value = res.tempFilePaths[0]
      recognizeImage()
    }
  })
}

// 识别并评估
const recognizeImage = async () => {
  if (!imageUrl.value) return
  
  recognizing.value = true
  evaluation.value = null
  
  try {
    // 1. 上传练习记录
    const uploadRes = await fetch('http://127.0.0.1:8080/api/practice/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'default',
        imageUrl: imageUrl.value,
        type: 'hanzi'
      })
    })
    const uploadData = await uploadRes.json()
    
    // 2. AI 评估
    const evalRes = await fetch('http://127.0.0.1:8080/api/ai/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId: uploadData.record.id })
    })
    const evalData = await evalRes.json()
    
    evaluation.value = evalData.evaluation
    
    if (evalData.evaluation.score < 60) {
      // 自动添加到错字
      const wrongChar = uploadData.record.content[0]
      if (wrongChar) {
        await fetch('http://127.0.0.1:8080/api/wrongchar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ char: wrongChar, source: 'AI评估' })
        })
      }
    }
    
    uni.showToast({ title: '评估完成', icon: 'success' })
  } catch (error) {
    uni.showToast({ title: '评估失败', icon: 'none' })
  } finally {
    recognizing.value = false
  }
}

// 获取历史记录
const fetchRecords = async () => {
  try {
    const res = await fetch('http://127.0.0.1:8080/api/practice/list?userId=default')
    const data = await res.json()
    practiceRecords.value = data.records || []
  } catch (error) {
    console.error('获取记录失败:', error)
  }
}

const getScoreColor = (score: number) => {
  if (score >= 80) return '#07c160'
  if (score >= 60) return '#ff9900'
  return '#ee0a24'
}

const getScoreEmoji = (score: number) => {
  if (score >= 80) return '🌟'
  if (score >= 60) return '👍'
  return '💪'
}

onShow(() => {
  checkPermission()
  fetchRecords()
})
</script>

<template>
  <view class="practice-container">
    <!-- 拍照区域 -->
    <view class="capture-area">
      <view v-if="!imageUrl" class="capture-placeholder" @tap="chooseImage">
        <text class="placeholder-icon">📷</text>
        <text class="placeholder-text">点击拍照或选择图片</text>
        <text class="placeholder-hint">拍摄孩子的练习作品</text>
      </view>
      
      <view v-else class="image-preview">
        <image :src="imageUrl" mode="aspectFit" class="preview-img" />
        <view class="preview-actions">
          <button class="action-btn" @tap="chooseImage">重新选择</button>
          <button v-if="!evaluation" class="action-btn primary" @tap="recognizeImage" :disabled="recognizing">
            {{ recognizing ? '评估中...' : '开始评估' }}
          </button>
        </view>
      </view>
    </view>

    <!-- 评估结果 -->
    <view v-if="evaluation" class="result-card">
      <view class="score-section">
        <text class="score-emoji">{{ getScoreEmoji(evaluation.score) }}</text>
        <text class="score-num" :style="{ color: getScoreColor(evaluation.score) }">{{ evaluation.score }}</text>
        <text class="score-label">分</text>
      </view>
      
      <view class="feedback">{{ evaluation.feedback }}</view>
      
      <view class="detail-section">
        <view class="detail-title">详细评估</view>
        <view class="detail-grid">
          <view class="detail-item">
            <text class="detail-label">结构</text>
            <view class="detail-bar"><view class="detail-fill" :style="{ width: evaluation.detailed.structure + '%', background: getScoreColor(evaluation.detailed.structure) }"></view></view>
            <text class="detail-score">{{ evaluation.detailed.structure }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">整洁度</text>
            <view class="detail-bar"><view class="detail-fill" :style="{ width: evaluation.detailed.neatness + '%', background: getScoreColor(evaluation.detailed.neatness) }"></view></view>
            <text class="detail-score">{{ evaluation.detailed.neatness }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">笔画</text>
            <view class="detail-bar"><view class="detail-fill" :style="{ width: evaluation.detailed.stroke + '%', background: getScoreColor(evaluation.detailed.stroke) }"></view></view>
            <text class="detail-score">{{ evaluation.detailed.stroke }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">间距</text>
            <view class="detail-bar"><view class="detail-fill" :style="{ width: evaluation.detailed.spacing + '%', background: getScoreColor(evaluation.detailed.spacing) }"></view></view>
            <text class="detail-score">{{ evaluation.detailed.spacing }}</text>
          </view>
        </view>
      </view>
      
      <view v-if="evaluation.strengths.length > 0" class="strengths-section">
        <view class="section-title">✨ 优点</view>
        <view class="tags">
          <text v-for="s in evaluation.strengths" :key="s" class="tag strength">{{ s }}</text>
        </view>
      </view>
      
      <view v-if="evaluation.suggestions.length > 0" class="suggestions-section">
        <view class="section-title">💡 建议</view>
        <view class="tags">
          <text v-for="s in evaluation.suggestions" :key="s" class="tag suggestion">{{ s }}</text>
        </view>
      </view>
    </view>

    <!-- 历史记录 -->
    <view class="section">
      <view class="section-title">评估历史</view>
      <view class="records-list">
        <view v-for="record in practiceRecords" :key="record.id" class="record-item">
          <image :src="record.imageUrl" class="record-img" mode="aspectThumb" />
          <view class="record-info">
            <text class="record-content">{{ record.content }}</text>
            <text class="record-date">{{ new Date(record.createdAt).toLocaleDateString() }}</text>
          </view>
        </view>
        <view v-if="practiceRecords.length === 0" class="empty-hint">暂无评估记录</view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.practice-container { min-height: 100vh; background-color: #f5f5f5; padding: 20rpx; }

.capture-area { margin-bottom: 30rpx; }

.capture-placeholder {
  background: #fff;
  border-radius: 16rpx;
  padding: 100rpx 40rpx;
  text-align: center;
  border: 2rpx dashed #ddd;
  
  .placeholder-icon { display: block; font-size: 100rpx; margin-bottom: 20rpx; }
  .placeholder-text { display: block; font-size: 32rpx; color: #333; margin-bottom: 12rpx; }
  .placeholder-hint { display: block; font-size: 26rpx; color: #999; }
}

.image-preview {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  
  .preview-img { width: 100%; height: 400rpx; border-radius: 12rpx; }
  .preview-actions { display: flex; gap: 20rpx; margin-top: 20rpx; }
  .action-btn { flex: 1; height: 80rpx; line-height: 80rpx; border-radius: 12rpx; font-size: 28rpx; border: none; }
  .action-btn.primary { background: #07c160; color: #fff; }
}

.result-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  
  .score-section { text-align: center; margin-bottom: 30rpx; }
  .score-emoji { display: block; font-size: 60rpx; margin-bottom: 10rpx; }
  .score-num { font-size: 96rpx; font-weight: bold; }
  .score-label { font-size: 32rpx; color: #999; }
  .feedback { text-align: center; font-size: 32rpx; color: #333; margin-bottom: 30rpx; }
  
  .detail-section { margin-bottom: 30rpx; }
  .detail-title { font-size: 28rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; }
  .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; }
  .detail-item { display: flex; align-items: center; gap: 12rpx; }
  .detail-label { font-size: 24rpx; color: #999; width: 60rpx; }
  .detail-bar { flex: 1; height: 16rpx; background: #f0f0f0; border-radius: 8rpx; overflow: hidden; }
  .detail-fill { height: 100%; border-radius: 8rpx; }
  .detail-score { font-size: 24rpx; color: #333; width: 40rpx; text-align: right; }
  
  .strengths-section, .suggestions-section { margin-bottom: 20rpx; }
  .section-title { font-size: 28rpx; font-weight: bold; color: #333; margin-bottom: 16rpx; }
  .tags { display: flex; flex-wrap: wrap; gap: 12rpx; }
  .tag { padding: 8rpx 20rpx; border-radius: 20rpx; font-size: 24rpx; }
  .tag.strength { background: rgba(7,193,96,0.1); color: #07c160; }
  .tag.suggestion { background: rgba(255,153,0,0.1); color: #ff9900; }
}

.section { background: #fff; border-radius: 16rpx; padding: 30rpx; }
.section-title { font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; }

.records-list { .record-item { display: flex; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #f0f0f0; }
  .record-item:last-child { border-bottom: none; }
  .record-img { width: 100rpx; height: 100rpx; border-radius: 8rpx; margin-right: 20rpx; }
  .record-info { flex: 1; }
  .record-content { display: block; font-size: 28rpx; color: #333; margin-bottom: 8rpx; }
  .record-date { display: block; font-size: 24rpx; color: #999; }
}

.empty-hint { text-align: center; color: #999; font-size: 28rpx; padding: 40rpx 0; }
</style>
