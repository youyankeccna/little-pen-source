<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { WORKBOOK_TYPES } from '@/constants'

const activeCategory = ref('all')
const activeAge = ref('all')
const packages = ref<any[]>([])
const categories = ref<string[]>([])
const ageGroups = ref<string[]>([])

// 分类选项
const categoryOptions = [
  { value: 'all', label: '全部' },
  { value: 'control', label: '控笔' },
  { value: 'number', label: '数字' },
  { value: 'hanzi', label: '汉字' },
  { value: 'pinyin', label: '拼音' },
  { value: 'english', label: '英文' },
  { value: 'poem', label: '古诗' }
]

const ageOptions = [
  { value: 'all', label: '全部年龄' },
  { value: '3-5', label: '3-5岁' },
  { value: '4-6', label: '4-6岁' },
  { value: '6-7', label: '6-7岁' },
  { value: '6-12', label: '6-12岁' },
  { value: '5-8', label: '5-8岁' },
  { value: '7-9', label: '7-9岁' }
]

// 获取内容包
const fetchPackages = async () => {
  try {
    let url = 'http://127.0.0.1:8080/api/content/packages?'
    if (activeCategory.value !== 'all') url += `category=${activeCategory.value}&`
    if (activeAge.value !== 'all') url += `ageGroup=${activeAge.value}`
    
    const res = await fetch(url)
    const data = await res.json()
    packages.value = data.packages || []
  } catch (error) {
    console.error('获取内容包失败:', error)
  }
}

// 获取筛选选项
const fetchOptions = async () => {
  try {
    const catRes = await fetch('http://127.0.0.1:8080/api/content/categories')
    const catData = await catRes.json()
    categories.value = catData.categories || []
    
    const ageRes = await fetch('http://127.0.0.1:8080/api/content/age-groups')
    const ageData = await ageRes.json()
    ageGroups.value = ageData.ageGroups || []
  } catch (error) {
    console.error('获取选项失败:', error)
  }
}

// 使用内容包
const usePackage = (pkg: any) => {
  uni.setStorageSync('packageContent', pkg.content)
  uni.setStorageSync('packageType', pkg.type)
  uni.navigateTo({ url: '/pages/config/index' })
}

// 筛选
const onCategoryChange = (e: any) => {
  activeCategory.value = categoryOptions[e.detail.value].value
  fetchPackages()
}

const onAgeChange = (e: any) => {
  activeAge.value = ageOptions[e.detail.value].value
  fetchPackages()
}

onShow(() => {
  fetchOptions()
  fetchPackages()
})
</script>

<template>
  <view class="content-container">
    <!-- 筛选栏 -->
    <view class="filter-bar">
      <picker mode="selector" :range="categoryOptions" range-key="label" @change="onCategoryChange">
        <view class="filter-item">
          <text>{{ categoryOptions.find(c => c.value === activeCategory)?.label }}</text>
          <text class="arrow">▼</text>
        </view>
      </picker>
      
      <picker mode="selector" :range="ageOptions" range-key="label" @change="onAgeChange">
        <view class="filter-item">
          <text>{{ ageOptions.find(a => a.value === activeAge)?.label }}</text>
          <text class="arrow">▼</text>
        </view>
      </picker>
    </view>

    <!-- 内容包列表 -->
    <view class="package-list">
      <view v-for="pkg in packages" :key="pkg.id" class="package-item" @tap="usePackage(pkg)">
        <view class="package-cover">
          <text class="package-icon">
            {{ WORKBOOK_TYPES.find(t => t.type === pkg.type)?.icon || '📚' }}
          </text>
        </view>
        <view class="package-info">
          <text class="package-title">{{ pkg.title }}</text>
          <view class="package-meta">
            <text class="meta-tag age">{{ pkg.ageGroup }}岁</text>
            <text class="meta-tag type">{{ pkg.category }}</text>
          </view>
          <text class="package-content">{{ pkg.content }}</text>
        </view>
        <text class="use-btn">使用</text>
      </view>
      
      <view v-if="packages.length === 0" class="empty-hint">
        <text class="empty-icon">📦</text>
        <text>暂无内容包</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.content-container { min-height: 100vh; background-color: #f5f5f5; }

.filter-bar {
  display: flex;
  background: #fff;
  padding: 20rpx 30rpx;
  gap: 20rpx;
  
  .filter-item {
    display: flex;
    align-items: center;
    gap: 8rpx;
    padding: 16rpx 24rpx;
    background: #f5f5f5;
    border-radius: 8rpx;
    font-size: 28rpx;
    color: #333;
    
    .arrow { font-size: 20rpx; color: #999; }
  }
}

.package-list { padding: 20rpx; }

.package-item {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  
  .package-cover {
    width: 140rpx;
    height: 140rpx;
    background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 24rpx;
    flex-shrink: 0;
    
    .package-icon { font-size: 64rpx; }
  }
  
  .package-info {
    flex: 1;
    min-width: 0;
    
    .package-title { display: block; font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 12rpx; }
    .package-meta { display: flex; gap: 12rpx; margin-bottom: 12rpx; }
    .meta-tag { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 6rpx; }
    .meta-tag.age { background: rgba(7,193,96,0.1); color: #07c160; }
    .meta-tag.type { background: rgba(25,137,250,0.1); color: #1989fa; }
    .package-content { display: block; font-size: 26rpx; color: #999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  }
  
  .use-btn {
    width: 120rpx;
    height: 60rpx;
    line-height: 60rpx;
    text-align: center;
    background: #07c160;
    color: #fff;
    font-size: 26rpx;
    border-radius: 30rpx;
    flex-shrink: 0;
  }
}

.empty-hint {
  text-align: center;
  padding: 100rpx 40rpx;
  color: #999;
  
  .empty-icon { display: block; font-size: 80rpx; margin-bottom: 20rpx; }
}
</style>
