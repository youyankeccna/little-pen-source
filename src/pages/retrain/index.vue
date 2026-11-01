<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'

const wrongChars = ref<any[]>([])
const retrainTasks = ref<any[]>([])
const newChar = ref('')

// 获取错字数据
const fetchData = async () => {
  try {
    const charsRes = await fetch('http://127.0.0.1:8080/api/wrongchar/list')
    const charsData = await charsRes.json()
    wrongChars.value = charsData.wrongChars || []
    
    const tasksRes = await fetch('http://127.0.0.1:8080/api/retrain/list')
    const tasksData = await tasksRes.json()
    retrainTasks.value = tasksData.tasks || []
  } catch (error) {
    console.error('获取错字数据失败:', error)
  }
}

// 添加错字
const addWrongChar = async () => {
  if (!newChar.value.trim()) {
    uni.showToast({ title: '请输入错字', icon: 'none' })
    return
  }
  
  try {
    await fetch('http://127.0.0.1:8080/api/wrongchar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ char: newChar.value.trim() })
    })
    newChar.value = ''
    uni.showToast({ title: '添加成功', icon: 'success' })
    fetchData()
  } catch (error) {
    uni.showToast({ title: '添加失败', icon: 'none' })
  }
}

// 删除错字
const deleteWrongChar = async (id: string) => {
  try {
    await fetch(`http://127.0.0.1:8080/api/wrongchar/${id}`, { method: 'DELETE' })
    uni.showToast({ title: '已删除', icon: 'success' })
    fetchData()
  } catch (error) {
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
}

// 创建回炉任务
const createRetrain = async () => {
  if (wrongChars.value.length === 0) {
    uni.showToast({ title: '请先添加错字', icon: 'none' })
    return
  }
  
  try {
    const res = await fetch('http://127.0.0.1:8080/api/retrain/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '错字回炉练习' })
    })
    const data = await res.json()
    if (data.task) {
      uni.showToast({ title: '已创建回炉任务', icon: 'success' })
      fetchData()
    }
  } catch (error) {
    uni.showToast({ title: '创建失败', icon: 'none' })
  }
}

// 使用回炉任务生成字帖
const useRetrainTask = (task: any) => {
  uni.setStorageSync('retrainContent', task.chars)
  uni.navigateTo({ url: '/pages/config/index' })
}

onShow(() => {
  fetchData()
})
</script>

<template>
  <view class="retrain-container">
    <!-- 添加错字 -->
    <view class="add-section">
      <view class="section-title">添加错字</view>
      <view class="add-form">
        <input v-model="newChar" class="char-input" placeholder="输入一个错字" maxlength="1" />
        <button class="add-btn" @tap="addWrongChar">添加</button>
      </view>
    </view>

    <!-- 错字列表 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">我的错字 ({{ wrongChars.length }})</text>
      </view>
      <view class="chars-grid">
        <view v-for="char in wrongChars" :key="char.id" class="char-item">
          <text class="char-text">{{ char.char }}</text>
          <text class="char-count">错{{ char.wrongCount }}次</text>
          <text class="delete-btn" @tap="deleteWrongChar(char.id)">×</text>
        </view>
        <view v-if="wrongChars.length === 0" class="empty-hint">暂无错字记录</view>
      </view>
      <button v-if="wrongChars.length > 0" class="create-task-btn" @tap="createRetrain">生成回炉字帖</button>
    </view>

    <!-- 回炉任务 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">回炉任务</text>
      </view>
      <view class="tasks-list">
        <view v-for="task in retrainTasks" :key="task.id" class="task-item" @tap="useRetrainTask(task)">
          <view class="task-info">
            <text class="task-title">{{ task.title }}</text>
            <text class="task-chars">{{ task.chars }}</text>
          </view>
          <view class="task-status">
            <text class="status-text" :class="task.status">{{ task.completedCount }}/{{ task.totalCount }}</text>
            <text class="arrow">></text>
          </view>
        </view>
        <view v-if="retrainTasks.length === 0" class="empty-hint">暂无回炉任务</view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.retrain-container { min-height: 100vh; background-color: #f5f5f5; padding: 20rpx; }

.add-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  
  .section-title { font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; }
  .add-form { display: flex; gap: 20rpx; }
  .char-input { flex: 1; height: 80rpx; padding: 0 20rpx; background: #f8f8f8; border-radius: 12rpx; font-size: 36rpx; text-align: center; }
  .add-btn { width: 160rpx; height: 80rpx; line-height: 80rpx; background: #07c160; color: #fff; font-size: 28rpx; border-radius: 12rpx; border: none; }
}

.section { background: #fff; border-radius: 16rpx; padding: 30rpx; margin-bottom: 20rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.section-title { font-size: 32rpx; font-weight: bold; color: #333; }

.chars-grid { display: flex; flex-wrap: wrap; gap: 20rpx; margin-bottom: 30rpx; }
.char-item { position: relative; width: 120rpx; height: 120rpx; background: #f8f8f8; border-radius: 12rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.char-text { font-size: 48rpx; font-weight: bold; color: #333; }
.char-count { font-size: 20rpx; color: #ee0a24; }
.delete-btn { position: absolute; top: -10rpx; right: -10rpx; width: 36rpx; height: 36rpx; background: #ee0a24; color: #fff; border-radius: 50%; font-size: 28rpx; display: flex; align-items: center; justify-content: center; }

.create-task-btn { height: 80rpx; line-height: 80rpx; background: #ff976a; color: #fff; font-size: 30rpx; border-radius: 12rpx; border: none; }

.tasks-list { .task-item { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 0; border-bottom: 1rpx solid #f0f0f0; }
  .task-item:last-child { border-bottom: none; }
  .task-info { flex: 1; }
  .task-title { display: block; font-size: 30rpx; color: #333; margin-bottom: 8rpx; }
  .task-chars { display: block; font-size: 26rpx; color: #999; }
  .task-status { display: flex; align-items: center; gap: 12rpx; }
  .status-text { font-size: 26rpx; padding: 4rpx 16rpx; border-radius: 8rpx; }
  .status-text.completed { background: rgba(7,193,96,0.1); color: #07c160; }
  .status-text.pending, .status-text.in_progress { background: rgba(255,153,0,0.1); color: #ff9900; }
  .arrow { font-size: 28rpx; color: #ccc; }
}

.empty-hint { text-align: center; color: #999; font-size: 28rpx; padding: 40rpx 0; }
</style>
