<template>
  <view class="page">
    <view class="progress-card">
      <view class="progress-top">
        <view class="progress-label">今日测验</view>
        <view class="progress-count">2 / 10</view>
      </view>
      <view class="progress-track">
        <view class="progress-bar"></view>
      </view>
    </view>

    <view class="question-card">
      <view class="question-tag">React / Hooks</view>
      <view class="question-title">为什么 useEffect 不能直接写成 async？</view>
      <view class="question-desc">先想返回值，再想副作用执行时机。</view>
    </view>

    <view class="answer-list">
      <view class="answer-item">因为 async 会返回 Promise，不符合 effect 对 cleanup 函数的预期。</view>
      <view class="answer-item">因为 async 会阻塞组件渲染。</view>
      <view class="answer-item">因为 React 不支持异步函数。</view>
    </view>

    <view class="bottom-row">
      <view class="ghost-btn">跳过</view>
      <view class="primary-btn">提交答案</view>
    </view>
  </view>
</template>

<script setup lang="ts"></script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx 28rpx 48rpx;
  box-sizing: border-box;
  background: linear-gradient(180deg, #f8f2e8 0%, #efe5d5 100%);
}

.progress-card,
.question-card,
.answer-item {
  border-radius: 28rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 252, 247, 0.84);
  box-shadow: 0 16rpx 40rpx rgba(80, 55, 25, 0.06);
}

.progress-card,
.question-card {
  padding: 28rpx;
}

.progress-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-label,
.progress-count,
.question-tag {
  font-size: 24rpx;
}

.progress-label,
.question-tag {
  color: #127a72;
}

.progress-count {
  color: #6c645a;
}

.progress-track {
  margin-top: 16rpx;
  height: 16rpx;
  border-radius: 999rpx;
  background: rgba(31, 94, 255, 0.08);
  overflow: hidden;
}

.progress-bar {
  width: 20%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #1f5eff, #5e93ff);
}

.question-card {
  margin-top: 22rpx;
}

.question-title {
  margin-top: 12rpx;
  color: #1e1c18;
  font-size: 40rpx;
  line-height: 1.4;
  font-weight: 700;
}

.question-desc {
  margin-top: 14rpx;
  color: #6c645a;
  font-size: 26rpx;
}

.answer-list {
  margin-top: 22rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.answer-item {
  padding: 24rpx;
  color: #1e1c18;
  font-size: 28rpx;
  line-height: 1.7;
}

.bottom-row {
  margin-top: 24rpx;
  display: flex;
  gap: 16rpx;
}

.ghost-btn,
.primary-btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.72);
  color: #6c645a;
}

.primary-btn {
  background: #ef7d42;
  color: #fff;
}
</style>
