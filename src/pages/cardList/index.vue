<template>
  <view class="page">
    <scroll-view class="page-scroll" scroll-y @scrolltolower="handleScrollToLower">
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

        <view class="page-actions">
          <view class="page-actions-copy">
            <view class="page-actions-title">批量操作</view>
            <view class="page-actions-desc">长按卡片进入多选，支持转移分类与删除</view>
          </view>

          <view class="page-actions-body">
            <view v-if="showQuizAction" class="action-tool quiz-btn" @click="openQuizSetup">
              <text class="action-tool-icon">▷</text>
            </view>
            <view class="action-tool add-btn" @click="goToAddCard">
              <text class="action-tool-icon">+</text>
            </view>
          </view>
        </view>
      </view>

      <view class="card-list" :class="{ 'is-editing': isEditMode }">
        <view
          v-for="value in cardViewList"
          :key="value.id"
          class="card-item"
          :class="{
            'is-editing': isEditMode,
            'is-selected': selectedCards.includes(value.id),
          }"
          @longpress="onEdit(value.id)"
          @click="onCardClick(value.id)"
        >
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
              <view class="card-tag">
                {{ Array.isArray(value.tags) && value.tags.length > 0 ? '/ ' : ''
                }}{{ Array.isArray(value.tags) ? value.tags.join('•') : '' }}</view
              >
            </view>
            <view class="card-status" :class="`status-${value.status}`">{{
              value.statusName ?? '新'
            }}</view>
          </view>
          <view class="card-question">{{ value.question }}</view>
          <view class="card-answer">{{ value.answer }}</view>
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

      <view v-if="isEditMode" class="bottom-placeholder"> </view>
    </scroll-view>

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
import BaseDialog from '@/components/BaseDialog.vue';
import QuizSetupSheet from '@/components/QuizSetupSheet.vue';
import type { CardStatus } from '@/types/card';
import type { quizQuery } from '@/types/quiz';

const { cardViewList, categoryList, loading, hasMore, loadCards, loadAllData } = useCardListView();

const pageSize = 10;
const currentPage = ref(1);

const inputKeyword = ref('');
const showQuizSetup = ref(false);

const statusTabs = [
  { label: '全部', value: undefined },
  { label: '掌握', value: 'mastered' },
  { label: '模糊', value: 'fuzzy' },
  { label: '未知', value: 'unknown' },
] as const;

const isEditMode = ref(false); // 是否处于编辑模式（多选状态）
const selectedCards = ref<string[]>([]); // 已选择的卡片ID列表
const categoryOptions = computed(() =>
  categoryList.value.map((category) => ({
    id: category.id,
    name: category.name,
  })),
);
const categoryDialogVisible = ref(false);
const selectedTransferCategoryId = ref('');

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

// 定义查询参数类型
type QueryParams = {
  categoryId?: string;
  keyword?: string;
  status?: CardStatus;
};

// 定义页面接收的查询参数类型
type PageOptions = {
  categoryId?: string;
  keyword?: string;
  status?: string;
};

const queryParams = reactive<PageOptions>({});

const isSearchResultMode = ref(false);

const showQuizAction = computed(() => {
  return Boolean(queryParams.categoryId) && !isSearchResultMode.value;
});

// 解析状态参数，确保它是合法的 CardStatus 值
const parseStatus = (status?: string): CardStatus | undefined => {
  if (status === 'mastered' || status === 'fuzzy' || status === 'unknown') {
    return status;
  }

  return undefined;
};

// 解析页面参数，设置查询参数
const parseParams = (options?: PageOptions): QueryParams => {
  return {
    categoryId: options?.categoryId || undefined,
    keyword: options?.keyword || undefined,
    status: parseStatus(options?.status),
  };
};

// 点击卡片多选或进入详情
const onCardClick = (id: string) => {
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

const goToAddCard = () => {
  const query = queryParams.categoryId ? `?categoryId=${queryParams.categoryId}` : '';

  uni.navigateTo({
    url: `/pages/cardEdit/index${query}`,
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

const buildQuery = (page: number) => ({
  categoryId: queryParams.categoryId,
  keyword: queryParams.keyword,
  status: parseStatus(queryParams.status),
  page,
  pageSize,
});

const loadCurrentPages = () => {
  loadAllData(buildQuery(currentPage.value));
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
    loadCards(buildQuery(currentPage.value));
  }
};

// 搜索/筛选卡片
const searchCard = () => {
  const keyword = inputKeyword.value?.trim();
  queryParams.keyword = keyword;
  isSearchResultMode.value = Boolean(keyword);
  currentPage.value = 1;
  loadCurrentPages();
};

// 切换状态筛选
const toggleStatusFilter = (status?: CardStatus) => {
  queryParams.status = status;
  currentPage.value = 1;
  loadCurrentPages();
};

// 进入编辑模式（长按卡片）
const onEdit = (id: string) => {
  isEditMode.value = true;
  if (!selectedCards.value.includes(id)) {
    selectedCards.value.push(id);
  }
};

const exitEditMode = () => {
  isEditMode.value = false;
  selectedCards.value = [];
  closeCategoryDialog();
};

// 选择转移的分类
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

// 选择分类并转移
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

// 批量删除
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

onLoad((options) => {
  const p = parseParams(options as PageOptions);
  Object.assign(queryParams, p);
  inputKeyword.value = p.keyword || '';
  if (p.keyword) {
    isSearchResultMode.value = true;
  }
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
  padding: 22rpx 22rpx 20rpx;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, rgba(255, 252, 247, 0.96) 0%, rgba(255, 247, 236, 0.88) 100%);
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  box-shadow: 0 16rpx 40rpx rgba(80, 55, 25, 0.06);
  box-sizing: border-box;
  flex-shrink: 0;
}

.page-actions-copy {
  flex: 1;
  min-width: 0;
}

.page-actions-title {
  color: #1e1c18;
  font-size: 28rpx;
  font-weight: 700;
}

.page-actions-desc {
  margin-top: 8rpx;
  color: #6c645a;
  font-size: 22rpx;
  line-height: 1.5;
}

.page-actions-body {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
}

.action-tool {
  width: 72rpx;
  height: 72rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.08);
  box-shadow: 0 12rpx 26rpx rgba(80, 55, 25, 0.08);
  box-sizing: border-box;
  flex-shrink: 0;
}

.action-tool-icon {
  font-size: 34rpx;
  line-height: 1;
  font-weight: 600;
}

.add-btn {
  background: linear-gradient(135deg, rgba(18, 122, 114, 0.16) 0%, rgba(18, 122, 114, 0.08) 100%);
  color: #127a72;
}

.quiz-btn {
  background: linear-gradient(135deg, rgba(31, 94, 255, 0.16) 0%, rgba(31, 94, 255, 0.08) 100%);
  color: #1f5eff;
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
  .page-actions {
    flex-direction: column;
  }

  .page-actions-body {
    width: 100%;
    justify-content: flex-end;
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
  padding: 28rpx;
  border-radius: 28rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 252, 247, 0.84);
  box-shadow: 0 16rpx 40rpx rgba(80, 55, 25, 0.06);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.card-item.is-editing {
  padding-left: 90rpx;
}

.card-item.is-selected {
  border-color: rgba(31, 94, 255, 0.36);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(235, 242, 255, 0.92) 100%);
  box-shadow: 0 18rpx 42rpx rgba(31, 94, 255, 0.12);
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
  gap: 10rpx;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.card-category {
  color: #127a72;
  font-size: 24rpx;
}

.card-tag {
  color: #9d9487;
  font-size: 22rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.status-unknown {
  background: rgba(255, 255, 255, 0.72);
  color: #6c645a;
}

.status-undefined {
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
