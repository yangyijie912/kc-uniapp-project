<template>
  <view class="page">
    <!-- 第一区块：概览 -->
    <view class="section">
      <view class="section-title">概览</view>
      <view class="summary-grid">
        <view class="summary-card summary-card-total">
          <view class="summary-label">总卡片数</view>
          <view class="summary-value">248</view>
        </view>
        <view class="summary-card summary-card-review">
          <view class="summary-label">待复习</view>
          <view class="summary-value">69</view>
        </view>
        <view class="summary-card summary-card-mastered">
          <view class="summary-label">掌握数</view>
          <view class="summary-value">178</view>
        </view>
        <view class="summary-card summary-card-rate">
          <view class="summary-label">掌握率</view>
          <view class="summary-value">72%</view>
        </view>
      </view>
    </view>

    <!-- 第二区块：今日状态 -->
    <view class="section">
      <view class="section-title">今日状态</view>
      <view class="today-panel">
        <view class="today-main-card">
          <view class="today-main-head">
            <view>
              <view class="today-main-label">今日测验进度</view>
              <view class="today-main-tip"
                >{{ todayStats.quizDone }} / {{ todayStats.quizTarget }} 已完成</view
              >
            </view>
            <view class="today-main-badge">{{ todayStats.quizRate }}%</view>
          </view>
          <view class="today-progress-track">
            <view class="today-progress-fill" :style="{ width: `${todayStats.quizRate}%` }"></view>
          </view>
        </view>
        <view class="today-side-grid">
          <view class="today-side-card today-side-card-practice">
            <view class="today-side-label">今日刷题数</view>
            <view class="today-side-value">{{ todayStats.practiceCount }}</view>
            <view class="today-side-tip">较昨日 +{{ todayStats.practiceDelta }}</view>
          </view>
          <view class="today-side-card today-side-card-correct">
            <view class="today-side-label">掌握题数</view>
            <view class="today-side-value">{{ todayStats.correctCount }}</view>
            <view class="today-side-tip">掌握率 {{ todayStats.correctRate }}%</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 第三区块：状态分布 -->
    <view class="section">
      <view class="section-title">卡片状态分布</view>
      <view class="status-distribution">
        <view class="dist-item">
          <view class="dist-item-head">
            <view class="dist-dot dist-dot-mastered"></view>
            <view class="dist-name">掌握</view>
          </view>
          <view class="dist-value">178 张</view>
          <view class="dist-percent">71.8%</view>
        </view>
        <view class="dist-item">
          <view class="dist-item-head">
            <view class="dist-dot dist-dot-fuzzy"></view>
            <view class="dist-name">模糊</view>
          </view>
          <view class="dist-value">45 张</view>
          <view class="dist-percent">18.1%</view>
        </view>
        <view class="dist-item">
          <view class="dist-item-head">
            <view class="dist-dot dist-dot-unknown"></view>
            <view class="dist-name">未知</view>
          </view>
          <view class="dist-value">20 张</view>
          <view class="dist-percent">8.1%</view>
        </view>
        <view class="dist-item">
          <view class="dist-item-head">
            <view class="dist-dot dist-dot-undefined"></view>
            <view class="dist-name">未设置</view>
          </view>
          <view class="dist-value">5 张</view>
          <view class="dist-percent">2.0%</view>
        </view>
      </view>
    </view>

    <!-- 第四区块：学习活跃度 -->
    <view class="section">
      <view class="section-title">学习活跃度</view>
      <view class="activity-toolbar">
        <view
          class="activity-tab"
          :class="{ 'activity-tab-active': activityRange === '7d' }"
          @click="activityRange = '7d'"
        >
          7 天
        </view>
        <view
          class="activity-tab"
          :class="{ 'activity-tab-active': activityRange === '30d' }"
          @click="activityRange = '30d'"
        >
          30 天
        </view>
      </view>
      <view class="activity-grid">
        <view class="activity-card activity-card-added">
          <view class="activity-card-label">新增</view>
          <view class="activity-card-value">{{ currentActivityStats.added }}</view>
        </view>
        <view class="activity-card activity-card-updated">
          <view class="activity-card-label">更新</view>
          <view class="activity-card-value">{{ currentActivityStats.updated }}</view>
        </view>
        <view class="activity-card activity-card-practice">
          <view class="activity-card-label">刷题</view>
          <view class="activity-card-value">{{ currentActivityStats.practice }}</view>
        </view>
        <view class="activity-card activity-card-mastered">
          <view class="activity-card-label">掌握</view>
          <view class="activity-card-value">{{ currentActivityStats.mastered }}</view>
        </view>
      </view>
    </view>

    <!-- 第五区块：分类表现 -->
    <view class="section">
      <view class="section-title">分类表现</view>
      <view class="category-table">
        <view class="table-header">
          <view class="th-name">分类</view>
          <view class="th-cards">卡片数</view>
          <view class="th-rate">掌握率</view>
          <view class="th-review">待复习</view>
        </view>

        <view class="table-row">
          <view class="td-name">React 核心</view>
          <view class="td-cards">48</view>
          <view class="td-rate">85%</view>
          <view class="td-review">7</view>
        </view>

        <view class="table-row">
          <view class="td-name">Vue 3</view>
          <view class="td-cards">42</view>
          <view class="td-rate">78%</view>
          <view class="td-review">9</view>
        </view>

        <view class="table-row">
          <view class="td-name">TypeScript</view>
          <view class="td-cards">38</view>
          <view class="td-rate">71%</view>
          <view class="td-review">11</view>
        </view>

        <view class="table-row">
          <view class="td-name">JavaScript 进阶</view>
          <view class="td-cards">35</view>
          <view class="td-rate">65%</view>
          <view class="td-review">12</view>
        </view>

        <view class="table-row">
          <view class="td-name">CSS 布局</view>
          <view class="td-cards">32</view>
          <view class="td-rate">62%</view>
          <view class="td-review">12</view>
        </view>

        <view class="table-row">
          <view class="td-name">HTTP 协议</view>
          <view class="td-cards">28</view>
          <view class="td-rate">58%</view>
          <view class="td-review">12</view>
        </view>

        <view class="table-row">
          <view class="td-name">浏览器原理</view>
          <view class="td-cards">25</view>
          <view class="td-rate">56%</view>
          <view class="td-review">11</view>
        </view>

        <view class="table-row">
          <view class="td-name">性能优化</view>
          <view class="td-cards">20</view>
          <view class="td-rate">50%</view>
          <view class="td-review">10</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';

const activityRange = ref<'7d' | '30d'>('7d');

const activityStatsMap = {
  '7d': {
    added: 12,
    updated: 8,
    practice: 45,
    mastered: 28,
  },
  '30d': {
    added: 48,
    updated: 35,
    practice: 168,
    mastered: 96,
  },
};

// 今日状态先用静态演示数据占位，后续接入真实测验与练习记录。
const todayStats = {
  quizDone: 18,
  quizTarget: 30,
  quizRate: 60,
  practiceCount: 42,
  practiceDelta: 6,
  correctCount: 34,
  correctRate: 81,
};

// 先用静态演示数据承接交互，后续再替换成真实统计结果。
const currentActivityStats = computed(() => activityStatsMap[activityRange.value]);

onShow(() => {
  // 后续接入真实数据逻辑
});
</script>

<style scoped>
.page {
  width: 100%;
  overflow-x: hidden;
  padding: 24rpx 28rpx 48rpx;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top left, rgba(239, 125, 66, 0.14), transparent 34%),
    radial-gradient(circle at top right, rgba(31, 94, 255, 0.12), transparent 30%),
    linear-gradient(180deg, #f8f2e8 0%, #efe5d5 100%);
}

/* ============ Section 容器 ============ */
.section {
  margin-bottom: 32rpx;
}

.section-title {
  color: #1e1c18;
  font-size: 30rpx;
  font-weight: 700;
  margin-bottom: 16rpx;
}

/* ============ 第一区块：概览 ============ */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
}

.summary-card {
  padding: 22rpx;
  border-radius: 24rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 252, 247, 0.84);
  box-shadow: 0 10rpx 28rpx rgba(80, 55, 25, 0.04);
}

.summary-card-total .summary-value {
  color: #1e1c18;
}

.summary-card-review .summary-value {
  color: #ef7d42;
}

.summary-card-mastered .summary-value {
  color: #127a72;
}

.summary-card-rate .summary-value {
  color: #1f5eff;
}

.summary-label {
  color: #6c645a;
  font-size: 22rpx;
}

.summary-value {
  margin-top: 12rpx;
  color: #1e1c18;
  font-size: 44rpx;
  line-height: 1;
  font-weight: 700;
}

/* ============ 第二区块：今日状态 ============ */
.today-panel {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.today-main-card,
.today-side-card {
  border-radius: 24rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  box-shadow: 0 10rpx 28rpx rgba(80, 55, 25, 0.04);
  box-sizing: border-box;
}

.today-main-card {
  padding: 20rpx;
  background:
    linear-gradient(135deg, rgba(31, 94, 255, 0.12), rgba(255, 252, 247, 0.92)),
    rgba(255, 252, 247, 0.9);
}

.today-main-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12rpx;
}

.today-main-label {
  color: #1e1c18;
  font-size: 26rpx;
  font-weight: 700;
}

.today-main-tip {
  margin-top: 6rpx;
  color: #6c645a;
  font-size: 22rpx;
}

.today-main-badge {
  min-width: 78rpx;
  padding: 8rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(31, 94, 255, 0.14);
  color: #1f5eff;
  font-size: 22rpx;
  line-height: 1.2;
  text-align: center;
  font-weight: 700;
  box-sizing: border-box;
}

.today-progress-track {
  margin-top: 20rpx;
  height: 12rpx;
  border-radius: 999rpx;
  background: rgba(31, 94, 255, 0.12);
  overflow: hidden;
}

.today-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #1f5eff 0%, #5b8dff 100%);
}

.today-side-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
}

.today-side-card {
  padding: 18rpx;
  background: rgba(255, 252, 247, 0.88);
}

.today-side-card-practice {
  background:
    linear-gradient(135deg, rgba(239, 125, 66, 0.12), rgba(255, 252, 247, 0.92)),
    rgba(255, 252, 247, 0.9);
}

.today-side-card-correct {
  background:
    linear-gradient(135deg, rgba(18, 122, 114, 0.12), rgba(255, 252, 247, 0.92)),
    rgba(255, 252, 247, 0.9);
}

.today-side-label {
  color: #6c645a;
  font-size: 22rpx;
}

.today-side-value {
  margin-top: 10rpx;
  color: #1e1c18;
  font-size: 36rpx;
  line-height: 1;
  font-weight: 700;
}

.today-side-tip {
  margin-top: 8rpx;
  color: #8f877b;
  font-size: 20rpx;
}

/* ============ 第三区块：状态分布 ============ */
.status-distribution {
  padding: 24rpx;
  border-radius: 28rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 252, 247, 0.84);
  box-shadow: 0 16rpx 40rpx rgba(80, 55, 25, 0.06);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.dist-item {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.dist-item-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.dist-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
}

.dist-dot-mastered {
  background: #127a72;
}

.dist-dot-fuzzy {
  background: #f59e0b;
}

.dist-dot-unknown {
  background: #ef4444;
}

.dist-dot-undefined {
  background: #9ca3af;
}

.dist-name {
  color: #1e1c18;
  font-size: 24rpx;
  font-weight: 600;
}

.dist-value {
  color: #1e1c18;
  font-size: 28rpx;
  font-weight: 700;
}

.dist-percent {
  color: #8f877b;
  font-size: 20rpx;
}

/* ============ 第四区块：学习活跃度 ============ */
.activity-toolbar {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.activity-tab {
  min-width: 76rpx;
  padding: 10rpx 18rpx;
  border-radius: 18rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 252, 247, 0.88);
  color: #6c645a;
  font-size: 22rpx;
  line-height: 1.2;
  text-align: center;
  font-weight: 600;
  box-sizing: border-box;
}

.activity-tab-active {
  border-color: rgba(31, 94, 255, 0.2);
  background: rgba(31, 94, 255, 0.12);
  color: #1f5eff;
}

.activity-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
}

.activity-card {
  padding: 22rpx;
  border-radius: 24rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 252, 247, 0.84);
  box-shadow: 0 10rpx 28rpx rgba(80, 55, 25, 0.04);
}

.activity-card-label {
  color: #6c645a;
  font-size: 22rpx;
}

.activity-card-value {
  margin-top: 12rpx;
  font-size: 44rpx;
  line-height: 1;
  font-weight: 700;
}

.activity-card-added .activity-card-value {
  color: #ef7d42;
}

.activity-card-updated .activity-card-value {
  color: #1f5eff;
}

.activity-card-practice .activity-card-value {
  color: #8b5cf6;
}

.activity-card-mastered .activity-card-value {
  color: #127a72;
}

/* ============ 第五区块：分类表现 ============ */
.category-table {
  display: flex;
  flex-direction: column;
  border-radius: 20rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 252, 247, 0.88);
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  column-gap: 8rpx;
  padding: 14rpx 16rpx;
  background: rgba(61, 43, 24, 0.04);
  border-bottom: 1rpx solid rgba(61, 43, 24, 0.08);
  align-items: center;
}

.th-name,
.th-cards,
.th-rate,
.th-review {
  color: #6c645a;
  font-size: 22rpx;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.th-cards,
.th-rate,
.th-review {
  text-align: center;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  column-gap: 8rpx;
  padding: 14rpx 16rpx;
  border-bottom: 1rpx solid rgba(61, 43, 24, 0.06);
  align-items: center;
}

.table-row:last-child {
  border-bottom: none;
}

.td-name {
  color: #1e1c18;
  font-size: 24rpx;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.td-cards,
.td-rate,
.td-review {
  color: #1e1c18;
  font-size: 24rpx;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
