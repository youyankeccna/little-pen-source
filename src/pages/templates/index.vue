<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { WORKBOOK_TYPES } from '@/constants'

const activeTab = ref('system')
const systemTemplates = ref<any[]>([])
const myTemplates = ref<any[]>([])
const favoriteTemplates = ref<any[]>([])

// 从后端获取模板
const fetchTemplates = async () => {
  try {
    // 系统模板
    const sysRes = await fetch('http://127.0.0.1:8080/api/template/list?sourceType=system')
    const sysData = await sysRes.json()
    systemTemplates.value = sysData.templates || []
    
    // 我的模板
    const myRes = await fetch('http://127.0.0.1:8080/api/template/list?sourceType=user')
    const myData = await myRes.json()
    myTemplates.value = myData.templates || []
    
    // 收藏模板
    favoriteTemplates.value = myTemplates.value.filter((t: any) => t.isFavorite)
  } catch (error) {
    console.error('获取模板失败:', error)
  }
}

// 使用模板
const useTemplate = (template: any) => {
  // 保存到 store 并跳转配置页
  uni.setStorageSync('selectedTemplate', template)
  uni.navigateTo({ url: '/pages/config/index' })
}

// 收藏/取消收藏
const toggleFavorite = async (id: string) => {
  try {
    await fetch(`http://127.0.0.1:8080/api/template/favorite/${id}`, { method: 'POST' })
    await fetchTemplates()
    uni.showToast({ title: '操作成功', icon: 'success' })
  } catch (error) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

onShow(() => {
  fetchTemplates()
})
</script>

<template>
  <view class="templates-container">
    <view class="tab-bar">
      <view class="tab-item" :class="{ active: activeTab === 'system' }" @tap="activeTab = 'system'">系统模板</view>
      <view class="tab-item" :class="{ active: activeTab === 'my' }" @tap="activeTab = 'my'">我的模板</view>
      <view class="tab-item" :class="{ active: activeTab === 'favorite' }" @tap="activeTab = 'favorite'">收藏</view>
    </view>

    <!-- 系统模板 -->
    <view class="template-list" v-if="activeTab === 'system'">
      <view v-for="template in systemTemplates" :key="template.id" class="template-item" @tap="useTemplate(template)">
        <view class="template-cover">
          <text class="template-icon">{{ WORKBOOK_TYPES.find(t => t.type === template.type)?.icon }}</text>
        </view>
        <view class="template-info">
          <text class="template-name">{{ template.name }}</text>
          <text class="template-meta">{{ WORKBOOK_TYPES.find(t => t.type === template.type)?.name }}</text>
        </view>
        <text class="template-arrow">></text>
      </view>
      
      <view v-if="systemTemplates.length === 0" class="empty-state">
        <text class="empty-text">暂无系统模板</text>
      </view>
    </view>

    <!-- 我的模板 -->
    <view class="template-list" v-else-if="activeTab === 'my'">
      <view v-for="template in myTemplates" :key="template.id" class="template-item" @tap="useTemplate(template)">
        <view class="template-cover">
          <text class="template-icon">{{ WORKBOOK_TYPES.find(t => t.type === template.type)?.icon }}</text>
        </view>
        <view class="template-info">
          <text class="template-name">{{ template.name }}</text>
          <text class="template-meta">{{ WORKBOOK_TYPES.find(t => t.type === template.type)?.name }}</text>
        </view>
        <view class="template-actions">
          <text class="action-icon" @tap.stop="toggleFavorite(template.id)">
            {{ template.isFavorite ? '❤️' : '🤍' }}
          </text>
        </view>
      </view>
      
      <view v-if="myTemplates.length === 0" class="empty-state">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无我的模板</text>
        <text class="empty-hint">在配置页点击"保存模板"即可添加</text>
      </view>
    </view>

    <!-- 收藏模板 -->
    <view class="template-list" v-else>
      <view v-for="template in favoriteTemplates" :key="template.id" class="template-item" @tap="useTemplate(template)">
        <view class="template-cover">
          <text class="template-icon">{{ WORKBOOK_TYPES.find(t => t.type === template.type)?.icon }}</text>
        </view>
        <view class="template-info">
          <text class="template-name">{{ template.name }}</text>
          <text class="template-meta">{{ WORKBOOK_TYPES.find(t => t.type === template.type)?.name }}</text>
        </view>
        <text class="template-arrow">></text>
      </view>
      
      <view v-if="favoriteTemplates.length === 0" class="empty-state">
        <text class="empty-icon">⭐</text>
        <text class="empty-text">暂无收藏模板</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.templates-container { min-height: 100vh; background-color: #f5f5f5; }
.tab-bar { display: flex; background: #fff; border-bottom: 1rpx solid #f0f0f0; }
.tab-item { flex: 1; text-align: center; padding: 30rpx 0; font-size: 30rpx; color: #666; position: relative; }
.tab-item.active { color: #07c160; font-weight: 500; }
.tab-item.active::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 40rpx; height: 4rpx; background: #07c160; border-radius: 2rpx; }
.template-list { padding: 20rpx; }
.template-item { display: flex; align-items: center; background: #fff; padding: 30rpx; margin-bottom: 20rpx; border-radius: 16rpx; }
.template-cover { width: 120rpx; height: 120rpx; background: #f8f8f8; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; margin-right: 24rpx; }
.template-icon { font-size: 56rpx; }
.template-info { flex: 1; }
.template-name { display: block; font-size: 32rpx; color: #333; margin-bottom: 8rpx; }
.template-meta { display: block; font-size: 26rpx; color: #999; }
.template-arrow { font-size: 32rpx; color: #ccc; }
.template-actions { margin-right: 20rpx; }
.action-icon { font-size: 36rpx; }
.empty-state { text-align: center; padding: 100rpx 40rpx; }
.empty-icon { display: block; font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { display: block; font-size: 32rpx; color: #333; margin-bottom: 12rpx; }
.empty-hint { display: block; font-size: 26rpx; color: #999; }
</style>
