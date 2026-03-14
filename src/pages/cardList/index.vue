<template>
  <view class="page">
    <view v-if="!isSearchResultMode" class="toolbar">
      <input
        :value="queryParams.keyword"
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
      <view class="filter-chip active">全部</view>
      <view class="filter-chip">已掌握</view>
      <view class="filter-chip">模糊</view>
      <view class="filter-chip">未复习</view>
    </view>

    <view class="card-list">
      <view v-for="value in cardViewList" :key="value.id" class="card-item" @click="goToDetail(value.id)">
        <view class="card-top">
          <view class="card-tag">{{ value.categoryName }}</view>
          <view class="card-status" :class="`status-${value.status}`">{{ value.statusName }}</view>
        </view>
        <view class="card-question">{{ value.question }}</view>
        <view class="card-answer">{{ value.answer }}</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app';
import { computed, reactive } from 'vue';
import useCardListView from '@/composables/useCardListView';

const { cardViewList, loadAllData, setQueryParams } = useCardListView();

// 定义查询参数类型
type QueryParams = {
  categoryId?: string;
  keyword?: string;
};

// 定义页面接收的查询参数类型
type PageOptions = {
  categoryId?: string;
  keyword?: string;
};

const queryParams = reactive<PageOptions>({});

const isSearchResultMode = computed(() => {
  return Boolean(queryParams.keyword?.trim());
});

const parseParams = (options?: PageOptions): QueryParams => {
  return {
    categoryId: options?.categoryId || undefined,
    keyword: options?.keyword || undefined,
  };
};

// 进入卡片详情
const goToDetail = (id: string) => {
  uni.navigateTo({
    url: `/pages/cardDetail/index?id=${id}`,
  });
};

const searchCard = () => {
  if (!queryParams.keyword?.trim()) {
    uni.showToast({
      title: '请输入搜索关键词',
      icon: 'none',
    });
    return;
  }
  setQueryParams({ ...queryParams }); // 触发列表刷新
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
