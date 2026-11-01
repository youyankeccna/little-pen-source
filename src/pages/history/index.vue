<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { WORKBOOK_TYPES } from '@/constants'

const historyList = ref<any[]>([])

// 从后端获取历史记录
const fetchHistory = async () => {
  try {
    const res = await fetch('http://127.0.0.1:8080/api/history/list')
    const data = await res.json()
    historyList.value = data.list || []
  } catch (error) {
    console.error('获取历史失败:', error)
  }
}

// 再次生成
const regenerate = (item: any) => {
  uni.setStorageSync('selectedHistory', item)
  uni.navigateTo({ url: '/pages/config/index' })
}

// 删除记录
const deleteItem = async (id: string, index: number) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条记录吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await fetch(`http://127.0.0.1:8080/api/history/${id}`, { method: 'DELETE' })
          historyList.value.splice(index, 1)
          uni.showToast({ title: '已删除', icon: 'success' })
        } catch (error) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

onShow(() => {
  fetchHistory()
})
</script>

<template>
  <view class="history-container">
    <view class="history-list" v-if="historyList.length > 0">
      <view v-for="(item, index) in historyList" :key="item.id" class="history-item">
        <view class="history-info">
          <view class="history-header">
            <text class="history-name">{{ item.config?.title || '字帖练习' }}</text>
            <text class="history-type">{{ WORKBOOK_TYPES.find(t => t.type === item.type)?.name }}</text>
          </view>
          <text class="history-date">{{ new Date(item.createdAt).toLocaleString() }}</text>
          <text class="history-content">{{ item.config?.content }}</text>
        </view>
        
        <view class="history-actions">
          <text class="action-btn" @tap="regenerate(item)">重新生成</text>
          <text class="action-btn delete" @tap="deleteItem(item.id, index)">删除</text>
        </view>
      </view>
    </view>

    <view class="empty-state" v-else>
      <text class="empty-icon">📝</text>
      <text class="empty-text">暂无历史记录</text>
      <text class="empty-hint">生成的字帖会保存在这里</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.history-container { min-height: 100vh; background-color: #f5f5f5; padding: 20rpx; }
.history-item { background: #fff; padding: 30rpx; margin-bottom: 20rpx; border-radius: 16rpx; }
.history-info { margin-bottom: 20rpx; }
.history-header { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.history-name { font-size: 32rpx; color: #333; font-weight: 500; }
.history-type { font-size: 24rpx; color: #07c160; background: rgba(7,193,96,0.1); padding: 4rpx 12rpx; border-radius: 8rpx; }
.history-date { display: block; font-size: 26rpx; color: #999; margin-bottom: 8rpx; }
.history-content { display: block; font-size: 28rpx; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.history-actions { display: flex; gap: 20rpx; }
.action-btn { font-size: 28rpx; color: #07c160; padding: 12rpx 24rpx; background: rgba(7,193,96,0.1); border-radius: 8rpx; }
.action-btn.delete { color: #ee0a24; background: rgba(238,10,36,0.1); }
.empty-state { text-align: center; padding: 100rpx 40rpx; }
.empty-icon { display: block; font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { display: block; font-size: 32rpx; color: #333; margin-bottom: 12rpx; }
.empty-hint { display: block; font-size: 26rpx; color: #999; }
</style>
