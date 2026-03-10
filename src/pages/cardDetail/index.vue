<template>
  <view class="page">
    <view class="detail-card">
      <view class="detail-tag">React / Hooks</view>
      <view class="detail-title">为什么 React 不推荐用 index 作为 key？</view>
      <view class="detail-summary">这个问题通常出现在列表渲染、排序和删除场景里，是面试高频题。</view>
    </view>

    <view class="panel">
      <view class="panel-title">标准答案</view>
      <view class="panel-text">
        因为 key 用来标识节点稳定性。使用 index 时，一旦列表顺序变化，React 可能把旧节点错误复用到新位置，导致状态和 DOM
        不一致。
      </view>
    </view>

    <view class="panel">
      <view class="panel-title">记忆提示</view>
      <view class="bullet">key 的作用不是消除警告，而是辅助 diff</view>
      <view class="bullet">顺序会变的列表，不要用 index</view>
      <view class="bullet">静态列表、永不变动时才勉强可以接受</view>
    </view>

    <view class="action-row">
      <view class="ghost-btn">标记模糊</view>
      <view class="primary-btn">标记掌握</view>
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

.detail-card,
.panel {
  border-radius: 28rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 252, 247, 0.84);
  box-shadow: 0 16rpx 40rpx rgba(80, 55, 25, 0.06);
}

.detail-card {
  padding: 30rpx;
}

.detail-tag {
  color: #127a72;
  font-size: 22rpx;
}

.detail-title {
  margin-top: 12rpx;
  color: #1e1c18;
  font-size: 40rpx;
  line-height: 1.4;
  font-weight: 700;
}

.detail-summary {
  margin-top: 14rpx;
  color: #6c645a;
  font-size: 26rpx;
  line-height: 1.7;
}

.panel {
  margin-top: 22rpx;
  padding: 28rpx;
}

.panel-title {
  color: #1e1c18;
  font-size: 30rpx;
  font-weight: 700;
}

.panel-text,
.bullet {
  margin-top: 14rpx;
  color: #6c645a;
  font-size: 26rpx;
  line-height: 1.8;
}

.action-row {
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
  background: #1f5eff;
  color: #fff;
}
</style>
