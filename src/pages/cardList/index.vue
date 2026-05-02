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
            <view class="sort-state-tag" :class="{ active: isSortMode || isSelectMode }">
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

      <CardList
        :cards="cardViewList"
        :has-more="hasMore"
        :loading="loading"
        :mode="interactionMode"
        :selected-ids="selectedCards"
        :sort-active-id="activeSortCardId"
        @card-click="handleCardClick"
        @card-touch-start="handleCardTouchStart"
        @card-touch-end="handleCardTouchEnd"
        @card-touch-move="handleCardTouchMove"
        @sort-touch-start="handleSortHandleTouchStart"
        @sort-touch-move="handleSortHandleTouchMove"
        @sort-touch-end="handleSortHandleTouchEnd"
        @sort-touch-click="handleSortHandleClick"
      />
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

    <CardBatchActions
      v-if="isSelectMode"
      :selected-count="selectedCards.length"
      @cancel="selection.exitSelectMode"
      @transfer="openCategoryDialog"
      @delete="batchDelete"
    />

    <TransferCategoryDialog
      :open="categoryDialogVisible"
      :category-list="categoryList"
      :selected-category-id="selectedTransferCategoryId"
      @close="closeCategoryDialog"
      @confirm="confirmTransferCategory"
      @update:selected-category-id="selectedTransferCategoryId = $event"
    />

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
import useCardListView from '@/composables/useCardListView';
import useCardListInteraction from '@/composables/useCardListInteraction';
import useCardSelection from '@/composables/useCardSelection';
import useCardSortDrag from '@/composables/useCardSortDrag';
import QuizSetupSheet from '@/components/QuizSetupSheet.vue';
import CardBatchActions from './components/CardBatchActions.vue';
import CardList from './components/CardList.vue';
import TransferCategoryDialog from './components/TransferCategoryDialog.vue';
import { CARD_SORT_OPTIONS } from '@/constants/sortConfig';
import { batchDeleteCards, batchUpdateCards } from '@/services/cardService';
import type { CardSortConfig, CardStatus } from '@/types/card';
import type { quizQuery } from '@/types/quiz';

const {
  cardList,
  cardViewList,
  categoryList,
  loading,
  hasMore,
  loadCards,
  loadCategories,
  reloadCards,
} = useCardListView();

const pageSize = 10;
const currentPage = ref(1);

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
const interaction = useCardListInteraction();
const isSearchResultMode = ref(false);
const selection = useCardSelection({
  interactionMode: interaction.interactionMode,
  setInteractionMode: interaction.setInteractionMode,
  isSearchResultMode,
});
const interactionMode = interaction.interactionMode;
const selectedCards = selection.selectedCards;
const isSelectMode = selection.isSelectMode;
const handleCardClick = selection.handleCardClick;
const handleCardTouchStart = selection.handleCardTouchStart;
const handleCardTouchEnd = selection.handleCardTouchEnd;
const handleCardTouchMove = selection.handleCardTouchMove;
const categoryDialogVisible = ref(false);
const selectedTransferCategoryId = ref('');

const statusTabs = [
  { label: '全部', value: undefined },
  { label: '掌握', value: 'mastered' },
  { label: '模糊', value: 'fuzzy' },
  { label: '未知', value: 'unknown' },
] as const;

const queryParams = reactive<PageOptions>({});
const enteredFromHomeSearch = ref(false);

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

const sortDrag = useCardSortDrag({
  cardList,
  interactionMode: interaction.interactionMode,
  setInteractionMode: interaction.setInteractionMode,
  categoryId: currentCategoryId,
  isSearchResultMode,
  selectedSortIndex,
  sortOptions: CARD_SORT_OPTIONS,
  scrollTop,
  loadCurrentPages,
  clearTouchState: selection.resetSelectionState,
});

const {
  currentModeDesc,
  currentModeTag,
  currentModeTitle,
  isSortModeDisabled,
  isSortMode,
  isSortActive,
  activeSortCardId,
  sortModeActionLabel,
  handleSortHandleTouchStart,
  handleSortHandleTouchMove,
  handleSortHandleTouchEnd,
  handleSortHandleClick,
  toggleSortMode,
} = sortDrag;

// 页面是唯一的模式决策点：这里负责把选择态和拖拽态一起收回到浏览态。
const resetInteractionModes = () => {
  selection.resetSelectionState();
  if (interactionMode.value === 'sort') {
    interaction.setInteractionMode('browse');
  }
};

const openCategoryDialog = () => {
  if (selectedCards.value.length === 0) {
    uni.showToast({ title: '请先选择卡片', icon: 'none' });
    return;
  }

  if (!selectedTransferCategoryId.value) {
    selectedTransferCategoryId.value = categoryList.value[0]?.id || '';
  }

  categoryDialogVisible.value = true;
};

const closeCategoryDialog = () => {
  categoryDialogVisible.value = false;
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
    // 转移成功后要同时清掉选择结果和当前模式，避免批量态残留。
    selection.resetSelectionState();
    interaction.setInteractionMode('browse');
    loadCurrentPages();
    return;
  }

  uni.showToast({ title: res.message || '转移失败', icon: 'none' });
};

const batchDelete = () => {
  if (selectedCards.value.length === 0) {
    uni.showToast({ title: '请至少选择一张卡片', icon: 'none' });
    return;
  }

  // 删除是不可逆操作，保留二次确认，避免多选场景下误触直接丢数据。
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
          selection.resetSelectionState();
          interaction.setInteractionMode('browse');
          loadCurrentPages();
        } else {
          uni.showToast({ title: message || '删除失败，请重试', icon: 'none' });
        }
      }
    },
  });
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
  loadCategories();
});

onShow(() => {
  refreshData();
  loadCategories();
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
.page-scroll {
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

@media (max-width: 360px) {
  .page-actions-body {
    flex-wrap: wrap;
  }

  .action-pill {
    flex: unset;
    width: calc(50% - 5rpx);
  }
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
</style>
