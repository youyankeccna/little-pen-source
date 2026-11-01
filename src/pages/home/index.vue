<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { WORKBOOK_TYPES } from '@/constants'
import { useWorkbookStore } from '@/stores'

const workbookStore = useWorkbookStore()
const navigate = (url: string) => uni.navigateTo({ url })

const recentTemplates = ref([
  { id: '1', name: '一年级生字', type: 'hanzi', date: '2026-03-18' },
  { id: '2', name: '拼音练习', type: 'pinyin', date: '2026-03-17' },
  { id: '3', name: '数字描红', type: 'number', date: '2026-03-15' }
])

const hotTemplates = ref([
  { id: '4', name: '幼小衔接-控笔', type: 'control', downloads: 2341 },
  { id: '5', name: '一年级上册生字', type: 'hanzi', downloads: 1892 },
  { id: '6', name: '26个英文字母', type: 'english', downloads: 1567 }
])

const selectType = (type: any) => {
  workbookStore.setType(type.type)
  uni.navigateTo({ url: '/pages/config/index' })
}

const quickStart = () => {
  uni.navigateTo({ url: '/pages/create/index' })
}

const viewTemplate = (template: any) => {
  uni.showToast({ title: '查看模板: ' + template.name, icon: 'none' })
}

const goToCheckin = () => {
  uni.navigateTo({ url: '/pages/checkin/index' })
}

const goToContent = () => {
  uni.navigateTo({ url: '/pages/content/index' })
}

const goToRetrain = () => {
  uni.navigateTo({ url: '/pages/retrain/index' })
}
</script>

<template>
  <view class="home-container">
    <view class="banner">
      <view class="banner-content">
        <text class="banner-title">智能字帖生成</text>
        <text class="banner-subtitle">快速生成练字帖，让孩子写得更好</text>
        <button class="quick-btn" @tap="quickStart">立即开始</button>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="quick-entry">
      <view class="entry-item" @tap="goToCheckin">
        <text class="entry-icon">🎯</text>
        <text class="entry-name">每日打卡</text>
      </view>
      <view class="entry-item" @tap="goToContent">
        <text class="entry-icon">📚</text>
        <text class="entry-name">内容包</text>
      </view>
      <view class="entry-item" @tap="goToRetrain">
        <text class="entry-icon">🔄</text>
        <text class="entry-name">错字回炉</text>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">选择字帖类型</text>
        <text class="section-more" @tap="quickStart">更多 ></text>
      </view>
      
      <view class="type-grid">
        <view 
          v-for="type in WORKBOOK_TYPES.slice(0, 4)" 
          :key="type.type"
          class="type-card"
          :style="{ backgroundColor: type.color + '15' }"
          @tap="selectType(type)"
        >
          <text class="type-icon">{{ type.icon }}</text>
          <text class="type-name">{{ type.name }}</text>
        </view>
      </view>
    </view>

    <view class="section" v-if="recentTemplates.length > 0">
      <view class="section-header">
        <text class="section-title">最近使用</text>
        <text class="section-more" @tap="navigate('/pages/history/index')">全部 ></text>
      </view>
      
      <view class="recent-list">
        <view v-for="item in recentTemplates" :key="item.id" class="recent-item" @tap="viewTemplate(item)">
          <view class="recent-info">
            <text class="recent-name">{{ item.name }}</text>
            <text class="recent-type">{{ WORKBOOK_TYPES.find(t => t.type === item.type)?.name }}</text>
          </view>
          <text class="recent-date">{{ item.date }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">热门模板</text>
        <text class="section-more" @tap="navigate('/pages/templates/index')">更多 ></text>
      </view>
      
      <view class="template-list">
        <view v-for="item in hotTemplates" :key="item.id" class="template-card" @tap="viewTemplate(item)">
          <view class="template-cover">
            <text class="template-icon">{{ WORKBOOK_TYPES.find(t => t.type === item.type)?.icon }}</text>
          </view>
          <view class="template-info">
            <text class="template-name">{{ item.name }}</text>
            <text class="template-downloads">{{ item.downloads }} 次使用</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.home-container { min-height: 100vh; background-color: #f5f5f5; }

.banner { background: linear-gradient(135deg, #07c160 0%, #05a050 100%); padding: 60rpx 40rpx; }
.banner-content { text-align: center; }
.banner-title { display: block; font-size: 48rpx; font-weight: bold; color: #fff; margin-bottom: 16rpx; }
.banner-subtitle { display: block; font-size: 28rpx; color: rgba(255,255,255,0.9); margin-bottom: 40rpx; }
.quick-btn { display: inline-block; background: #fff; color: #07c160; font-size: 32rpx; padding: 20rpx 60rpx; border-radius: 40rpx; border: none; font-weight: 500; }

.quick-entry { display: flex; background: #fff; margin: 20rpx; padding: 30rpx; border-radius: 16rpx; gap: 20rpx; }
.entry-item { flex: 1; text-align: center; }
.entry-icon { display: block; font-size: 48rpx; margin-bottom: 12rpx; }
.entry-name { display: block; font-size: 26rpx; color: #666; }

.section { background: #fff; margin: 20rpx; padding: 30rpx; border-radius: 16rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.section-title { font-size: 32rpx; font-weight: bold; color: #333; }
.section-more { font-size: 26rpx; color: #999; }

.type-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20rpx; }
.type-card { padding: 20rpx; border-radius: 12rpx; text-align: center; }
.type-icon { display: block; font-size: 48rpx; margin-bottom: 8rpx; }
.type-name { display: block; font-size: 26rpx; color: #333; }

.recent-list { .recent-item { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 0; border-bottom: 1rpx solid #f0f0f0; }
  .recent-item:last-child { border-bottom: none; }
  .recent-info { flex: 1; }
  .recent-name { display: block; font-size: 30rpx; color: #333; margin-bottom: 8rpx; }
  .recent-type { display: block; font-size: 24rpx; color: #999; }
  .recent-date { font-size: 24rpx; color: #999; }
}

.template-list { display: flex; gap: 20rpx; overflow-x: auto; }
.template-card { flex-shrink: 0; width: 200rpx; background: #f8f8f8; border-radius: 12rpx; overflow: hidden; }
.template-cover { height: 120rpx; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%); }
.template-icon { font-size: 48rpx; }
.template-info { padding: 16rpx; }
.template-name { display: block; font-size: 26rpx; color: #333; margin-bottom: 8rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.template-downloads { display: block; font-size: 20rpx; color: #999; }
</style>
