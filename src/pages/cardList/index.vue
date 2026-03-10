<template>
  <view class="page">
    <view class="toolbar">
      <input class="search-input" placeholder="搜索问题或答案" placeholder-class="placeholder" />
      <view class="filter-btn">筛选</view>
    </view>

    <view class="filter-row">
      <view class="filter-chip active">全部</view>
      <view class="filter-chip">已掌握</view>
      <view class="filter-chip">模糊</view>
      <view class="filter-chip">未复习</view>
    </view>

    <view class="card-list">
      <view class="card-item" @click="goToDetail()">
        <view class="card-top">
          <view class="card-tag">React / Hooks</view>
          <view class="card-status status-fuzzy">模糊</view>
        </view>
        <view class="card-question">为什么 React 不推荐用 index 作为 key？</view>
        <view class="card-answer">因为列表重排时会导致节点错误复用，影响状态和渲染结果。</view>
      </view>

      <view class="card-item">
        <view class="card-top">
          <view class="card-tag">Vue / 响应式</view>
          <view class="card-status status-mastered">已掌握</view>
        </view>
        <view class="card-question">Vue 3 的响应式为什么改成了 Proxy？</view>
        <view class="card-answer">它可以拦截更多操作，避免 Vue 2 在数组和对象属性上的限制。</view>
      </view>

      <view class="card-item">
        <view class="card-top">
          <view class="card-tag">JavaScript / 基础</view>
          <view class="card-status status-new">未复习</view>
        </view>
        <view class="card-question">闭包的本质是什么？</view>
        <view class="card-answer">函数与其词法作用域形成绑定，使外层变量在函数外层执行结束后仍可访问。</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
// 进入卡片详情
const goToDetail = () => {
  uni.navigateTo({
    url: '/pages/cardDetail/index',
  });
};
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx 28rpx 48rpx;
  box-sizing: border-box;
  background: linear-gradient(180deg, #f8f2e8 0%, #efe5d5 100%);
}

.toolbar {
  display: flex;
  gap: 14rpx;
  padding: 12rpx;
  border-radius: 28rpx;
  background: rgba(255, 252, 247, 0.84);
  border: 1rpx solid rgba(61, 43, 24, 0.12);
}

.search-input {
  flex: 1;
  height: 84rpx;
  padding: 0 22rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.72);
  color: #1e1c18;
  font-size: 28rpx;
}

.placeholder {
  color: #9d9487;
}

.filter-btn {
  min-width: 132rpx;
  height: 84rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 22rpx;
  background: #ef7d42;
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
}

.filter-row {
  margin-top: 18rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.filter-chip {
  padding: 12rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.72);
  color: #6c645a;
  font-size: 24rpx;
}

.filter-chip.active {
  background: rgba(31, 94, 255, 0.1);
  color: #1f5eff;
}

.card-list {
  margin-top: 22rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.card-item {
  padding: 28rpx;
  border-radius: 28rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 252, 247, 0.84);
  box-shadow: 0 16rpx 40rpx rgba(80, 55, 25, 0.06);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.card-tag {
  color: #127a72;
  font-size: 22rpx;
}

.card-status {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
}

.status-fuzzy {
  background: rgba(239, 125, 66, 0.12);
  color: #c76530;
}

.status-mastered {
  background: rgba(18, 122, 114, 0.12);
  color: #127a72;
}

.status-new {
  background: rgba(31, 94, 255, 0.1);
  color: #1f5eff;
}

.card-question {
  margin-top: 18rpx;
  color: #1e1c18;
  font-size: 32rpx;
  line-height: 1.5;
  font-weight: 700;
}

.card-answer {
  margin-top: 12rpx;
  color: #6c645a;
  font-size: 26rpx;
  line-height: 1.7;
}
</style>
