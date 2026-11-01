<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useWorkbookStore } from '@/stores'
import { GRID_TYPES, PAGE_SIZES, FONT_FAMILIES } from '@/constants'

const workbookStore = useWorkbookStore()
const title = ref('')

const content = computed({
  get: () => workbookStore.config.content,
  set: (val) => workbookStore.setContent(val)
})

// 页面加载时检查是否有选中的模板或历史
onShow(() => {
  // 从模板加载
  const selectedTemplate = uni.getStorageSync('selectedTemplate')
  if (selectedTemplate) {
    workbookStore.config = { ...selectedTemplate.config }
    content.value = selectedTemplate.config.content
    uni.removeStorageSync('selectedTemplate')
    uni.showToast({ title: '已加载模板', icon: 'success' })
    return
  }
  
  // 从历史记录加载
  const selectedHistory = uni.getStorageSync('selectedHistory')
  if (selectedHistory) {
    workbookStore.config = { ...selectedHistory.config }
    content.value = selectedHistory.config.content
    uni.removeStorageSync('selectedHistory')
    uni.showToast({ title: '已加载历史', icon: 'success' })
    return
  }
  
  // 从内容包加载
  const packageContent = uni.getStorageSync('packageContent')
  const packageType = uni.getStorageSync('packageType')
  if (packageContent) {
    content.value = packageContent
    if (packageType) workbookStore.setType(packageType)
    uni.removeStorageSync('packageContent')
    uni.removeStorageSync('packageType')
    uni.showToast({ title: '已加载内容包', icon: 'success' })
    return
  }
  
  // 从错字回炉加载
  const retrainContent = uni.getStorageSync('retrainContent')
  if (retrainContent) {
    content.value = retrainContent
    workbookStore.setType('hanzi')
    uni.removeStorageSync('retrainContent')
    uni.showToast({ title: '已加载错字', icon: 'success' })
  }
})

const onGridTypeChange = (e: any) => {
  workbookStore.updateLayout({ gridType: GRID_TYPES[e.detail.value].value })
}

const onPageSizeChange = (e: any) => {
  workbookStore.updateLayout({ pageSize: PAGE_SIZES[e.detail.value].value })
}

const onFontFamilyChange = (e: any) => {
  workbookStore.updateFont({ family: FONT_FAMILIES[e.detail.value].value })
}

const onShowPinyinChange = (e: any) => {
  workbookStore.updateAssist({ showPinyin: e.detail.value })
}

const onHighlightFirstChange = (e: any) => {
  workbookStore.updateAssist({ highlightFirst: e.detail.value })
}

const onGridSizeChange = (e: any) => {
  workbookStore.updateLayout({ gridSize: e.detail.value })
}

const onFontSizeChange = (e: any) => {
  workbookStore.updateFont({ size: e.detail.value })
}

const onTraceCountChange = (e: any) => {
  workbookStore.updateTrace({ count: e.detail.value })
}

const goToPreview = () => {
  if (!content.value.trim()) {
    uni.showToast({ title: '请输入练习内容', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/pages/preview/index' })
}

const saveAsTemplate = () => {
  if (!content.value.trim()) {
    uni.showToast({ title: '请先输入内容', icon: 'none' })
    return
  }
  uni.showModal({
    title: '保存模板',
    editable: true,
    placeholderText: '请输入模板名称',
    success: async (res) => {
      if (res.confirm && res.content) {
        try {
          await workbookStore.saveTemplate(res.content)
          uni.showToast({ title: '保存成功', icon: 'success' })
        } catch (e) {
          uni.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    }
  })
}
</script>

<template>
  <view class="config-container">
    <view class="section">
      <view class="section-title">练习内容</view>
      <textarea v-model="content" class="content-input" placeholder="请输入要练习的汉字，如：春夏秋冬" maxlength="500" />
      <text class="char-count">{{ content.length }}/500</text>
    </view>

    <view class="section">
      <view class="section-title">页面布局</view>
      
      <view class="form-item">
        <text class="label">方格类型</text>
        <picker mode="selector" :range="GRID_TYPES" range-key="label" @change="onGridTypeChange">
          <view class="picker-value">
            {{ GRID_TYPES.find(item => item.value === workbookStore.config.layout.gridType)?.label }}
            <text class="arrow">></text>
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">页面尺寸</text>
        <picker mode="selector" :range="PAGE_SIZES" range-key="label" @change="onPageSizeChange">
          <view class="picker-value">
            {{ PAGE_SIZES.find(item => item.value === workbookStore.config.layout.pageSize)?.label }}
            <text class="arrow">></text>
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">方格大小: {{ workbookStore.config.layout.gridSize }}px</text>
        <slider :value="workbookStore.config.layout.gridSize" min="32" max="100" show-value @change="onGridSizeChange" activeColor="#07c160" />
      </view>
    </view>

    <view class="section">
      <view class="section-title">字体样式</view>

      <view class="form-item">
        <text class="label">字体</text>
        <picker mode="selector" :range="FONT_FAMILIES" range-key="label" @change="onFontFamilyChange">
          <view class="picker-value">
            {{ FONT_FAMILIES.find(item => item.value === workbookStore.config.font.family)?.label }}
            <text class="arrow">></text>
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">字号: {{ workbookStore.config.font.size }}px</text>
        <slider :value="workbookStore.config.font.size" min="16" max="72" show-value @change="onFontSizeChange" activeColor="#07c160" />
      </view>
    </view>

    <view class="section">
      <view class="section-title">描红设置</view>
      <view class="form-item">
        <text class="label">描红数量: {{ workbookStore.config.trace.count }} 个</text>
        <slider :value="workbookStore.config.trace.count" min="0" max="5" show-value @change="onTraceCountChange" activeColor="#07c160" />
      </view>
    </view>

    <view class="section">
      <view class="section-title">辅助显示</view>
      <view class="switch-item">
        <text class="label">显示拼音</text>
        <switch :checked="workbookStore.config.assist.showPinyin" @change="onShowPinyinChange" color="#07c160" />
      </view>
      <view class="switch-item">
        <text class="label">首字高亮</text>
        <switch :checked="workbookStore.config.assist.highlightFirst" @change="onHighlightFirstChange" color="#07c160" />
      </view>
    </view>

    <view class="action-bar">
      <button class="btn-save" @tap="saveAsTemplate">保存模板</button>
      <button class="btn-preview" @tap="goToPreview">预览字帖</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.config-container { min-height: 100vh; background-color: #f5f5f5; padding-bottom: 160rpx; }
.section { background: #fff; margin: 20rpx; padding: 30rpx; border-radius: 16rpx; }
.section-title { display: block; font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 24rpx; }
.content-input { width: 100%; height: 160rpx; padding: 20rpx; background: #f8f8f8; border-radius: 12rpx; font-size: 30rpx; box-sizing: border-box; }
.char-count { display: block; text-align: right; font-size: 24rpx; color: #999; margin-top: 12rpx; }
.form-item { padding: 20rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.form-item:last-child { border-bottom: none; }
.form-item .label { display: block; font-size: 30rpx; color: #333; margin-bottom: 16rpx; }
.picker-value { display: flex; justify-content: space-between; align-items: center; font-size: 30rpx; color: #666; }
.picker-value .arrow { color: #ccc; }
.switch-item { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.switch-item:last-child { border-bottom: none; }
.switch-item .label { font-size: 30rpx; color: #333; }
.action-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 30rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #fff; display: flex; gap: 20rpx; box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05); }
.btn-save { flex: 1; height: 88rpx; line-height: 88rpx; background: #f0f0f0; color: #666; font-size: 32rpx; border-radius: 12rpx; border: none; }
.btn-preview { flex: 2; height: 88rpx; line-height: 88rpx; background: #07c160; color: #fff; font-size: 32rpx; border-radius: 12rpx; border: none; }
</style>
