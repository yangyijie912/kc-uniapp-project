<template>
  <view
    v-if="card"
    class="card-item dragging-card-proxy is-sorting is-sort-active"
    :style="proxyStyle"
  >
    <view class="drag-handle">
      <image class="drag-handle-icon" src="/static/actions/drag-handle.svg" mode="aspectFit" />
    </view>
    <view class="card-top">
      <view class="card-title">
        <view class="card-category">{{ card.categoryName }}</view>
      </view>
      <view class="card-status" :class="`status-${card.status}`">
        {{ card.statusName ?? '新' }}
      </view>
    </view>
    <view class="card-question">{{ card.question }}</view>
    <text class="card-answer">{{ card.answer }}</text>
    <view v-if="Array.isArray(card.tags) && card.tags.length > 0" class="card-tag card-tag-bottom">
      {{ card.tags.join(' • ') }}
    </view>
    <view v-else class="card-empty-tag card-tag-bottom">暂无标签</view>
  </view>
</template>

<script setup lang="ts">
import type { CardView } from '@/types/card';

type Props = {
  card: CardView | null;
  proxyStyle: Record<string, string> | null;
};

defineProps<Props>();
</script>

<style scoped>
.card-item {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  position: relative;
  min-height: 228rpx;
  height: auto;
  padding: 22rpx;
  display: grid;
  grid-template-rows: auto auto auto auto;
  align-content: space-around;
  row-gap: 6rpx;
  border-radius: 22rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.09);
  background:
    radial-gradient(circle at 8% 8%, rgba(18, 122, 114, 0.06), transparent 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.99) 0%, rgba(250, 246, 240, 0.95) 100%);
  box-shadow:
    0 10rpx 24rpx rgba(80, 55, 25, 0.08),
    inset 0 1rpx 0 rgba(255, 255, 255, 0.85);
  overflow: hidden;
  will-change: transform;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.dragging-card-proxy {
  position: fixed;
  top: 0;
  left: 0;
  box-sizing: border-box;
  /* 对齐排序卡片的内容缩进，避免浮起卡片看起来贴到左边。 */
  padding-left: 84rpx;
  pointer-events: none;
  z-index: 999;
  transform: none;
}

.dragging-card-proxy.is-sort-active {
  border-color: rgba(31, 94, 255, 0.62);
  background:
    radial-gradient(circle at 10% 10%, rgba(31, 94, 255, 0.12), transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.99) 0%, rgba(244, 248, 255, 0.96) 100%);
  box-shadow:
    0 18rpx 38rpx rgba(31, 94, 255, 0.2),
    inset 0 0 0 2rpx rgba(31, 94, 255, 0.2);
  transition:
    border-color 0.12s ease,
    background-color 0.12s ease,
    box-shadow 0.12s ease;
}

.drag-handle {
  position: absolute;
  left: 24rpx;
  top: 50%;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(238, 244, 255, 0.98);
  box-shadow:
    0 8rpx 18rpx rgba(31, 94, 255, 0.12),
    inset 0 0 0 1rpx rgba(31, 94, 255, 0.2);
  transform: translateY(-50%);
  z-index: 1;
  touch-action: none;
}

.drag-handle-icon {
  width: 20rpx;
  height: 20rpx;
}

.card-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.card-title {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.card-category {
  color: #127a72;
  font-size: 23rpx;
  font-weight: 600;
}

.card-tag {
  color: #1677ff;
  font-size: 22rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-empty-tag {
  color: #9d9487;
  font-size: 22rpx;
}

.card-tag-bottom {
  font-size: 20rpx;
  line-height: 1.4;
  opacity: 0.9;
}

.card-status {
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  font-size: 19rpx;
  font-weight: 700;
  line-height: 1.2;
  flex-shrink: 0;
}

.status-fuzzy {
  background: rgba(239, 125, 66, 0.12);
  color: #c76530;
}

.status-mastered {
  background: rgba(18, 122, 114, 0.12);
  color: #127a72;
}

.status-unknown {
  background: rgba(255, 255, 255, 0.72);
  color: #6c645a;
}

.status-undefined {
  background: rgba(31, 94, 255, 0.1);
  color: #1f5eff;
}

.card-question {
  margin-top: 0;
  color: #1e1c18;
  font-size: 32rpx;
  line-height: 1.42;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-answer {
  margin-top: 0;
  width: 100%;
  min-width: 0;
  color: #6c645a;
  font-size: 24rpx;
  line-height: 1.8;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  word-break: break-word;

  opacity: 0.94;
}
</style>
