<template>
  <view class="page">
    <scroll-view
      class="page-scroll"
      :class="{ 'is-sorting': isSortMode }"
      :scroll-top="scrollTop"
      scroll-y
      @scroll="handlePageScroll"
      @scrolltolower="handleScrollToLower"
      @contextmenu.prevent
    >
      <view v-if="!isSearchResultMode" class="toolbar">
        <input
          v-model="inputKeyword"
          class="search-input"
          placeholder="搜索问题或答案"
          placeholder-class="placeholder"
        />
        <view class="filter-btn" @click="searchCard">筛选</view>
      </view>

      <view v-if="isSearchResultMode" class="result-banner">
        <view class="result-title">搜索结果</view>
        <view class="result-keyword">关键词：{{ queryParams.keyword }}</view>
      </view>

      <view v-if="!isSearchResultMode" class="filter-row">
        <view class="filter-status">
          <view
            v-for="value in statusTabs"
            :key="value.value"
            class="filter-chip"
            :class="{ active: queryParams.status === value.value }"
            @click="toggleStatusFilter(value.value)"
            >{{ value.label }}</view
          >
        </view>

        <picker
          class="sort-picker-wrap"
          :range="sortOptionLabels"
          :value="selectedSortIndex"
          @change="handleSortChange"
        >
          <view class="sort-picker">排序：{{ selectedSortLabel }}</view>
        </picker>

        <view class="page-actions">
          <view class="page-actions-head">
            <view class="page-actions-title">{{ currentModeTitle }}</view>
            <view class="sort-state-tag" :class="{ active: isSortMode || isEditMode }">
              {{ currentModeTag }}
            </view>
          </view>
          <view class="page-actions-desc">{{ currentModeDesc }}</view>

          <view class="page-actions-body">
            <view
              class="action-pill action-pill-sort"
              :class="{
                active: isSortMode,
                disabled: isSortModeDisabled,
              }"
              @click="toggleSortMode"
            >
              <image
                class="action-pill-icon"
                src="/static/actions/drag-sort.svg"
                mode="aspectFit"
              />
              <view class="action-pill-label">{{ sortModeActionLabel }}</view>
            </view>
            <view v-if="showQuizAction" class="action-pill action-pill-quiz" @click="openQuizSetup">
              <image
                class="action-tool-icon-image"
                src="/static/actions/quiz.svg"
                mode="aspectFit"
              />
              <view class="action-pill-label">测验</view>
            </view>
            <view class="action-pill action-pill-add" @click="goToAddCard">
              <image
                class="action-tool-icon-image"
                src="/static/actions/add.svg"
                mode="aspectFit"
              />
              <view class="action-pill-label">新增</view>
            </view>
          </view>
        </view>
      </view>

      <view class="card-list" :class="{ 'is-editing': isEditMode, 'is-sorting': isSortMode }">
        <view
          v-for="value in cardViewList"
          :key="value.id"
          class="card-item"
          :class="{
            'is-editing': isEditMode,
            'is-selected': selectedCards.includes(value.id),
            'is-sort-active': isSortActive(value.id),
          }"
          @touchstart.passive="handleCardTouchStart(value.id, $event)"
          @touchend="handleCardTouchEnd"
          @touchcancel="handleCardTouchEnd"
          @touchmove.passive="handleCardTouchMove($event)"
          @contextmenu.prevent
          @click="onCardClick(value.id)"
        >
          <view
            v-if="isSortMode"
            class="drag-handle"
            @touchstart.stop.prevent="handleSortHandleTouchStart(value.id)"
            @touchmove.stop.prevent="handleSortHandleTouchMove($event)"
            @touchend.stop.prevent="handleSortHandleTouchEnd"
            @touchcancel.stop.prevent="handleSortHandleTouchEnd"
            @click.stop="handleSortHandleClick"
          >
            <image
              class="drag-handle-icon"
              src="/static/actions/drag-handle.svg"
              mode="aspectFit"
            />
          </view>
          <view
            v-if="isEditMode"
            class="card-check"
            :class="{ selected: selectedCards.includes(value.id) }"
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

        <view v-if="cardViewList.length === 0" class="result-banner">
          <view class="result-title">没有找到相关卡片</view>
          <view class="result-keyword">试试调整搜索关键词或筛选条件？</view>
        </view>
      </view>

      <view class="list-footer">
        <view v-if="loading" class="list-footer-text is-loading">正在加载更多...</view>
        <view v-else-if="!hasMore" class="list-footer-text">没有更多了</view>
      </view>

      <view v-if="isEditMode || isSortMode" class="bottom-placeholder"> </view>
    </scroll-view>

    <view v-if="isSortMode" class="sort-bar">
      <view class="sort-summary">
        <view class="sort-title">拖拽中</view>
        <view class="sort-desc">已按自定义顺序排序，完成后可直接退出拖拽</view>
      </view>
      <view class="sort-actions">
        <view class="sort-btn sort-btn-secondary" @click="toggleSortMode">退出拖拽</view>
      </view>
    </view>

    <view v-if="isEditMode" class="batch-bar">
      <view class="batch-summary">
        <view class="batch-title">已选 {{ selectedCards.length }} 张</view>
        <view class="batch-desc">长按继续选择，完成后可批量转移分类或删除</view>
      </view>
      <view class="batch-actions">
        <view class="batch-btn batch-btn-secondary" @click="exitEditMode">取消</view>
        <view class="batch-btn batch-btn-ghost" @click="selectCategory">转移分类</view>
        <view class="batch-btn batch-btn-danger" @click="batchDelete">删除</view>
      </view>
    </view>

    <BaseDialog
      :open="categoryDialogVisible"
      title="选择分类"
      :showDefaultFooter="false"
      @close="closeCategoryDialog"
    >
      <view class="category-dialog">
        <view class="category-dialog-tip">请选择要转移到的分类，确认后会批量更新已选卡片。</view>
        <picker
          :range="categoryOptions"
          range-key="name"
          :value="selectedTransferCategoryIndex"
          @change="onTransferCategoryChange"
        >
          <view class="transfer-picker" :class="{ placeholder: !selectedTransferCategoryName }">
            {{ selectedTransferCategoryName || '请选择分类' }}
          </view>
        </picker>
        <view class="transfer-picker-hint">
          当前选择：{{ selectedTransferCategoryName || '未选择' }}
        </view>
      </view>

      <template #footer>
        <view class="dialog-footer-default">
          <view class="btn btn-cancel" @click="closeCategoryDialog">取消</view>
          <view class="btn btn-confirm" @click="confirmTransferCategory">转移分类</view>
        </view>
      </template>
    </BaseDialog>

    <QuizSetupSheet
      :open="showQuizSetup"
      :categoryId="queryParams.categoryId"
      @close="closeQuizSetup"
      @start="startQuizWithCurrentUI"
    />
  </view>
</template>

<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app';
import { computed, reactive, ref } from 'vue';
import { jsonToUrlParam } from '@/utils/jsonToUrl';
import { batchDeleteCards, batchUpdateCards } from '@/services/cardService';
import useCardListView from '@/composables/useCardListView';
import useCardSortDrag, { type InteractionMode } from '@/composables/useCardSortDrag';
import BaseDialog from '@/components/BaseDialog.vue';
import QuizSetupSheet from '@/components/QuizSetupSheet.vue';
import { CARD_SORT_OPTIONS } from '@/constants/sortConfig';
import type { CardSortConfig, CardStatus } from '@/types/card';
import type { quizQuery } from '@/types/quiz';

const {
  cardList,
  cardViewList,
  categoryList,
  loading,
  hasMore,
  loadCards,
  reloadCards,
  loadAllData,
} = useCardListView();

const pageSize = 10;
const currentPage = ref(1);
const longPressDuration = 500;
const longPressMoveThreshold = 12;

type CardTouchEvent = Pick<TouchEvent, 'touches' | 'changedTouches'>;

type QueryParams = {
  categoryId?: string;
  keyword?: string;
  status?: CardStatus;
};

type PageOptions = {
  categoryId?: string;
  keyword?: string;
  status?: string;
};

const inputKeyword = ref('');
const showQuizSetup = ref(false);
const selectedSortIndex = ref(0);
const scrollTop = ref(0);
const interactionMode = ref<InteractionMode>('browse');
const isEditMode = computed(() => interactionMode.value === 'select');

const longPressTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const touchedCardId = ref('');
const longPressTriggered = ref(false);
const touchStartPoint = ref<{ x: number; y: number } | null>(null);
const touchMoveCanceled = ref(false);

const statusTabs = [
  { label: '全部', value: undefined },
  { label: '掌握', value: 'mastered' },
  { label: '模糊', value: 'fuzzy' },
  { label: '未知', value: 'unknown' },
] as const;

const queryParams = reactive<PageOptions>({});
const isSearchResultMode = ref(false);
const enteredFromHomeSearch = ref(false);
const selectedCards = ref<string[]>([]);
const categoryDialogVisible = ref(false);
const selectedTransferCategoryId = ref('');

const categoryOptions = computed(() =>
  categoryList.value.map((category) => ({
    id: category.id,
    name: category.name,
  })),
);

const selectedTransferCategoryIndex = computed(() => {
  const index = categoryOptions.value.findIndex(
    (category) => category.id === selectedTransferCategoryId.value,
  );

  return index === -1 ? 0 : index;
});

const selectedTransferCategoryName = computed(() => {
  return (
    categoryOptions.value.find((category) => category.id === selectedTransferCategoryId.value)
      ?.name || ''
  );
});

const sortOptionLabels = CARD_SORT_OPTIONS.map((option) => option.label);
const selectedSortConfig = computed<CardSortConfig>(() => {
  return CARD_SORT_OPTIONS[selectedSortIndex.value]?.value ?? CARD_SORT_OPTIONS[0].value;
});
const selectedSortLabel = computed(() => {
  return sortOptionLabels[selectedSortIndex.value] ?? sortOptionLabels[0];
});

// 只有分类页里的正常列表才显示“测验”入口；搜索结果页不在这里直接开始测验。
const showQuizAction = computed(() => {
  return Boolean(queryParams.categoryId) && !isSearchResultMode.value;
});
const currentCategoryId = computed(() => queryParams.categoryId);

// 页面只保留一个交互模式源，避免多选、排序两个布尔值互相打架。
const setInteractionMode = (mode: InteractionMode) => {
  interactionMode.value = mode;

  if (mode !== 'select') {
    selectedCards.value = [];
    closeCategoryDialog();
  }
};

const clearLongPressState = () => {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value);
    longPressTimer.value = null;
  }
};

// 长按、多选、拖拽手柄都会用到这组触摸状态；切模式时统一清掉，避免残留。
const clearTouchState = () => {
  clearLongPressState();
  touchedCardId.value = '';
  longPressTriggered.value = false;
  touchMoveCanceled.value = false;
  touchStartPoint.value = null;
};

const parseStatus = (status?: string): CardStatus | undefined => {
  if (status === 'mastered' || status === 'fuzzy' || status === 'unknown') {
    return status;
  }

  return undefined;
};

const parseParams = (options?: PageOptions): QueryParams => {
  return {
    categoryId: options?.categoryId || undefined,
    keyword: options?.keyword || undefined,
    status: parseStatus(options?.status),
  };
};

// 列表页所有重新加载都走这一层，保证筛选、搜索、排序参数始终从同一个地方组装。
const buildQuery = (page: number) => ({
  categoryId: queryParams.categoryId,
  keyword: queryParams.keyword,
  status: parseStatus(queryParams.status),
  cardSortConfig: selectedSortConfig.value,
  page,
  pageSize,
});

const loadCurrentPages = () => {
  reloadCards(buildQuery(1), currentPage.value);
};

const {
  currentModeDesc,
  currentModeTag,
  currentModeTitle,
  isSortModeDisabled,
  isSortMode,
  isSortActive,
  sortModeActionLabel,
  handleSortHandleTouchStart,
  handleSortHandleTouchMove,
  handleSortHandleTouchEnd,
  handleSortHandleClick,
  toggleSortMode,
} = useCardSortDrag({
  cardList,
  interactionMode,
  isEditMode,
  setInteractionMode,
  categoryId: currentCategoryId,
  isSearchResultMode,
  selectedSortIndex,
  sortOptions: CARD_SORT_OPTIONS,
  scrollTop,
  loadCurrentPages,
  clearTouchState,
});

const resetInteractionModes = () => {
  setInteractionMode('browse');
  clearTouchState();
};

// 兼容 touchstart / touchmove / touchend，从不同事件里拿到统一的触摸点。
const getTouchPoint = (event: CardTouchEvent) => {
  return event.touches?.[0] || event.changedTouches?.[0] || null;
};

// 卡片点击要让位给两种场景：
// 1. 长按刚刚触发完，不要再顺手跳详情。
// 2. 手指已经移动过，说明用户不是点按，也不要误进详情。
const onCardClick = (id: string) => {
  if (isSortMode.value) {
    return;
  }

  if (longPressTriggered.value && touchedCardId.value === id) {
    longPressTriggered.value = false;
    touchedCardId.value = '';
    touchStartPoint.value = null;
    touchMoveCanceled.value = false;
    return;
  }

  if (touchMoveCanceled.value && touchedCardId.value === id) {
    touchedCardId.value = '';
    touchMoveCanceled.value = false;
    touchStartPoint.value = null;
    return;
  }

  if (isEditMode.value) {
    if (selectedCards.value.includes(id)) {
      selectedCards.value = selectedCards.value.filter((cardId) => cardId !== id);
    } else {
      selectedCards.value.push(id);
    }
    return;
  }

  uni.navigateTo({
    url: `/pages/cardDetail/index?id=${id}`,
  });
};

// 搜索结果页和排序模式都禁用长按多选；
// 正常分类列表里才允许靠长按进入多选。
const handleCardTouchStart = (id: string, event: CardTouchEvent) => {
  if (isSearchResultMode.value || isSortMode.value || isEditMode.value) return;

  clearLongPressState();
  touchedCardId.value = id;
  longPressTriggered.value = false;
  touchMoveCanceled.value = false;

  const point = getTouchPoint(event);
  touchStartPoint.value = point ? { x: point.clientX, y: point.clientY } : null;
  longPressTimer.value = setTimeout(() => {
    longPressTriggered.value = true;
    onEdit(id);
  }, longPressDuration);
};

const handleCardTouchEnd = () => {
  clearLongPressState();
};

// 一旦移动距离超过阈值，就取消这次长按，避免滚动列表时误切进多选模式。
const handleCardTouchMove = (event: CardTouchEvent) => {
  if (isSortMode.value || isEditMode.value || !touchStartPoint.value) {
    return;
  }

  const point = getTouchPoint(event);
  if (!point) {
    return;
  }

  const deltaX = Math.abs(point.clientX - touchStartPoint.value.x);
  const deltaY = Math.abs(point.clientY - touchStartPoint.value.y);

  if (Math.max(deltaX, deltaY) < longPressMoveThreshold) {
    return;
  }

  touchMoveCanceled.value = true;
  clearLongPressState();
};

const openQuizSetup = () => {
  showQuizSetup.value = true;
};

const closeQuizSetup = () => {
  showQuizSetup.value = false;
};

const startQuizWithCurrentUI = (query: quizQuery) => {
  closeQuizSetup();
  goToQuizByCategory(query);
};

const goToQuizByCategory = (query: quizQuery) => {
  if (!queryParams.categoryId) {
    return;
  }

  uni.navigateTo({
    url: `/pages/quiz/index?${jsonToUrlParam({ ...query, categoryId: queryParams.categoryId })}`,
  });
};

const goToAddCard = () => {
  const query = queryParams.categoryId ? `?categoryId=${queryParams.categoryId}` : '';

  uni.navigateTo({
    url: `/pages/cardEdit/index${query}`,
  });
};

const refreshData = () => {
  if (currentPage.value < 1) {
    currentPage.value = 1;
  }

  loadCurrentPages();
};

const handleScrollToLower = () => {
  if (!loading.value && hasMore.value) {
    currentPage.value += 1;
    loadCards(buildQuery(currentPage.value), true);
  }
};

const handlePageScroll = (event: { detail: { scrollTop: number } }) => {
  scrollTop.value = event.detail.scrollTop;
};

// 这里的搜索本质是列表内筛选。
// 只有从首页带 keyword 进入时，才把它视为“搜索结果模式”。
const searchCard = () => {
  resetInteractionModes();
  const keyword = inputKeyword.value?.trim();
  queryParams.keyword = keyword;
  isSearchResultMode.value = enteredFromHomeSearch.value && Boolean(keyword);
  currentPage.value = 1;
  loadCurrentPages();
};

const toggleStatusFilter = (status?: CardStatus) => {
  resetInteractionModes();
  queryParams.status = status;
  currentPage.value = 1;
  loadCurrentPages();
};

const handleSortChange = (event: { detail: { value: string } }) => {
  resetInteractionModes();
  selectedSortIndex.value = Number(event.detail.value);
  currentPage.value = 1;
  loadCurrentPages();
};

// 多选入口仍然是长按卡片，但搜索结果页不开放这个模式，避免和“只读结果查看”混在一起。
const onEdit = (id: string) => {
  if (isSearchResultMode.value) return;

  setInteractionMode('select');
  if (!selectedCards.value.includes(id)) {
    selectedCards.value.push(id);
  }
};

const exitEditMode = () => {
  setInteractionMode('browse');
};

const onTransferCategoryChange = (event: { detail: { value: string } }) => {
  const index = Number(event.detail.value);
  const category = categoryOptions.value[index];

  if (category) {
    selectedTransferCategoryId.value = category.id;
  }
};

const openCategoryDialog = () => {
  if (selectedCards.value.length === 0) {
    uni.showToast({ title: '请先选择卡片', icon: 'none' });
    return;
  }

  if (!selectedTransferCategoryId.value) {
    selectedTransferCategoryId.value = categoryOptions.value[0]?.id || '';
  }

  categoryDialogVisible.value = true;
};

const closeCategoryDialog = () => {
  categoryDialogVisible.value = false;
};

// 这里单独保留一层，是为了让模板语义直接对应“转移分类”动作，而不是暴露对话框细节。
const selectCategory = () => {
  openCategoryDialog();
};

const confirmTransferCategory = () => {
  if (selectedCards.value.length === 0) {
    uni.showToast({ title: '请先选择卡片', icon: 'none' });
    return;
  }

  if (!selectedTransferCategoryId.value) {
    uni.showToast({ title: '请选择分类', icon: 'none' });
    return;
  }

  const res = batchUpdateCards(selectedCards.value, {
    categoryId: selectedTransferCategoryId.value,
  });

  if (res.success) {
    uni.showToast({ title: '转移成功', icon: 'success' });
    closeCategoryDialog();
    exitEditMode();
    refreshData();
    return;
  }

  uni.showToast({ title: res.message || '转移失败', icon: 'none' });
};

// 删除前强制二次确认，避免多选模式下误触造成不可恢复的数据丢失。
const batchDelete = () => {
  if (selectedCards.value.length === 0) {
    uni.showToast({ title: '请至少选择一张卡片', icon: 'none' });
    return;
  }

  uni.showModal({
    title: '确认删除',
    content: `确定要删除选中的 ${selectedCards.value.length} 张卡片吗？不可恢复`,
    confirmText: '删除',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        const { success, message } = batchDeleteCards(selectedCards.value);
        if (success) {
          uni.showToast({ title: message || '删除成功', icon: 'success' });
          exitEditMode();
          refreshData();
        } else {
          uni.showToast({ title: message || '删除失败，请重试', icon: 'none' });
        }
      }
    },
  });
};

// 首页带 keyword 进入时，页面一开始就是搜索结果模式；
// 其他入口进入则是普通列表筛选模式。
onLoad((options) => {
  const parsedParams = parseParams(options as PageOptions);
  Object.assign(queryParams, parsedParams);
  inputKeyword.value = parsedParams.keyword || '';
  enteredFromHomeSearch.value = Boolean(parsedParams.keyword);
  isSearchResultMode.value = enteredFromHomeSearch.value;
  currentPage.value = 1;
  loadCurrentPages();
});

onShow(() => {
  refreshData();
});
</script>

<style scoped>
.page {
  /* 解决h5出现双滚动条的问题 */
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  padding: 24rpx 28rpx 48rpx;
  box-sizing: border-box;
  background: linear-gradient(180deg, #f8f2e8 0%, #efe5d5 100%);
}

.page-scroll {
  height: 100%;
}

.page-scroll.is-sorting {
  overflow-x: visible;
}

/* 解决h5页面长按出现默认菜单的问题 */
.page-scroll,
.card-item {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
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

.page-actions {
  min-width: 100%;
  padding: 22rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  border-radius: 28rpx;
  background:
    radial-gradient(circle at 88% 16%, rgba(31, 94, 255, 0.12), transparent 42%),
    linear-gradient(138deg, rgba(255, 252, 247, 0.98) 0%, rgba(255, 246, 232, 0.94) 100%);
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  box-shadow:
    0 12rpx 30rpx rgba(80, 55, 25, 0.08),
    inset 0 1rpx 0 rgba(255, 255, 255, 0.8);
  box-sizing: border-box;
  flex-shrink: 0;
}

.page-actions-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14rpx;
}

.page-actions-title {
  color: #1e1c18;
  font-size: 30rpx;
  font-weight: 700;
}

.page-actions-desc {
  color: #72695e;
  font-size: 22rpx;
  line-height: 1.6;
}

.page-actions-body {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: nowrap;
}

.sort-state-tag {
  height: 46rpx;
  padding: 0 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: rgba(61, 43, 24, 0.08);
  color: #6c645a;
  font-size: 21rpx;
  font-weight: 600;
  white-space: nowrap;
}

.sort-state-tag.active {
  background: rgba(31, 94, 255, 0.14);
  color: #1f5eff;
}

.action-pill {
  height: 76rpx;
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  border-radius: 20rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.1);
  box-shadow:
    0 8rpx 20rpx rgba(80, 55, 25, 0.08),
    inset 0 1rpx 0 rgba(255, 255, 255, 0.74);
  box-sizing: border-box;
  padding: 0 12rpx;
  overflow: hidden;
}

.action-tool-icon-image {
  width: 38rpx;
  height: 38rpx;
}

.action-pill-icon {
  width: 32rpx;
  height: 32rpx;
}

.action-pill-label {
  color: #1e1c18;
  font-size: 24rpx;
  font-weight: 700;
  white-space: nowrap;
}

.action-pill-sort {
  background: linear-gradient(135deg, rgba(61, 43, 24, 0.12) 0%, rgba(61, 43, 24, 0.06) 100%);
}

.action-pill-sort.active {
  border-color: rgba(31, 94, 255, 0.24);
  background: linear-gradient(135deg, rgba(31, 94, 255, 0.2) 0%, rgba(31, 94, 255, 0.1) 100%);
}

.action-pill-sort.active .action-pill-label {
  color: #1f5eff;
}

.action-pill-sort.disabled {
  opacity: 0.56;
  border-color: rgba(61, 43, 24, 0.08);
  background: linear-gradient(135deg, rgba(61, 43, 24, 0.08) 0%, rgba(61, 43, 24, 0.04) 100%);
}

.action-pill-sort.disabled .action-pill-label {
  color: #8a7f73;
}

.action-pill-quiz {
  background: linear-gradient(135deg, rgba(31, 94, 255, 0.16) 0%, rgba(31, 94, 255, 0.08) 100%);
}

.action-pill-add {
  background: linear-gradient(135deg, rgba(18, 122, 114, 0.16) 0%, rgba(18, 122, 114, 0.08) 100%);
}

.filter-row {
  margin-top: 18rpx;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14rpx;
  justify-content: space-between;
}

.filter-status {
  display: flex;
  align-items: center;
  gap: 14rpx;
  flex-wrap: wrap;
}

.sort-picker-wrap {
  flex-shrink: 0;
}

.sort-picker {
  min-height: 64rpx;
  padding: 0 22rpx;
  display: flex;
  align-items: center;
  border-radius: 999rpx;
  background: rgba(255, 252, 247, 0.84);
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  color: #6c645a;
  font-size: 24rpx;
  box-sizing: border-box;
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

@media (max-width: 360px) {
  .page-actions-body {
    flex-wrap: wrap;
  }

  .action-pill {
    flex: unset;
    width: calc(50% - 5rpx);
  }

  .batch-bar {
    left: 20rpx;
    right: 20rpx;
  }
}

.list-footer {
  padding: 20rpx 0 8rpx;
  display: flex;
  justify-content: center;
}

.bottom-placeholder {
  height: calc(200rpx + env(safe-area-inset-bottom));
}

.sort-bar {
  position: fixed;
  left: 28rpx;
  right: 28rpx;
  bottom: calc(20rpx + env(safe-area-inset-bottom));
  z-index: 5;
  padding: 20rpx 20rpx 18rpx;
  border-radius: 30rpx;
  background: rgba(255, 252, 247, 0.96);
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  box-shadow: 0 18rpx 42rpx rgba(80, 55, 25, 0.12);
  backdrop-filter: blur(12px);
  box-sizing: border-box;
}

.sort-summary {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.sort-title {
  color: #1e1c18;
  font-size: 28rpx;
  font-weight: 700;
}

.sort-desc {
  color: #6c645a;
  font-size: 22rpx;
  line-height: 1.5;
}

.sort-actions {
  margin-top: 16rpx;
  display: flex;
}

.sort-btn {
  flex: 1;
  height: 76rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
}

.sort-btn-secondary {
  background: rgba(31, 94, 255, 0.1);
  color: #1f5eff;
  border: 1rpx solid rgba(31, 94, 255, 0.12);
}

.edit-list-footer {
  position: fixed;
  left: 28rpx;
  right: 28rpx;
  bottom: calc(170rpx + env(safe-area-inset-bottom));
  display: flex;
  justify-content: center;
  z-index: 4;
  pointer-events: none;
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

.card-list.is-sorting .card-item {
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

.batch-bar {
  position: fixed;
  left: 28rpx;
  right: 28rpx;
  bottom: calc(20rpx + env(safe-area-inset-bottom));
  z-index: 5;
  padding: 20rpx 20rpx 18rpx;
  border-radius: 30rpx;
  background: rgba(255, 252, 247, 0.96);
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  box-shadow: 0 18rpx 42rpx rgba(80, 55, 25, 0.12);
  backdrop-filter: blur(12px);
  box-sizing: border-box;
}

.batch-summary {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.batch-title {
  color: #1e1c18;
  font-size: 28rpx;
  font-weight: 700;
}

.batch-desc {
  color: #6c645a;
  font-size: 22rpx;
  line-height: 1.5;
}

.batch-actions {
  margin-top: 16rpx;
  display: flex;
  gap: 12rpx;
}

.batch-btn {
  flex: 1;
  height: 76rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
}

.batch-btn-secondary {
  background: rgba(255, 255, 255, 0.8);
  color: #6c645a;
  border: 1rpx solid rgba(61, 43, 24, 0.08);
}

.batch-btn-ghost {
  background: rgba(31, 94, 255, 0.1);
  color: #1f5eff;
}

.batch-btn-danger {
  background: rgba(239, 125, 66, 0.12);
  color: #c76530;
}

.category-dialog {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.category-dialog-tip {
  color: #6c645a;
  font-size: 24rpx;
  line-height: 1.6;
}

.transfer-picker {
  height: 84rpx;
  padding: 0 22rpx;
  display: flex;
  align-items: center;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.76);
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  color: #1e1c18;
  font-size: 28rpx;
  box-sizing: border-box;
}

.transfer-picker.placeholder {
  color: #9d9487;
}

.transfer-picker-hint {
  color: #6c645a;
  font-size: 22rpx;
  line-height: 1.5;
}

.dialog-footer-default {
  display: flex;
  gap: 16rpx;
}

.btn {
  flex: 1;
  min-height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20rpx;
  font-size: 28rpx;
  font-weight: 700;
  box-sizing: border-box;
}

.btn-cancel {
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 255, 255, 0.78);
  color: #6c645a;
}

.btn-confirm {
  background: linear-gradient(135deg, #127a72, #1f5eff);
  color: #fff;
  box-shadow: 0 12rpx 24rpx rgba(31, 94, 255, 0.22);
}

.btn:active {
  transform: scale(0.98);
  opacity: 0.92;
}
</style>
