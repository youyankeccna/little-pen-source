<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'

const menuItems = [
  { icon: '📋', name: '我的模板', path: '/pages/templates/index' },
  { icon: '📖', name: '历史记录', path: '/pages/history/index' },
  { icon: '⭐', name: '收藏模板', path: '/pages/templates/index' },
  { icon: '🎯', name: '每日打卡', path: '/pages/checkin/index' },
  { icon: '🔄', name: '错字回炉', path: '/pages/retrain/index' },
  { icon: '📚', name: '内容包', path: '/pages/content/index' },
  { icon: '📷', name: '拍照评估', path: '/pages/practice/index', badge: 'AI' },
  { icon: '👨‍🏫', name: '老师作业', path: '/pages/assignment/index' },
  { icon: '👑', name: '会员权益', badge: '待开发' }
]

const stats = ref({ templates: 0, history: 0, streakDays: 0 })

const navigateTo = (path?: string) => {
  if (path) uni.navigateTo({ url: path })
  else uni.showToast({ title: '功能开发中', icon: 'none' })
}

const fetchStats = async () => {
  try {
    const [templateRes, historyRes, streakRes] = await Promise.all([
      fetch('http://127.0.0.1:8080/api/template/list?sourceType=user'),
      fetch('http://127.0.0.1:8080/api/history/list?limit=100'),
      fetch('http://127.0.0.1:8080/api/checkin/streak')
    ])
    
    const templateData = await templateRes.json()
    const historyData = await historyRes.json()
    const streakData = await streakRes.json()
    
    stats.value = {
      templates: templateData.templates?.length || 0,
      history: historyData.list?.length || 0,
      streakDays: streakData.streakDays || 0
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

onShow(() => {
  fetchStats()
})
</script>

<template>
  <view class="profile-container">
    <view class="user-card">
      <view class="avatar">👤</view>
      <view class="user-info">
        <text class="user-name">微信用户</text>
        <text class="user-id">ID: wx_user_xxx</text>
      </view>
    </view>

    <view class="stats-card">
      <view class="stat-item" @tap="navigateTo('/pages/templates/index')">
        <text class="stat-num">{{ stats.templates }}</text>
        <text class="stat-label">我的模板</text>
      </view>
      <view class="stat-item" @tap="navigateTo('/pages/history/index')">
        <text class="stat-num">{{ stats.history }}</text>
        <text class="stat-label">历史记录</text>
      </view>
      <view class="stat-item" @tap="navigateTo('/pages/checkin/index')">
        <text class="stat-num">{{ stats.streakDays }}</text>
        <text class="stat-label">连续打卡</text>
      </view>
    </view>

    <view class="menu-list">
      <view v-for="item in menuItems" :key="item.name" class="menu-item" @tap="navigateTo(item.path)">
        <text class="menu-icon">{{ item.icon }}</text>
        <text class="menu-name">{{ item.name }}</text>
        <text v-if="item.badge" class="menu-badge">{{ item.badge }}</text>
        <text v-if="!item.badge && item.path" class="arrow">></text>
      </view>
    </view>

    <view class="version"><text>智能字帖生成 v1.0.0</text></view>
  </view>
</template>

<style scoped lang="scss">
.profile-container { min-height: 100vh; background-color: #f5f5f5; }
.user-card { display: flex; align-items: center; background: linear-gradient(135deg, #07c160 0%, #05a050 100%); padding: 60rpx 40rpx; }
.avatar { width: 120rpx; height: 120rpx; background: rgba(255,255,255,0.2); border-radius: 60rpx; display: flex; align-items: center; justify-content: center; font-size: 60rpx; margin-right: 30rpx; }
.user-info .user-name { display: block; font-size: 40rpx; font-weight: bold; color: #fff; margin-bottom: 8rpx; }
.user-info .user-id { display: block; font-size: 26rpx; color: rgba(255,255,255,0.8); }
.stats-card { display: flex; background: #fff; margin: -30rpx 30rpx 30rpx; padding: 30rpx; border-radius: 16rpx; box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.08); }
.stat-item { flex: 1; text-align: center; }
.stat-num { display: block; font-size: 40rpx; font-weight: bold; color: #333; margin-bottom: 8rpx; }
.stat-label { display: block; font-size: 26rpx; color: #999; }
.menu-list { background: #fff; margin: 0 30rpx; border-radius: 16rpx; overflow: hidden; }
.menu-item { display: flex; align-items: center; padding: 30rpx; border-bottom: 1rpx solid #f5f5f5; }
.menu-item:last-child { border-bottom: none; }
.menu-icon { font-size: 40rpx; margin-right: 20rpx; }
.menu-name { flex: 1; font-size: 30rpx; color: #333; }
.menu-badge { font-size: 22rpx; color: #fff; background: #07c160; padding: 4rpx 12rpx; border-radius: 8rpx; margin-right: 16rpx; }
.arrow { font-size: 32rpx; color: #ccc; }
.version { text-align: center; padding: 60rpx 30rpx; }
.version text { font-size: 26rpx; color: #999; }
</style>
