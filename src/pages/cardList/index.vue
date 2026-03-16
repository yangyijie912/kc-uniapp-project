<template>
  <view class="page">
    <view v-if="!isSearchResultMode" class="toolbar">
      <input v-model="inputKeyword" class="search-input" placeholder="搜索问题或答案" placeholder-class="placeholder" />
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
        <view class="icon-btn add-btn" @click="goToAddCard">
          <text class="icon-mark">+</text>
        </view>
      </view>
    </view>

    <view class="card-list">
      <view v-for="value in cardViewList" :key="value.id" class="card-item" @click="goToDetail(value.id)">
        <view class="card-top">
          <view class="card-title">
            <view class="card-category">{{ value.categoryName }}</view>
            <view class="card-tag">/ {{ value.tags?.join('•') }}</view>
          </view>
          <view class="card-status" :class="`status-${value.status}`">{{ value.statusName ?? '未知' }}</view>
        </view>
        <view class="card-question">{{ value.question }}</view>
        <view class="card-answer">{{ value.answer }}</view>
      </view>

      <view v-if="cardViewList.length === 0" class="result-banner">
        <view class="result-title">没有找到相关卡片</view>
        <view class="result-keyword">试试调整搜索关键词或筛选条件？</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app';
import { computed, reactive, ref } from 'vue';
import useCardListView from '@/composables/useCardListView';
import type { CardStatus } from '@/types/card';

const { cardViewList, loadAllData, setQueryParams } = useCardListView();

const inputKeyword = ref('');

const statusTabs = [
  { label: '全部', value: undefined },
  { label: '掌握', value: 'mastered' },
  { label: '模糊', value: 'fuzzy' },
  { label: '未知', value: 'unknown' },
] as const;

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

const isSearchResultMode = computed(() => {
  return Boolean(queryParams.keyword?.trim());
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

// 进入卡片详情
const goToDetail = (id: string) => {
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

// 搜索/筛选卡片
const searchCard = () => {
  if (!inputKeyword.value?.trim()) {
    uni.showToast({
      title: '请输入搜索关键词',
      icon: 'none',
    });
    return;
  }

  queryParams.keyword = inputKeyword.value.trim();

  setQueryParams({
    categoryId: queryParams.categoryId,
    status: parseStatus(queryParams.status),
    keyword: queryParams.keyword,
  });
  loadAllData();
};

// 切换状态筛选
const toggleStatusFilter = (status?: CardStatus) => {
  queryParams.status = status;
  setQueryParams({
    categoryId: queryParams.categoryId,
    keyword: queryParams.keyword,
    status,
  });
  loadAllData();
};

onLoad((options) => {
  const p = parseParams(options as PageOptions);
  Object.assign(queryParams, p);
  setQueryParams(p);
});

onShow(() => {
  loadAllData();
});
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
  display: flex;
  justify-content: flex-end;
}

.icon-btn {
  width: 60rpx;
  height: 60rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1rpx solid rgba(61, 43, 24, 0.08);
  box-shadow: 0 12rpx 24rpx rgba(80, 55, 25, 0.08);
}

.icon-mark {
  font-size: 38rpx;
  line-height: 1;
  font-weight: 600;
}

.add-btn {
  background: rgba(18, 122, 114, 0.12);
  color: #127a72;
}

.filter-row {
  margin-top: 18rpx;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}

.filter-status {
  display: flex;
  align-items: center;
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
</style>
