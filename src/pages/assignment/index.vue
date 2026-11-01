<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'

const role = ref<'teacher' | 'parent'>('parent')
const assignments = ref<any[]>([])
const showCreateModal = ref(false)
const newAssignment = ref({ title: '', content: '', dueDate: '' })

// 获取作业列表
const fetchAssignments = async () => {
  try {
    const res = await fetch('http://127.0.0.1:8080/api/assignment/list?status=active')
    const data = await res.json()
    assignments.value = data.assignments || []
  } catch (error) {
    console.error('获取作业失败:', error)
  }
}

// 切换角色
const switchRole = (r: 'teacher' | 'parent') => {
  role.value = r
}

// 创建作业（老师）
const createAssignment = async () => {
  if (!newAssignment.value.title || !newAssignment.value.content) {
    uni.showToast({ title: '请填写完整', icon: 'none' })
    return
  }
  
  try {
    await fetch('http://127.0.0.1:8080/api/assignment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId: 'teacher_1',
        classId: 'class_1',
        title: newAssignment.value.title,
        content: newAssignment.value.content,
        dueDate: newAssignment.value.dueDate
      })
    })
    showCreateModal.value = false
    newAssignment.value = { title: '', content: '', dueDate: '' }
    uni.showToast({ title: '发布成功', icon: 'success' })
    fetchAssignments()
  } catch (error) {
    uni.showToast({ title: '发布失败', icon: 'none' })
  }
}

// 使用作业内容生成字帖
const useAssignment = (item: any) => {
  uni.setStorageSync('assignmentContent', item.content)
  uni.navigateTo({ url: '/pages/config/index' })
}

// 家长完成作业
const completeAssignment = (id: string) => {
  uni.showToast({ title: '已标记完成', icon: 'success' })
}

onShow(() => {
  fetchAssignments()
})
</script>

<template>
  <view class="assignment-container">
    <!-- 角色切换 -->
    <view class="role-switch">
      <view class="switch-item" :class="{ active: role === 'teacher' }" @tap="switchRole('teacher')">
        <text class="switch-icon">👨‍🏫</text>
        <text>老师</text>
      </view>
      <view class="switch-item" :class="{ active: role === 'parent' }" @tap="switchRole('parent')">
        <text class="switch-icon">👨‍👩‍👧</text>
        <text>家长</text>
      </view>
    </view>

    <!-- 老师：创建作业 -->
    <view v-if="role === 'teacher'" class="create-section">
      <button class="create-btn" @tap="showCreateModal = true">+ 布置作业</button>
    </view>

    <!-- 作业列表 -->
    <view class="section">
      <view class="section-title">作业列表</view>
      <view class="assignment-list">
        <view v-for="item in assignments" :key="item.id" class="assignment-item">
          <view class="assignment-header">
            <text class="assignment-title">{{ item.title }}</text>
            <text class="assignment-status">进行中</text>
          </view>
          <text class="assignment-content">{{ item.content }}</text>
          <view class="assignment-footer">
            <text class="assignment-date">截止: {{ item.dueDate || '长期' }}</text>
            <view class="assignment-actions">
              <button v-if="role === 'parent'" class="action-btn" @tap="useAssignment(item)">生成字帖</button>
              <button v-if="role === 'parent'" class="action-btn primary" @tap="completeAssignment(item.id)">完成</button>
            </view>
          </view>
        </view>
        <view v-if="assignments.length === 0" class="empty-hint">暂无作业</view>
      </view>
    </view>

    <!-- 创建作业弹窗 -->
    <view v-if="showCreateModal" class="modal-mask" @tap="showCreateModal = false">
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">布置作业</text>
          <text class="modal-close" @tap="showCreateModal = false">×</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">作业标题</text>
            <input v-model="newAssignment.title" class="form-input" placeholder="如：本周生字练习" />
          </view>
          <view class="form-item">
            <text class="form-label">练习内容</text>
            <textarea v-model="newAssignment.content" class="form-textarea" placeholder="如：春夏秋冬山川河流" />
          </view>
          <view class="form-item">
            <text class="form-label">截止日期（可选）</text>
            <input v-model="newAssignment.dueDate" class="form-input" placeholder="如：2026-03-25" />
          </view>
        </view>
        <view class="modal-footer">
          <button class="cancel-btn" @tap="showCreateModal = false">取消</button>
          <button class="confirm-btn" @tap="createAssignment">发布</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.assignment-container { min-height: 100vh; background-color: #f5f5f5; padding: 20rpx; }

.role-switch {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  padding: 10rpx;
  margin-bottom: 30rpx;
  
  .switch-item {
    flex: 1;
    text-align: center;
    padding: 20rpx;
    border-radius: 12rpx;
    font-size: 28rpx;
    color: #666;
    
    &.active { background: #07c160; color: #fff; }
    .switch-icon { display: block; font-size: 48rpx; margin-bottom: 8rpx; }
  }
}

.create-section { margin-bottom: 30rpx; }
.create-btn { width: 100%; height: 88rpx; line-height: 88rpx; background: #07c160; color: #fff; font-size: 32rpx; border-radius: 16rpx; border: none; }

.section { background: #fff; border-radius: 16rpx; padding: 30rpx; }
.section-title { font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; }

.assignment-list { .assignment-item { padding: 24rpx; background: #f8f8f8; border-radius: 12rpx; margin-bottom: 20rpx; }
  .assignment-item:last-child { margin-bottom: 0; }
  .assignment-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
  .assignment-title { font-size: 32rpx; font-weight: bold; color: #333; }
  .assignment-status { font-size: 24rpx; color: #07c160; background: rgba(7,193,96,0.1); padding: 4rpx 16rpx; border-radius: 8rpx; }
  .assignment-content { display: block; font-size: 28rpx; color: #666; margin-bottom: 16rpx; line-height: 1.5; }
  .assignment-footer { display: flex; justify-content: space-between; align-items: center; }
  .assignment-date { font-size: 24rpx; color: #999; }
  .assignment-actions { display: flex; gap: 12rpx; }
  .action-btn { padding: 12rpx 24rpx; font-size: 24rpx; border-radius: 8rpx; background: #fff; border: 1rpx solid #ddd; }
  .action-btn.primary { background: #07c160; color: #fff; border: none; }
}

.empty-hint { text-align: center; color: #999; font-size: 28rpx; padding: 60rpx 0; }

.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-content { width: 600rpx; background: #fff; border-radius: 16rpx; overflow: hidden; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 30rpx; border-bottom: 1rpx solid #f0f0f0; }
.modal-title { font-size: 32rpx; font-weight: bold; color: #333; }
.modal-close { font-size: 48rpx; color: #999; }
.modal-body { padding: 30rpx; }
.form-item { margin-bottom: 24rpx; }
.form-label { display: block; font-size: 28rpx; color: #333; margin-bottom: 12rpx; }
.form-input { width: 100%; height: 80rpx; padding: 0 20rpx; background: #f8f8f8; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.form-textarea { width: 100%; height: 160rpx; padding: 20rpx; background: #f8f8f8; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.modal-footer { display: flex; border-top: 1rpx solid #f0f0f0; }
.cancel-btn, .confirm-btn { flex: 1; height: 100rpx; line-height: 100rpx; font-size: 32rpx; border: none; border-radius: 0; }
.cancel-btn { background: #fff; color: #666; }
.confirm-btn { background: #07c160; color: #fff; }
</style>
