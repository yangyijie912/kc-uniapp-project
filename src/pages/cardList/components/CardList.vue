<template>
  <view class="card-list-zone">
    <view class="card-list" :class="{ 'is-editing': isSelectMode, 'is-sorting': isSortMode }">
      <view
        v-for="value in cards"
        :key="value.id"
        class="card-item"
        :class="{
          'is-editing': isSelectMode,
          'is-selected': selectedIds.includes(value.id),
          'is-sort-active': sortActiveId === value.id,
          'is-sorting': isSortMode,
        }"
        @touchstart.passive="emit('card-touch-start', value.id, $event)"
        @touchend="emit('card-touch-end')"
        @touchcancel="emit('card-touch-end')"
        @touchmove.passive="emit('card-touch-move', $event)"
        @contextmenu.prevent
        @click="emit('card-click', value.id)"
      >
        <view
          v-if="isSortMode"
          class="drag-handle"
          @touchstart.stop.prevent="emit('sort-touch-start', value.id)"
          @touchmove.stop.prevent="emit('sort-touch-move', $event)"
          @touchend.stop.prevent="emit('sort-touch-end')"
          @touchcancel.stop.prevent="emit('sort-touch-end')"
          @click.stop="emit('sort-touch-click')"
        >
          <image class="drag-handle-icon" src="/static/actions/drag-handle.svg" mode="aspectFit" />
        </view>
        <view
          v-if="isSelectMode"
          class="card-check"
          :class="{ selected: selectedIds.includes(value.id) }"
        >
          <view class="card-check-dot"></view>
        </view>
        <view class="card-top">
          <view class="card-title">
            <view class="card-category">{{ value.categoryName }}</view>
          </view>
          <view class="card-status" :class="`status-${value.status}`">{{
            value.statusName ?? '新'
          }}</view>
        </view>
        <view class="card-question">{{ value.question }}</view>
        <text class="card-answer">{{ value.answer }}</text>
        <view
          v-if="Array.isArray(value.tags) && value.tags.length > 0"
          class="card-tag card-tag-bottom"
        >
          {{ value.tags.join(' • ') }}
        </view>
        <view v-else class="card-empty-tag card-tag-bottom">暂无标签</view>
      </view>

      <view v-if="cards.length === 0" class="result-banner">
        <view class="result-title">没有找到相关卡片</view>
        <view class="result-keyword">试试调整搜索关键词或筛选条件？</view>
      </view>
    </view>

    <view class="list-footer">
      <view v-if="loading" class="list-footer-text is-loading">正在加载更多...</view>
      <view v-else-if="!hasMore" class="list-footer-text">没有更多了</view>
    </view>

    <view v-if="isSelectMode || isSortMode" class="bottom-placeholder"> </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CardView } from '@/types/card';
import type { InteractionMode } from '@/types/card';

type CardTouchEvent = Pick<TouchEvent, 'touches' | 'changedTouches'>;

type Props = {
  cards: CardView[];
  hasMore: boolean;
  loading: boolean;
  mode: InteractionMode;
  selectedIds: string[];
  sortActiveId: string;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  (event: 'card-click', id: string): void;
  (event: 'card-touch-start', id: string, touchEvent: CardTouchEvent): void;
  (event: 'card-touch-end'): void;
  (event: 'card-touch-move', touchEvent: CardTouchEvent): void;
  (event: 'sort-touch-start', id: string): void;
  (event: 'sort-touch-move', touchEvent: TouchEvent): void;
  (event: 'sort-touch-end'): void;
  (event: 'sort-touch-click'): void;
}>();

const isSelectMode = computed(() => props.mode === 'select');
const isSortMode = computed(() => props.mode === 'sort');
</script>

<style scoped>
.card-list-zone {
  margin-top: 22rpx;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

/* 解决h5页面长按出现默认菜单的问题 */
.card-list {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

.result-banner {
  padding: 26rpx 28rpx;
  border-radius: 28rpx;
  background: rgba(255, 252, 247, 0.84);
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  box-shadow: 0 16rpx 40rpx rgba(80, 55, 25, 0.06);
}

.result-title {
  color: #1e1c18;
  font-size: 30rpx;
  font-weight: 700;
}

.result-keyword {
  margin-top: 8rpx;
  color: #6c645a;
  font-size: 24rpx;
}

.list-footer {
  padding: 20rpx 0 8rpx;
  display: flex;
  justify-content: center;
}

.bottom-placeholder {
  height: calc(200rpx + env(safe-area-inset-bottom));
}

.list-footer-text {
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(255, 252, 247, 0.88);
  border: 1rpx solid rgba(61, 43, 24, 0.1);
  color: #6c645a;
  font-size: 24rpx;
  box-shadow: 0 10rpx 24rpx rgba(80, 55, 25, 0.05);
}

.list-footer-text.is-loading {
  color: #1f5eff;
  background: rgba(31, 94, 255, 0.08);
}

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
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.card-item.is-editing {
  padding-left: 84rpx;
}

.card-item.is-sorting {
  padding-left: 84rpx;
  overflow: visible;
}

.card-item.is-sort-active {
  transform: translateY(-4rpx);
  border-color: rgba(31, 94, 255, 0.62);
  background:
    radial-gradient(circle at 10% 10%, rgba(31, 94, 255, 0.12), transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.99) 0%, rgba(244, 248, 255, 0.96) 100%);
  box-shadow:
    0 18rpx 38rpx rgba(31, 94, 255, 0.2),
    inset 0 0 0 2rpx rgba(31, 94, 255, 0.2);
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
}

.drag-handle-icon {
  width: 20rpx;
  height: 20rpx;
}

.card-item.is-selected {
  border-color: rgba(31, 94, 255, 0.3);
  background:
    radial-gradient(circle at 10% 8%, rgba(31, 94, 255, 0.1), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.99) 0%, rgba(240, 246, 255, 0.94) 100%);
  box-shadow: 0 12rpx 30rpx rgba(31, 94, 255, 0.14);
}

.card-check {
  position: absolute;
  left: 24rpx;
  top: 50%;
  width: 36rpx;
  height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 2rpx solid rgba(31, 94, 255, 0.28);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8rpx 20rpx rgba(31, 94, 255, 0.08);
  box-sizing: border-box;
  transform: translateY(-50%);
}

.card-check-dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: transparent;
  transform: scale(0.55);
  opacity: 0;
}

.card-check.selected {
  border-color: rgba(31, 94, 255, 0.8);
  background: rgba(31, 94, 255, 0.14);
}

.card-check.selected .card-check-dot {
  opacity: 1;
  background: #1f5eff;
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
