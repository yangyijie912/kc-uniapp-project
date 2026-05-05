<template>
  <view class="card-list-zone">
    <transition-group
      v-if="!isAppPlatform && cards.length > 0"
      class="card-list"
      :class="{ 'is-editing': isSelectMode, 'is-sorting': isSortMode }"
      tag="view"
      move-class="card-item-move"
    >
      <template v-for="item in renderItems" :key="item.id">
        <view v-if="item.type === 'placeholder'" class="card-item card-item-sort-placeholder">
          <view class="card-item-sort-placeholder-core"></view>
        </view>

        <view
          v-else
          :id="`sort-card-${item.card.id}`"
          :data-card-id="item.card.id"
          class="card-item"
          :class="{
            'card-item-sort-source': !isAppDetachedDragSource(item.card.id),
            'is-editing': isSelectMode,
            'is-selected': selectedIds.includes(item.card.id),
            'is-sort-active': sortActiveId === item.card.id,
            'is-sorting': isSortMode,
            'is-dragging-ghost':
              !isAppPlatform && isDragProxyReady && sortActiveId === item.card.id,
            'is-app-detached-drag-source': isAppDetachedDragSource(item.card.id),
          }"
          @touchstart.passive="emit('card-touch-start', item.card.id, $event)"
          @touchend="emit('card-touch-end')"
          @touchcancel="emit('card-touch-end')"
          @touchmove.passive="emit('card-touch-move', $event)"
          @contextmenu.prevent
          @click="emit('card-click', item.card.id)"
        >
          <view
            v-if="isSortMode"
            class="drag-handle"
            @touchstart.stop.prevent="emit('sort-touch-start', item.card.id, $event)"
            @touchmove.stop.prevent="emit('sort-touch-move', $event)"
            @touchend.stop.prevent="emit('sort-touch-end')"
            @touchcancel.stop="emit('sort-touch-end')"
            @click.stop="emit('sort-touch-click')"
          >
            <image
              class="drag-handle-icon"
              src="/static/actions/drag-handle.svg"
              mode="aspectFit"
            />
          </view>
          <view
            v-if="isSelectMode"
            class="card-check"
            :class="{ selected: selectedIds.includes(item.card.id) }"
          >
            <view class="card-check-dot"></view>
          </view>
          <view class="card-top">
            <view class="card-title">
              <view class="card-category">{{ item.card.categoryName }}</view>
            </view>
            <view class="card-status" :class="`status-${item.card.status}`">{{
              item.card.statusName ?? '新'
            }}</view>
          </view>
          <view class="card-question">{{ item.card.question }}</view>
          <text class="card-answer">{{ item.card.answer }}</text>
          <view
            v-if="Array.isArray(item.card.tags) && item.card.tags.length > 0"
            class="card-tag card-tag-bottom"
          >
            {{ item.card.tags.join(' • ') }}
          </view>
          <view v-else class="card-empty-tag card-tag-bottom">暂无标签</view>
        </view>
      </template>
    </transition-group>

    <view
      v-else-if="cards.length > 0"
      class="card-list"
      :class="{ 'is-editing': isSelectMode, 'is-sorting': isSortMode }"
    >
      <template v-for="item in renderItems" :key="item.id">
        <view v-if="item.type === 'placeholder'" class="card-item card-item-sort-placeholder">
          <view class="card-item-sort-placeholder-core"></view>
        </view>

        <view
          v-else
          :id="`sort-card-${item.card.id}`"
          :data-card-id="item.card.id"
          class="card-item"
          :class="{
            'card-item-sort-source': !isAppDetachedDragSource(item.card.id),
            'is-editing': isSelectMode,
            'is-selected': selectedIds.includes(item.card.id),
            'is-sort-active': sortActiveId === item.card.id,
            'is-sorting': isSortMode,
            'is-dragging-ghost':
              !isAppPlatform && isDragProxyReady && sortActiveId === item.card.id,
            'is-app-detached-drag-source': isAppDetachedDragSource(item.card.id),
          }"
          @touchstart.passive="emit('card-touch-start', item.card.id, $event)"
          @touchend="emit('card-touch-end')"
          @touchcancel="emit('card-touch-end')"
          @touchmove.passive="emit('card-touch-move', $event)"
          @contextmenu.prevent
          @click="emit('card-click', item.card.id)"
        >
          <view
            v-if="isSortMode"
            class="drag-handle"
            @touchstart.stop.prevent="emit('sort-touch-start', item.card.id, $event)"
            @touchmove.stop.prevent="emit('sort-touch-move', $event)"
            @touchend.stop.prevent="emit('sort-touch-end')"
            @touchcancel.stop="emit('sort-touch-end')"
            @click.stop="emit('sort-touch-click')"
          >
            <image
              class="drag-handle-icon"
              src="/static/actions/drag-handle.svg"
              mode="aspectFit"
            />
          </view>
          <view
            v-if="isSelectMode"
            class="card-check"
            :class="{ selected: selectedIds.includes(item.card.id) }"
          >
            <view class="card-check-dot"></view>
          </view>
          <view class="card-top">
            <view class="card-title">
              <view class="card-category">{{ item.card.categoryName }}</view>
            </view>
            <view class="card-status" :class="`status-${item.card.status}`">{{
              item.card.statusName ?? '新'
            }}</view>
          </view>
          <view class="card-question">{{ item.card.question }}</view>
          <text class="card-answer">{{ item.card.answer }}</text>
          <view
            v-if="Array.isArray(item.card.tags) && item.card.tags.length > 0"
            class="card-tag card-tag-bottom"
          >
            {{ item.card.tags.join(' • ') }}
          </view>
          <view v-else class="card-empty-tag card-tag-bottom">暂无标签</view>
        </view>
      </template>
    </view>

    <view v-if="cards.length === 0" class="result-banner">
      <view class="result-title">没有找到相关卡片</view>
      <view class="result-keyword">试试调整搜索关键词或筛选条件？</view>
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

type RenderCardItem = {
  type: 'card';
  id: string;
  card: CardView;
};

type RenderPlaceholderItem = {
  type: 'placeholder';
  id: string;
};

type RenderItem = RenderCardItem | RenderPlaceholderItem;

type Props = {
  cards: CardView[];
  hasMore: boolean;
  loading: boolean;
  mode: InteractionMode;
  selectedIds: string[];
  sortActiveId: string;
  sortDragProxyStyle: Record<string, string> | null;
  sortInsertIndex: number;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  (event: 'card-click', id: string): void;
  (event: 'card-touch-start', id: string, touchEvent: CardTouchEvent): void;
  (event: 'card-touch-end'): void;
  (event: 'card-touch-move', touchEvent: CardTouchEvent): void;
  (event: 'sort-touch-start', id: string, touchEvent: TouchEvent): void;
  (event: 'sort-touch-move', touchEvent: TouchEvent): void;
  (event: 'sort-touch-end'): void;
  (event: 'sort-touch-click'): void;
}>();

const isSelectMode = computed(() => props.mode === 'select');
const isSortMode = computed(() => props.mode === 'sort');
const systemInfo = uni.getSystemInfoSync() as UniApp.GetSystemInfoResult & {
  uniPlatform?: string;
};
const isAppPlatform =
  systemInfo.uniPlatform === 'app' ||
  systemInfo.platform === 'android' ||
  systemInfo.platform === 'ios';
// APP 的 touchmove 会绑定在最初按住的节点上；拖拽期间保留这个节点，只把它透明并移出文档流。
// H5 没有这个限制，可以继续隐藏源卡片，让 transition-group 的移动动画更干净。
const isDragProxyReady = computed(
  () => Boolean(props.sortDragProxyStyle) && Boolean(props.sortActiveId),
);

const isAppDetachedDragSource = (id: string) => {
  return isAppPlatform && isDragProxyReady.value && props.sortActiveId === id;
};

const visibleCards = computed(() => {
  if (!isSortMode.value || !props.sortActiveId || !isDragProxyReady.value) {
    return props.cards;
  }

  if (isAppPlatform) {
    return props.cards;
  }

  return props.cards.filter((card) => card.id !== props.sortActiveId);
});

const renderItems = computed<RenderItem[]>(() => {
  const baseItems = visibleCards.value.map((card) => ({
    type: 'card' as const,
    id: card.id,
    card,
  })) as RenderItem[];

  if (!isSortMode.value || props.sortInsertIndex < 0) {
    return baseItems;
  }

  const sourceIndex = baseItems.findIndex((item) => {
    return item.type === 'card' && item.card.id === props.sortActiveId;
  });
  // sortInsertIndex 是按“排除拖拽源卡片后的列表”计算的。
  // APP 为了保住 touchmove 会把源卡片留在 DOM 里，所以只有源卡片严格排在插入点前面时，
  // 需要把真正的 DOM 插入下标往后挪一位，避免占位卡越滚越偏。
  const adjustedInsertIndex =
    isAppPlatform && sourceIndex >= 0 && sourceIndex < props.sortInsertIndex
      ? props.sortInsertIndex + 1
      : props.sortInsertIndex;
  const insertIndex = Math.min(Math.max(adjustedInsertIndex, 0), baseItems.length);
  baseItems.splice(insertIndex, 0, {
    type: 'placeholder' as const,
    id: 'sort-placeholder',
  });

  return baseItems;
});
</script>

<style scoped>
.card-list-zone {
  margin-top: 22rpx;
}

.card-list {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.card-item-move {
  will-change: transform;
  transition:
    transform 0.26s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.26s ease,
    border-color 0.26s ease;
}

.card-item.card-item-sort-placeholder {
  min-height: 228rpx;
  padding: 22rpx;
  box-sizing: border-box;
  border-radius: 22rpx;
  border: 2rpx dashed #1f5eff !important;
  background: transparent !important;
  box-shadow: none !important;
  overflow: visible;
}

.card-item.card-item-sort-placeholder .card-item-sort-placeholder-core {
  min-height: 184rpx;
  background: transparent;
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
  height: calc(240rpx + env(safe-area-inset-bottom));
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
  will-change: transform;
  transition:
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
  transform: translate3d(0, -10rpx, 0) scale(1.015);
  border-color: rgba(31, 94, 255, 0.62);
  background:
    radial-gradient(circle at 10% 10%, rgba(31, 94, 255, 0.12), transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.99) 0%, rgba(244, 248, 255, 0.96) 100%);
  box-shadow:
    0 18rpx 38rpx rgba(31, 94, 255, 0.2),
    inset 0 0 0 2rpx rgba(31, 94, 255, 0.2);
  z-index: 10;
  transition:
    border-color 0.12s ease,
    background-color 0.12s ease,
    box-shadow 0.12s ease;
}

.card-item.is-dragging-ghost {
  display: none;
}

.card-item.is-app-detached-drag-source {
  position: absolute;
  display: grid;
  left: 0;
  right: 0;
  width: 100%;
  opacity: 0;
  pointer-events: none;
  transform: none;
  z-index: -1;
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
