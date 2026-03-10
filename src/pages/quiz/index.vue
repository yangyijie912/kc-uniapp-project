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
      <view class="reveal-btn" @click="toggleAnswer">
        {{ showAnswer ? '收起答案' : '展开查看答案' }}
      </view>
    </view>

    <view v-if="showAnswer" class="answer-panel">
      <view class="answer-label">参考答案</view>
      <view class="answer-text"
        >因为 async 会返回 Promise，不符合 effect 对 cleanup 函数的预期。effect
        期望返回的是清理函数，或者不返回内容。</view
      >
      <view class="answer-tip">记忆点：先想 useEffect 的返回值，再判断 async 会不会破坏这个约定。</view>

      <view class="content-block">
        <view class="content-label">补充笔记</view>
        <rich-text class="content-rich" :nodes="content"></rich-text>
      </view>
    </view>

    <view class="bottom-row">
      <view class="status-btn status-unknown">不会</view>
      <view class="status-btn status-fuzzy">模糊</view>
      <view class="status-btn status-mastered">掌握</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const showAnswer = ref(false);
const content = `
  <h3>补充理解</h3>
  <p>useEffect 的返回值只能是 cleanup 函数，或者什么都不返回。</p>
  <p>如果直接写成 async，返回值会变成 Promise，语义就错了。</p>
`;

const toggleAnswer = () => {
  showAnswer.value = !showAnswer.value;
};
</script>

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

.reveal-btn {
  margin-top: 22rpx;
  height: 78rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: rgba(31, 94, 255, 0.1);
  color: #1f5eff;
  font-size: 26rpx;
  font-weight: 600;
}

.answer-panel {
  margin-top: 22rpx;
  padding: 28rpx;
  border-radius: 28rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 252, 247, 0.84);
  box-shadow: 0 16rpx 40rpx rgba(80, 55, 25, 0.06);
}

.answer-label {
  color: #127a72;
  font-size: 22rpx;
}

.answer-text {
  margin-top: 12rpx;
  color: #1e1c18;
  font-size: 30rpx;
  line-height: 1.7;
}

.answer-tip {
  margin-top: 14rpx;
  color: #6c645a;
  font-size: 24rpx;
  line-height: 1.7;
}

.content-block {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid rgba(61, 43, 24, 0.08);
}

.content-label {
  color: #127a72;
  font-size: 22rpx;
}

.bottom-row {
  margin-top: 24rpx;
  display: flex;
  gap: 16rpx;
}

.status-btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.status-unknown {
  background: rgba(255, 255, 255, 0.72);
  color: #6c645a;
}

.status-fuzzy {
  background: rgba(239, 125, 66, 0.14);
  color: #c76530;
}

.status-mastered {
  background: #ef7d42;
  color: #fff7ed;
}
</style>
