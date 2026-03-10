<template>
  <view class="page">
    <view class="intro-card">
      <view class="eyebrow">分类浏览</view>
      <view class="title">React</view>
      <view class="desc">从 Hooks、性能优化和组件设计开始，把相关题目集中练熟。</view>
    </view>

    <view class="panel">
      <view class="section-title">子分类</view>
      <view class="chip-list">
        <view class="chip active">Hooks</view>
        <view class="chip">状态管理</view>
        <view class="chip">性能优化</view>
        <view class="chip">组件设计</view>
      </view>
    </view>

    <view class="panel">
      <view class="section-title">推荐入口</view>
      <view class="topic-list">
        <view class="topic-item">
          <view>
            <view class="topic-name">基础 Hooks</view>
            <view class="topic-meta">12 张卡片</view>
          </view>
          <view class="topic-action">进入</view>
        </view>
        <view class="topic-item">
          <view>
            <view class="topic-name">副作用与生命周期</view>
            <view class="topic-meta">8 张卡片</view>
          </view>
          <view class="topic-action">进入</view>
        </view>
        <view class="topic-item">
          <view>
            <view class="topic-name">自定义 Hooks</view>
            <view class="topic-meta">6 张卡片</view>
          </view>
          <view class="topic-action">进入</view>
        </view>
      </view>
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

.intro-card,
.panel {
  border-radius: 28rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 252, 247, 0.84);
  box-shadow: 0 16rpx 40rpx rgba(80, 55, 25, 0.06);
}

.intro-card {
  padding: 30rpx;
}

.eyebrow {
  color: #127a72;
  font-size: 22rpx;
}

.title {
  margin-top: 12rpx;
  color: #1e1c18;
  font-size: 44rpx;
  font-weight: 700;
}

.desc {
  margin-top: 14rpx;
  color: #6c645a;
  font-size: 26rpx;
  line-height: 1.7;
}

.panel {
  margin-top: 22rpx;
  padding: 28rpx;
}

.section-title {
  color: #1e1c18;
  font-size: 32rpx;
  font-weight: 700;
}

.chip-list {
  margin-top: 18rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.chip {
  padding: 14rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.78);
  border: 1rpx solid rgba(61, 43, 24, 0.08);
  color: #6c645a;
  font-size: 24rpx;
}

.chip.active {
  background: rgba(31, 94, 255, 0.1);
  border-color: rgba(31, 94, 255, 0.18);
  color: #1f5eff;
}

.topic-list {
  margin-top: 18rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.topic-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.72);
}

.topic-name {
  color: #1e1c18;
  font-size: 30rpx;
  font-weight: 600;
}

.topic-meta {
  margin-top: 6rpx;
  color: #6c645a;
  font-size: 24rpx;
}

.topic-action {
  color: #1f5eff;
  font-size: 26rpx;
  font-weight: 600;
}
</style>
