<template>
  <view class="page">
    <view class="hero-card">
      <view class="hero-badge">Quiz</view>
      <view class="title">测验结果</view>
      <view class="subtitle">
        {{ quizResult.total }} 道题，{{ quizResult.unknown }} 道不会，{{ quizResult.fuzzy }} 道模糊，{{
          quizResult.mastered
        }}
        道掌握。
      </view>
    </view>

    <view class="summary-grid">
      <view class="summary-card summary-card-total">
        <view class="summary-label">总题数</view>
        <view class="summary-value">{{ quizResult.total }}</view>
      </view>
      <view class="summary-card summary-card-mastered">
        <view class="summary-label">掌握</view>
        <view class="summary-value">{{ quizResult.mastered }}</view>
      </view>
    </view>

    <view class="status-panel">
      <view class="panel-head">
        <view class="panel-title">本轮分布</view>
        <view class="panel-hint">按当前测验结果统计</view>
      </view>

      <view class="status-list">
        <view class="status-item status-item-unknown">
          <view class="status-item-left">
            <view class="status-dot"></view>
            <view class="status-name">不会</view>
          </view>
          <view class="status-count">{{ quizResult.unknown }}</view>
        </view>

        <view class="status-item status-item-fuzzy">
          <view class="status-item-left">
            <view class="status-dot"></view>
            <view class="status-name">模糊</view>
          </view>
          <view class="status-count">{{ quizResult.fuzzy }}</view>
        </view>

        <view class="status-item status-item-mastered">
          <view class="status-item-left">
            <view class="status-dot"></view>
            <view class="status-name">掌握</view>
          </view>
          <view class="status-count">{{ quizResult.mastered }}</view>
        </view>
      </view>
    </view>

    <view class="action-row">
      <view class="action-btn action-btn-secondary" @click="toHome">返回列表</view>
      <view class="action-btn action-btn-primary" @click="restartQuiz">再来一轮</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { jsonToUrlParam } from '@/utils/jsonToUrl';
import type { quizQuery } from '@/types/quiz';

const quizResult = reactive({
  total: 0,
  unknown: 0,
  fuzzy: 0,
  mastered: 0,
});

const quizOptions = reactive<Partial<quizQuery>>({});

onShow(() => {
  const resultStr = uni.getStorageSync('quizResult');
  if (resultStr) {
    Object.assign(quizResult, JSON.parse(resultStr));
  }
});

const toHome = () => {
  uni.redirectTo({
    url: '/pages/index/index',
  });
};

const restartQuiz = () => {
  uni.redirectTo({
    url: `/pages/quiz/index?${jsonToUrlParam(quizOptions)}`,
  });
};

onLoad((options) => {
  if (options?.categoryId) {
    quizOptions.categoryId = options.categoryId;
  }
  if (options?.mode) {
    quizOptions.mode = options.mode as quizQuery['mode'];
  }
  if (options?.type) {
    quizOptions.type = options.type as quizQuery['type'];
  }
  if (options?.limit) {
    quizOptions.limit = Number(options.limit);
  }
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

.hero-card {
  position: relative;
  overflow: hidden;
  padding: 36rpx 32rpx;
  border-radius: 32rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: linear-gradient(135deg, rgba(255, 252, 247, 0.96), rgba(255, 247, 239, 0.9)), rgba(255, 252, 247, 0.9);
  box-shadow: 0 18rpx 44rpx rgba(80, 55, 25, 0.08);
}

.hero-card::after {
  content: '';
  position: absolute;
  top: -80rpx;
  right: -20rpx;
  width: 220rpx;
  height: 220rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(31, 94, 255, 0.12), transparent 68%);
  pointer-events: none;
}

.hero-badge {
  position: relative;
  z-index: 1;
  width: fit-content;
  min-width: 110rpx;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(18, 122, 114, 0.12);
  color: #127a72;
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.title {
  position: relative;
  z-index: 1;
  margin-top: 22rpx;
  color: #1e1c18;
  font-size: 48rpx;
  line-height: 1.3;
  font-weight: 700;
}

.subtitle {
  position: relative;
  z-index: 1;
  margin-top: 16rpx;
  max-width: 560rpx;
  color: #6c645a;
  font-size: 26rpx;
  line-height: 1.8;
}

.summary-grid {
  margin-top: 22rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
}

.summary-card,
.status-panel {
  border-radius: 28rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 252, 247, 0.84);
  box-shadow: 0 16rpx 40rpx rgba(80, 55, 25, 0.06);
}

.summary-card {
  padding: 28rpx;
}

.summary-label {
  color: #6c645a;
  font-size: 22rpx;
}

.summary-value {
  margin-top: 14rpx;
  color: #1e1c18;
  font-size: 52rpx;
  line-height: 1;
  font-weight: 700;
}

.summary-card-total {
  background: rgba(255, 252, 247, 0.88);
}

.summary-card-mastered {
  background: linear-gradient(135deg, rgba(18, 122, 114, 0.12), rgba(255, 252, 247, 0.9));
}

.status-panel {
  margin-top: 22rpx;
  padding: 28rpx;
}

.panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16rpx;
}

.panel-title {
  color: #1e1c18;
  font-size: 30rpx;
  font-weight: 700;
}

.panel-hint {
  color: #8f877b;
  font-size: 22rpx;
}

.status-list {
  margin-top: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.status-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22rpx 24rpx;
  border-radius: 22rpx;
}

.status-item-left {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.status-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
}

.status-name {
  font-size: 26rpx;
  font-weight: 600;
}

.status-count {
  font-size: 32rpx;
  line-height: 1;
  font-weight: 700;
}

.status-item-unknown {
  background: rgba(255, 255, 255, 0.72);
  color: #6c645a;
}

.status-item-unknown .status-dot {
  background: #b6aca0;
}

.status-item-fuzzy {
  background: rgba(239, 125, 66, 0.12);
  color: #c76530;
}

.status-item-fuzzy .status-dot {
  background: #ef7d42;
}

.status-item-mastered {
  background: rgba(18, 122, 114, 0.12);
  color: #127a72;
}

.status-item-mastered .status-dot {
  background: #127a72;
}

.action-row {
  margin-top: 24rpx;
  display: flex;
  gap: 16rpx;
}

.action-btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.action-btn-secondary {
  background: rgba(255, 255, 255, 0.72);
  color: #6c645a;
}

.action-btn-primary {
  background: #ef7d42;
  color: #fff7ed;
}
</style>
