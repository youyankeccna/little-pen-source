<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'

const streakDays = ref(0)
const todayChecked = ref(false)
const checkinContent = ref('')
const plans = ref<any[]>([])
const records = ref<any[]>([])

// 获取打卡数据
const fetchData = async () => {
  try {
    // 获取连续打卡天数
    const streakRes = await fetch('http://127.0.0.1:8080/api/checkin/streak')
    const streakData = await streakRes.json()
    streakDays.value = streakData.streakDays
    
    // 获取今日打卡状态
    const todayRes = await fetch('http://127.0.0.1:8080/api/checkin/records?days=1')
    const todayData = await todayRes.json()
    todayChecked.value = todayData.records?.length > 0
    
    // 获取打卡记录
    const recordsRes = await fetch('http://127.0.0.1:8080/api/checkin/records?days=7')
    const recordsData = await recordsRes.json()
    records.value = recordsData.records || []
    
    // 获取每日计划
    const plansRes = await fetch('http://127.0.0.1:8080/api/plan/list')
    const plansData = await plansRes.json()
    plans.value = plansData.plans || []
  } catch (error) {
    console.error('获取打卡数据失败:', error)
  }
}

// 打卡
const doCheckin = async () => {
  if (!checkinContent.value.trim()) {
    uni.showToast({ title: '请输入今日练习内容', icon: 'none' })
    return
  }
  
  try {
    await fetch('http://127.0.0.1:8080/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: checkinContent.value })
    })
    todayChecked.value = true
    streakDays.value++
    checkinContent.value = ''
    uni.showToast({ title: '打卡成功', icon: 'success' })
    fetchData()
  } catch (error) {
    uni.showToast({ title: '打卡失败', icon: 'none' })
  }
}

// 创建每日计划
const createPlan = () => {
  uni.showModal({
    title: '创建每日计划',
    editable: true,
    placeholderText: '计划名称，如：每日字帖练习',
    success: async (res) => {
      if (res.confirm && res.content) {
        try {
          await fetch('http://127.0.0.1:8080/api/plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              title: res.content,
              content: '每天练习字帖',
              targetCount: 1
            })
          })
          uni.showToast({ title: '创建成功', icon: 'success' })
          fetchData()
        } catch (error) {
          uni.showToast({ title: '创建失败', icon: 'none' })
        }
      }
    }
  })
}

onShow(() => {
  fetchData()
})
</script>

<template>
  <view class="checkin-container">
    <!-- 打卡卡片 -->
    <view class="checkin-card">
      <view class="streak-info">
        <text class="streak-num">{{ streakDays }}</text>
        <text class="streak-label">连续打卡天数</text>
      </view>
      
      <view class="today-status">
        <text v-if="todayChecked" class="status-tag checked">✅ 今日已打卡</text>
        <text v-else class="status-tag pending">⏳ 今日待打卡</text>
      </view>
    </view>

    <!-- 打卡输入 -->
    <view class="checkin-form" v-if="!todayChecked">
      <view class="form-title">今日练习内容</view>
      <textarea v-model="checkinContent" class="form-input" placeholder="今天练习了什么？" maxlength="100" />
      <button class="checkin-btn" @tap="doCheckin">立即打卡</button>
    </view>

    <!-- 最近打卡记录 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">打卡记录</text>
      </view>
      <view class="records-list">
        <view v-for="record in records" :key="record.id" class="record-item">
          <text class="record-date">{{ record.date }}</text>
          <text class="record-content">{{ record.content }}</text>
        </view>
        <view v-if="records.length === 0" class="empty-hint">暂无打卡记录</view>
      </view>
    </view>

    <!-- 每日计划 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">每日计划</text>
        <text class="add-btn" @tap="createPlan">+ 添加</text>
      </view>
      <view class="plans-list">
        <view v-for="plan in plans" :key="plan.id" class="plan-item">
          <view class="plan-info">
            <text class="plan-title">{{ plan.title }}</text>
            <text class="plan-progress">{{ plan.completedCount }}/{{ plan.targetCount }} 次</text>
          </view>
          <text class="plan-status" :class="plan.status">{{ plan.status === 'completed' ? '已完成' : '进行中' }}</text>
        </view>
        <view v-if="plans.length === 0" class="empty-hint">暂无计划，点击上方添加</view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.checkin-container { min-height: 100vh; background-color: #f5f5f5; padding: 20rpx; }

.checkin-card {
  background: linear-gradient(135deg, #07c160 0%, #05a050 100%);
  border-radius: 24rpx;
  padding: 60rpx 40rpx;
  text-align: center;
  margin-bottom: 30rpx;
  
  .streak-info {
    margin-bottom: 30rpx;
    .streak-num { display: block; font-size: 96rpx; font-weight: bold; color: #fff; }
    .streak-label { display: block; font-size: 28rpx; color: rgba(255,255,255,0.9); }
  }
  
  .today-status {
    .status-tag { display: inline-block; padding: 12rpx 30rpx; border-radius: 30rpx; font-size: 28rpx; }
    .checked { background: rgba(255,255,255,0.2); color: #fff; }
    .pending { background: #fff; color: #07c160; }
  }
}

.checkin-form {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  
  .form-title { font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; }
  .form-input { width: 100%; height: 120rpx; padding: 20rpx; background: #f8f8f8; border-radius: 12rpx; font-size: 30rpx; box-sizing: border-box; }
  .checkin-btn { margin-top: 30rpx; height: 88rpx; line-height: 88rpx; background: #07c160; color: #fff; font-size: 32rpx; border-radius: 12rpx; border: none; }
}

.section { background: #fff; border-radius: 16rpx; padding: 30rpx; margin-bottom: 20rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.section-title { font-size: 32rpx; font-weight: bold; color: #333; }
.add-btn { font-size: 28rpx; color: #07c160; }

.records-list, .plans-list { .record-item, .plan-item { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 0; border-bottom: 1rpx solid #f0f0f0; } 
  .record-item:last-child, .plan-item:last-child { border-bottom: none; }
  .record-date { font-size: 26rpx; color: #999; }
  .record-content { font-size: 28rpx; color: #333; flex: 1; margin-left: 20rpx; }
  .plan-info { flex: 1; }
  .plan-title { display: block; font-size: 30rpx; color: #333; margin-bottom: 8rpx; }
  .plan-progress { display: block; font-size: 24rpx; color: #999; }
  .plan-status { font-size: 24rpx; padding: 4rpx 16rpx; border-radius: 8rpx; }
  .plan-status.completed { background: rgba(7,193,96,0.1); color: #07c160; }
  .plan-status.active { background: rgba(255,153,0,0.1); color: #ff9900; }
}

.empty-hint { text-align: center; color: #999; font-size: 28rpx; padding: 40rpx 0; }
</style>
