<script setup lang="ts">
import { WORKBOOK_TYPES } from '@/constants'
import { useWorkbookStore } from '@/stores'
import type { WorkbookTypeMeta } from '@/types'

const workbookStore = useWorkbookStore()

const selectType = (type: WorkbookTypeMeta) => {
  workbookStore.setType(type.type)
  workbookStore.resetConfig()
  uni.navigateTo({ url: '/pages/config/index' })
}

const useTemplate = () => {
  uni.navigateTo({ url: '/pages/templates/index' })
}
</script>

<template>
  <view class="create-container">
    <view class="header">
      <text class="title">选择字帖类型</text>
      <text class="subtitle">根据您的需求选择合适的练习类型</text>
    </view>

    <view class="type-list">
      <view v-for="type in WORKBOOK_TYPES" :key="type.type" class="type-item" @tap="selectType(type)">
        <view class="type-icon-wrap" :style="{ backgroundColor: type.color + '15' }">
          <text class="type-icon">{{ type.icon }}</text>
        </view>
        <view class="type-content">
          <view class="type-header">
            <text class="type-name">{{ type.name }}</text>
            <text class="arrow">></text>
          </view>
          <text class="type-desc">{{ type.description }}</text>
        </view>
      </view>
    </view>

    <view class="template-entry" @tap="useTemplate">
      <text class="entry-icon">📋</text>
      <view class="entry-content">
        <text class="entry-title">使用现成模板</text>
        <text class="entry-desc">幼小衔接、一年级生字、古诗词等精选内容</text>
      </view>
      <text class="arrow">></text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.create-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 30rpx;
}

.header {
  margin-bottom: 30rpx;
  .title { display: block; font-size: 40rpx; font-weight: bold; color: #333; margin-bottom: 12rpx; }
  .subtitle { display: block; font-size: 28rpx; color: #999; }
}

.type-list {
  .type-item {
    display: flex;
    align-items: center;
    background: #fff;
    padding: 30rpx;
    margin-bottom: 20rpx;
    border-radius: 16rpx;
    
    .type-icon-wrap {
      width: 100rpx; height: 100rpx;
      border-radius: 20rpx;
      display: flex; align-items: center; justify-content: center;
      margin-right: 24rpx; flex-shrink: 0;
      .type-icon { font-size: 56rpx; }
    }
    
    .type-content {
      flex: 1;
      .type-header {
        display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx;
        .type-name { font-size: 34rpx; font-weight: 500; color: #333; }
        .arrow { font-size: 32rpx; color: #ccc; }
      }
      .type-desc { display: block; font-size: 26rpx; color: #999; line-height: 1.4; }
    }
  }
}

.template-entry {
  display: flex; align-items: center;
  background: linear-gradient(135deg, #fff 0%, #f8f8f8 100%);
  padding: 30rpx;
  margin-top: 20rpx;
  border-radius: 16rpx;
  border: 2rpx dashed #ddd;
  
  .entry-icon { font-size: 56rpx; margin-right: 24rpx; }
  .entry-content {
    flex: 1;
    .entry-title { display: block; font-size: 32rpx; font-weight: 500; color: #333; margin-bottom: 8rpx; }
    .entry-desc { display: block; font-size: 26rpx; color: #999; }
  }
  .arrow { font-size: 32rpx; color: #ccc; }
}
</style>
