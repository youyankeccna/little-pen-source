<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorkbookStore } from '@/stores'
import { useLoading, useErrorHandler } from '@/composables'
import { WORKBOOK_TYPES } from '@/constants'

const workbookStore = useWorkbookStore()
const { state: loadingState, start: startLoading, updateProgress, setError, finish: finishLoading } = useLoading()
const { handleError } = useErrorHandler()

const showExportType = ref(false)

// 当前类型信息
const currentTypeInfo = computed(() => {
  return WORKBOOK_TYPES.find(t => t.type === workbookStore.currentType)
})

// 预览数据（限制显示数量，优化性能）
const VISIBLE_COUNT = 20
const previewData = computed(() => {
  const content = workbookStore.config.content
  const chars = content.split('').filter(c => c.trim())
  
  return {
    title: workbookStore.config.title || '字帖预览',
    chars: chars.slice(0, VISIBLE_COUNT),
    totalChars: chars.length,
    totalPages: workbookStore.pageCount,
    config: workbookStore.config,
    hasMore: chars.length > VISIBLE_COUNT
  }
})

// 返回上一页
const goBack = () => {
  uni.navigateBack()
}

// 选择导出类型
const selectExportType = (type: 'image' | 'pdf') => {
  showExportType.value = false
  if (type === 'pdf') {
    exportPDF()
  } else {
    exportImage()
  }
}

// 显示导出选项
const showExportOptions = () => {
  if (workbookStore.isEmpty) {
    uni.showToast({ title: '请先输入内容', icon: 'none' })
    return
  }
  showExportType.value = true
}

// 导出图片
const exportImage = async () => {
  if (loadingState.value.loading) return
  
  try {
    startLoading(10)
    
    const taskId = await workbookStore.exportWorkbook('image')
    updateProgress(30)
    
    // 轮询检查状态
    const result = await pollExportStatus(taskId)
    
    if (result?.status === 'success') {
      uni.showModal({
        title: '导出成功',
        content: '字帖图片已生成，是否保存到相册？',
        success: (res) => {
          if (res.confirm) {
            downloadAndSave(result.fileUrl!)
          }
        }
      })
    }
  } catch (error) {
    handleError(error, { toastTitle: '导出失败' })
  }
}

// 导出 PDF
const exportPDF = async () => {
  if (loadingState.value.loading) return
  
  try {
    startLoading(10)
    
    const taskId = await workbookStore.exportWorkbook('pdf')
    updateProgress(30)
    
    const result = await pollExportStatus(taskId)
    
    if (result?.status === 'success') {
      uni.showModal({
        title: 'PDF 导出成功',
        content: 'PDF 文件已生成，可用于打印',
        showCancel: false
      })
    }
  } catch (error) {
    handleError(error, { toastTitle: '导出失败' })
  }
}

// 轮询导出状态
const pollExportStatus = async (taskId: string, maxAttempts = 30) => {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 1000))
    
    const data = await workbookStore.checkExportStatus(taskId)
    
    if (data.status === 'success') {
      finishLoading()
      return data
    } else if (data.status === 'failed') {
      setError(data.error || '导出失败')
      return null
    }
    
    updateProgress(30 + (i / maxAttempts) * 60)
  }
  
  setError('导出超时，请重试')
  return null
}

// 下载并保存图片
const downloadAndSave = (fileUrl: string) => {
  const fullUrl = fileUrl.startsWith('http') ? fileUrl : `http://127.0.0.1:8080${fileUrl}`
  
  uni.downloadFile({
    url: fullUrl,
    success: (res) => {
      if (res.statusCode === 200) {
        uni.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
          fail: () => uni.showToast({ title: '保存失败，请检查权限', icon: 'none' })
        })
      }
    },
    fail: () => uni.showToast({ title: '下载失败', icon: 'none' })
  })
}

// 分享
const shareWorkbook = () => {
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline']
  })
}

// 保存模板
const saveTemplate = () => {
  if (workbookStore.isEmpty) {
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
        } catch (error) {
          handleError(error, { toastTitle: '保存失败' })
        }
      }
    }
  })
}

// 页面分享配置
const onShareAppMessage = () => ({
  title: `字帖练习 - ${workbookStore.config.title || '智能字帖生成'}`,
  path: '/pages/home/index'
})

const onShareTimeline = () => ({
  title: `字帖练习 - ${workbookStore.config.title || '智能字帖生成'}`
})
</script>

<template>
  <view class="preview-container">
    <view class="preview-section">
      <view class="preview-header">
        <view class="preview-title">{{ previewData.title }}</view>
        <view class="preview-meta">
          <text class="meta-item">{{ currentTypeInfo?.name }}</text>
          <text class="meta-item">{{ previewData.chars.length }} 字</text>
          <text class="meta-item">共 {{ previewData.totalPages }} 页</text>
        </view>
      </view>

      <view class="preview-canvas">
        <view class="workbook-sheet">
          <view class="sheet-header">
            <text class="sheet-title">{{ workbookStore.config.title || '练字帖' }}</text>
            <text class="sheet-date">{{ new Date().toLocaleDateString() }}</text>
          </view>

          <view class="sheet-grid">
            <view 
              v-for="(char, index) in previewData.chars" 
              :key="index"
              class="grid-cell"
              :class="[workbookStore.config.layout.gridType, { 'highlight': index === 0 && workbookStore.config.assist.highlightFirst }]"
              :style="{ width: workbookStore.config.layout.gridSize + 'rpx', height: workbookStore.config.layout.gridSize + 'rpx' }"
            >
              <text v-if="workbookStore.config.assist.showPinyin" class="cell-pinyin">
                {{ ['chūn', 'xià', 'qiū', 'dōng'][index % 4] }}
              </text>

              <text 
                v-for="t in workbookStore.config.trace.count" 
                :key="'trace-' + t"
                class="cell-char trace"
                :style="{ color: workbookStore.config.trace.color, fontSize: (workbookStore.config.layout.gridSize * 0.7) + 'rpx' }"
              >{{ char }}</text>

              <text 
                class="cell-char main"
                :class="{ 'highlight': index === 0 && workbookStore.config.assist.highlightFirst }"
                :style="{ fontSize: (workbookStore.config.layout.gridSize * 0.7) + 'rpx', fontWeight: workbookStore.config.font.weight }"
              >{{ char }}</text>
            </view>
            <view v-if="previewData.hasMore" class="grid-cell more-cell">
              <text class="more-text">+{{ previewData.totalChars - VISIBLE_COUNT }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="config-summary">
        <view class="summary-row">
          <text class="summary-label">方格</text>
          <text class="summary-value">
            {{ workbookStore.config.layout.gridType === 'tianzi' ? '田字格' : 
               workbookStore.config.layout.gridType === 'mizi' ? '米字格' : '方格' }}
          </text>
        </view>
        <view class="summary-row">
          <text class="summary-label">字体</text>
          <text class="summary-value">{{ workbookStore.config.font.size }}px</text>
        </view>
        <view class="summary-row">
          <text class="summary-label">描红</text>
          <text class="summary-value">{{ workbookStore.config.trace.count }} 个</text>
        </view>
        <view class="summary-row">
          <text class="summary-label">页数</text>
          <text class="summary-value">{{ previewData.totalPages }} 页</text>
        </view>
      </view>
    </view>

    <!-- 导出类型选择 -->
    <view v-if="showExportType" class="export-type-modal" @tap="showExportType = false">
      <view class="modal-content" @tap.stop>
        <view class="modal-title">选择导出格式</view>
        <view class="type-options">
          <view class="type-option" @tap="selectExportType('image')">
            <text class="type-icon">🖼️</text>
            <text class="type-name">图片 (PNG)</text>
            <text class="type-desc">适合手机查看</text>
          </view>
          <view class="type-option" @tap="selectExportType('pdf')">
            <text class="type-icon">📄</text>
            <text class="type-name">PDF 文档</text>
            <text class="type-desc">适合打印保存</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 导出进度 -->
    <view v-if="loadingState.loading" class="export-progress">
      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: loadingState.progress + '%' }"></view>
      </view>
      <text class="progress-text">{{ loadingState.progress }}%</text>
    </view>

    <!-- 操作栏 -->
    <view class="action-bar">
      <button class="action-btn secondary" @tap="goBack">返回</button>
      <button class="action-btn secondary" @tap="saveTemplate">保存</button>
      <button class="action-btn secondary" @tap="shareWorkbook">分享</button>
      <button class="action-btn primary" @tap="showExportOptions" :disabled="loadingState.loading">
        {{ loadingState.loading ? '导出中...' : '导出' }}
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.preview-container { min-height: 100vh; background-color: #f5f5f5; padding-bottom: 140rpx; }
.preview-section { background: #fff; margin: 20rpx; border-radius: 16rpx; overflow: hidden; }
.preview-header { padding: 30rpx; border-bottom: 1rpx solid #f0f0f0; }
.preview-title { font-size: 36rpx; font-weight: bold; color: #333; margin-bottom: 12rpx; }
.preview-meta { display: flex; gap: 16rpx; flex-wrap: wrap; }
.meta-item { font-size: 24rpx; color: #999; background: #f5f5f5; padding: 6rpx 16rpx; border-radius: 8rpx; }
.preview-canvas { padding: 30rpx; background: #fafafa; overflow-x: auto; }
.workbook-sheet { background: #fff; padding: 30rpx; border-radius: 8rpx; box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05); min-width: 600rpx; }
.sheet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30rpx; padding-bottom: 20rpx; border-bottom: 2rpx solid #f0f0f0; }
.sheet-title { font-size: 36rpx; font-weight: bold; color: #333; }
.sheet-date { font-size: 24rpx; color: #999; }
.sheet-grid { display: flex; flex-wrap: wrap; gap: 20rpx; }
.grid-cell { position: relative; border: 2rpx solid #e5e5e5; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.grid-cell.tianzi::before, .grid-cell.tianzi::after { content: ''; position: absolute; background: #e5e5e5; }
.grid-cell.tianzi::before { width: 100%; height: 1rpx; top: 50%; left: 0; }
.grid-cell.tianzi::after { width: 1rpx; height: 100%; left: 50%; top: 0; }
.grid-cell.highlight { background: #fffbe6; border-color: #ffd666; }
.cell-pinyin { font-size: 18rpx; color: #999; margin-bottom: 4rpx; z-index: 1; }
.cell-char { z-index: 1; }
.cell-char.trace { color: #cfcfcf; }
.cell-char.main { color: #333; font-family: 'KaiTi', serif; }
.config-summary { padding: 20rpx 30rpx; display: flex; gap: 30rpx; flex-wrap: wrap; border-top: 1rpx solid #f0f0f0; }
.summary-row { display: flex; align-items: center; gap: 8rpx; }
.summary-label { font-size: 24rpx; color: #999; }
.summary-value { font-size: 26rpx; color: #333; font-weight: 500; }

.export-type-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-content { width: 600rpx; background: #fff; border-radius: 24rpx; padding: 40rpx; }
.modal-title { font-size: 32rpx; font-weight: bold; color: #333; text-align: center; margin-bottom: 40rpx; }
.type-options { display: flex; gap: 30rpx; }
.type-option { flex: 1; text-align: center; padding: 30rpx; background: #f8f8f8; border-radius: 16rpx; }
.type-icon { display: block; font-size: 60rpx; margin-bottom: 16rpx; }
.type-name { display: block; font-size: 28rpx; color: #333; font-weight: 500; margin-bottom: 8rpx; }
.type-desc { display: block; font-size: 22rpx; color: #999; }

.export-progress { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); padding: 40rpx 60rpx; border-radius: 16rpx; z-index: 100; }
.progress-bar { width: 400rpx; height: 8rpx; background: rgba(255,255,255,0.2); border-radius: 4rpx; overflow: hidden; margin-bottom: 20rpx; }
.progress-fill { height: 100%; background: #07c160; border-radius: 4rpx; transition: width 0.2s; }
.progress-text { display: block; text-align: center; font-size: 28rpx; color: #fff; }

.action-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 30rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #fff; display: flex; gap: 12rpx; box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05); }
.action-btn { height: 80rpx; line-height: 80rpx; border-radius: 12rpx; font-size: 26rpx; border: none; padding: 0 16rpx; white-space: nowrap; }
.action-btn.primary { flex: 2; background: #07c160; color: #fff; }
.action-btn.secondary { flex: 1; background: #f0f0f0; color: #666; }
.action-btn[disabled] { opacity: 0.6; }

/* 新增样式 */
.cell-char.main.highlight { color: #ff6b6b; }
.more-cell { background: #f0f0f0 !important; display: flex; align-items: center; justify-content: center; border-style: dashed; }
.more-text { font-size: 28rpx; color: #999; }
</style>
