<template>
  <view class="page">
    <!-- 第一区块：概览 -->
    <view class="section">
      <view class="section-title">概览</view>
      <view class="summary-grid">
        <view class="summary-card summary-card-total">
          <view class="summary-label">总卡片数</view>
          <view class="summary-value">{{ totalCards }}</view>
        </view>
        <view class="summary-card summary-card-review">
          <view class="summary-label">待复习</view>
          <view class="summary-value">{{ reviewCards }}</view>
        </view>
        <view class="summary-card summary-card-mastered">
          <view class="summary-label">掌握数</view>
          <view class="summary-value">{{ masteredCards }}</view>
        </view>
        <view class="summary-card summary-card-rate">
          <view class="summary-label">掌握率</view>
          <view class="summary-value">{{ masteredRate }}</view>
        </view>
      </view>
    </view>

    <!-- 第二区块：今日状态 -->
    <view class="section">
      <view class="section-title">今日状态</view>
      <view class="today-panel">
        <view class="today-main-card">
          <view class="today-main-head">
            <view>
              <view class="today-main-label">今日测验进度</view>
              <view class="today-main-tip">{{ todayStats.progressText }}</view>
            </view>
            <view class="today-main-badge">{{ todayStats.quizRate }}%</view>
          </view>
          <view class="today-progress-track">
            <view class="today-progress-fill" :style="{ width: `${todayStats.quizRate}%` }"></view>
          </view>
        </view>
        <view class="today-side-grid">
          <view class="today-side-card today-side-card-practice">
            <view class="today-side-label">今日刷题数</view>
            <view class="today-side-value">{{ todayStats.practiceCount }}</view>
            <view class="today-side-tip">按卡片去重统计</view>
          </view>
          <view class="today-side-card today-side-card-correct">
            <view class="today-side-label">掌握题数</view>
            <view class="today-side-value">{{ todayStats.correctCount }}</view>
            <view class="today-side-tip">掌握率 {{ todayStats.correctRate }}%</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 第三区块：状态分布 -->
    <view class="section">
      <view class="section-title">卡片状态分布</view>
      <view class="status-distribution">
        <view v-for="item in statusDistribution" :key="item.key" class="dist-item">
          <view class="dist-item-head">
            <view class="dist-dot" :class="item.dotClass"></view>
            <view class="dist-name">{{ item.label }}</view>
          </view>
          <view class="dist-value">{{ item.count }} 张</view>
          <view class="dist-percent">{{ item.percent }}</view>
        </view>
      </view>
    </view>

    <!-- 第四区块：学习活跃度 -->
    <view class="section">
      <view class="section-title">学习活跃度</view>
      <view class="activity-toolbar">
        <view
          class="activity-tab"
          :class="{ 'activity-tab-active': activityRange === '7d' }"
          @click="activityRange = '7d'"
        >
          7 天
        </view>
        <view
          class="activity-tab"
          :class="{ 'activity-tab-active': activityRange === '30d' }"
          @click="activityRange = '30d'"
        >
          30 天
        </view>
      </view>
      <view class="activity-grid">
        <view class="activity-card activity-card-added">
          <view class="activity-card-label">新增</view>
          <view class="activity-card-value">{{ currentActivityStats.added }}</view>
        </view>
        <view class="activity-card activity-card-updated">
          <view class="activity-card-label">更新</view>
          <view class="activity-card-value">{{ currentActivityStats.updated }}</view>
        </view>
        <view class="activity-card activity-card-practice">
          <view class="activity-card-label">刷题</view>
          <view class="activity-card-value">{{ currentActivityStats.practice }}</view>
        </view>
        <view class="activity-card activity-card-mastered">
          <view class="activity-card-label">掌握</view>
          <view class="activity-card-value">{{ currentActivityStats.mastered }}</view>
        </view>
      </view>
    </view>

    <!-- 第五区块：分类表现 -->
    <view class="section">
      <view class="section-title">分类表现</view>
      <view class="category-table">
        <view class="table-header">
          <view class="th-name">分类</view>
          <view class="th-cards">卡片数</view>
          <view class="th-rate">掌握率</view>
          <view class="th-review">待复习</view>
        </view>

        <view v-for="row in categoryRows" :key="row.id" class="table-row">
          <view class="td-name">{{ row.name }}</view>
          <view class="td-cards">{{ row.cards }}</view>
          <view class="td-rate">{{ row.rate }}</view>
          <view class="td-review">{{ row.review }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import useCategoryView from '@/composables/useCategoryView';
import useStatsView from '@/composables/useStatsView';

const activityRange = ref<'7d' | '30d'>('7d');
const { categoryViewList, loadAllData } = useCategoryView();
const { stats, loadStats } = useStatsView();

function formatRate(value: number, total: number) {
  if (total <= 0) {
    return '0%';
  }

  return `${Math.round((value / total) * 100)}%`;
}

const totalCards = computed(() => stats.value.total);
const masteredCards = computed(() => stats.value.mastered);
const reviewCards = computed(() => Math.max(stats.value.total - stats.value.mastered, 0));
const masteredRate = computed(() => formatRate(stats.value.mastered, stats.value.total));
const undefinedCards = computed(() =>
  Math.max(stats.value.total - stats.value.mastered - stats.value.fuzzy - stats.value.unknown, 0),
);

const todayStats = computed(() => {
  const quizDone = stats.value.dailyQuizCurrentIndex;
  const quizTarget = stats.value.dailyQuizLimit;
  const quizRate = quizTarget > 0 ? Math.round((quizDone / quizTarget) * 100) : 0;
  const practiceCount = stats.value.dailyStudied ?? 0;
  const correctCount = stats.value.dailyMastered ?? 0;
  const correctRate = practiceCount > 0 ? Math.round((correctCount / practiceCount) * 100) : 0;

  return {
    quizDone,
    quizTarget,
    quizRate,
    progressText: quizTarget > 0 ? `${quizDone} / ${quizTarget} 已完成` : '今日还没有开始每日测验',
    practiceCount,
    correctCount,
    correctRate,
  };
});

const statusDistribution = computed(() => [
  {
    key: 'mastered',
    label: '掌握',
    count: stats.value.mastered,
    percent: formatRate(stats.value.mastered, stats.value.total),
    dotClass: 'dist-dot-mastered',
  },
  {
    key: 'fuzzy',
    label: '模糊',
    count: stats.value.fuzzy,
    percent: formatRate(stats.value.fuzzy, stats.value.total),
    dotClass: 'dist-dot-fuzzy',
  },
  {
    key: 'unknown',
    label: '未知',
    count: stats.value.unknown,
    percent: formatRate(stats.value.unknown, stats.value.total),
    dotClass: 'dist-dot-unknown',
  },
  {
    key: 'undefined',
    label: '未设置',
    count: undefinedCards.value,
    percent: formatRate(undefinedCards.value, stats.value.total),
    dotClass: 'dist-dot-undefined',
  },
]);

const activityStatsMap = computed(() => ({
  '7d': {
    added: stats.value.activityStats?.['7day'].added ?? 0,
    updated: stats.value.activityStats?.['7day'].updated ?? 0,
    practice: stats.value.activityStats?.['7day'].practice ?? 0,
    mastered: stats.value.activityStats?.['7day'].mastered ?? 0,
  },
  '30d': {
    added: stats.value.activityStats?.['30day'].added ?? 0,
    updated: stats.value.activityStats?.['30day'].updated ?? 0,
    practice: stats.value.activityStats?.['30day'].practice ?? 0,
    mastered: stats.value.activityStats?.['30day'].mastered ?? 0,
  },
}));

const currentActivityStats = computed(() => activityStatsMap.value[activityRange.value]);

const categoryRows = computed(() =>
  categoryViewList.value.map((category) => {
    const categoryStats = stats.value.categoryStats[category.id];
    const total = categoryStats?.total ?? category.cardCount ?? 0;
    const mastered = categoryStats?.mastered ?? 0;

    return {
      id: category.id,
      name: category.name,
      cards: total,
      rate: formatRate(mastered, total),
      review: Math.max(total - mastered, 0),
    };
  }),
);

onShow(() => {
  loadAllData();
  loadStats();
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

/* ============ Section 容器 ============ */
.section {
  margin-bottom: 32rpx;
}

.section-title {
  color: #1e1c18;
  font-size: 30rpx;
  font-weight: 700;
  margin-bottom: 16rpx;
}

/* ============ 第一区块：概览 ============ */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
}

.summary-card {
  padding: 22rpx;
  border-radius: 24rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 252, 247, 0.84);
  box-shadow: 0 10rpx 28rpx rgba(80, 55, 25, 0.04);
}

.summary-card-total .summary-value {
  color: #1e1c18;
}

.summary-card-review .summary-value {
  color: #ef7d42;
}

.summary-card-mastered .summary-value {
  color: #127a72;
}

.summary-card-rate .summary-value {
  color: #1f5eff;
}

.summary-label {
  color: #6c645a;
  font-size: 22rpx;
}

.summary-value {
  margin-top: 12rpx;
  color: #1e1c18;
  font-size: 44rpx;
  line-height: 1;
  font-weight: 700;
}

/* ============ 第二区块：今日状态 ============ */
.today-panel {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.today-main-card,
.today-side-card {
  border-radius: 24rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  box-shadow: 0 10rpx 28rpx rgba(80, 55, 25, 0.04);
  box-sizing: border-box;
}

.today-main-card {
  padding: 20rpx;
  background:
    linear-gradient(135deg, rgba(31, 94, 255, 0.12), rgba(255, 252, 247, 0.92)),
    rgba(255, 252, 247, 0.9);
}

.today-main-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12rpx;
}

.today-main-label {
  color: #1e1c18;
  font-size: 26rpx;
  font-weight: 700;
}

.today-main-tip {
  margin-top: 6rpx;
  color: #6c645a;
  font-size: 22rpx;
}

.today-main-badge {
  min-width: 78rpx;
  padding: 8rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(31, 94, 255, 0.14);
  color: #1f5eff;
  font-size: 22rpx;
  line-height: 1.2;
  text-align: center;
  font-weight: 700;
  box-sizing: border-box;
}

.today-progress-track {
  margin-top: 20rpx;
  height: 12rpx;
  border-radius: 999rpx;
  background: rgba(31, 94, 255, 0.12);
  overflow: hidden;
}

.today-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #1f5eff 0%, #5b8dff 100%);
}

.today-side-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
}

.today-side-card {
  padding: 18rpx;
  background: rgba(255, 252, 247, 0.88);
}

.today-side-card-practice {
  background:
    linear-gradient(135deg, rgba(239, 125, 66, 0.12), rgba(255, 252, 247, 0.92)),
    rgba(255, 252, 247, 0.9);
}

.today-side-card-correct {
  background:
    linear-gradient(135deg, rgba(18, 122, 114, 0.12), rgba(255, 252, 247, 0.92)),
    rgba(255, 252, 247, 0.9);
}

.today-side-label {
  color: #6c645a;
  font-size: 22rpx;
}

.today-side-value {
  margin-top: 10rpx;
  color: #1e1c18;
  font-size: 36rpx;
  line-height: 1;
  font-weight: 700;
}

.today-side-tip {
  margin-top: 8rpx;
  color: #8f877b;
  font-size: 20rpx;
}

/* ============ 第三区块：状态分布 ============ */
.status-distribution {
  padding: 24rpx;
  border-radius: 28rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 252, 247, 0.84);
  box-shadow: 0 16rpx 40rpx rgba(80, 55, 25, 0.06);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.dist-item {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.dist-item-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.dist-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
}

.dist-dot-mastered {
  background: #127a72;
}

.dist-dot-fuzzy {
  background: #f59e0b;
}

.dist-dot-unknown {
  background: #ef4444;
}

.dist-dot-undefined {
  background: #9ca3af;
}

.dist-name {
  color: #1e1c18;
  font-size: 24rpx;
  font-weight: 600;
}

.dist-value {
  color: #1e1c18;
  font-size: 28rpx;
  font-weight: 700;
}

.dist-percent {
  color: #8f877b;
  font-size: 20rpx;
}

/* ============ 第四区块：学习活跃度 ============ */
.activity-toolbar {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.activity-tab {
  min-width: 76rpx;
  padding: 10rpx 18rpx;
  border-radius: 18rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 252, 247, 0.88);
  color: #6c645a;
  font-size: 22rpx;
  line-height: 1.2;
  text-align: center;
  font-weight: 600;
  box-sizing: border-box;
}

.activity-tab-active {
  border-color: rgba(31, 94, 255, 0.2);
  background: rgba(31, 94, 255, 0.12);
  color: #1f5eff;
}

.activity-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
}

.activity-card {
  padding: 22rpx;
  border-radius: 24rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 252, 247, 0.84);
  box-shadow: 0 10rpx 28rpx rgba(80, 55, 25, 0.04);
}

.activity-card-label {
  color: #6c645a;
  font-size: 22rpx;
}

.activity-card-value {
  margin-top: 12rpx;
  font-size: 44rpx;
  line-height: 1;
  font-weight: 700;
}

.activity-card-added .activity-card-value {
  color: #ef7d42;
}

.activity-card-updated .activity-card-value {
  color: #1f5eff;
}

.activity-card-practice .activity-card-value {
  color: #8b5cf6;
}

.activity-card-mastered .activity-card-value {
  color: #127a72;
}

/* ============ 第五区块：分类表现 ============ */
.category-table {
  display: flex;
  flex-direction: column;
  border-radius: 20rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 252, 247, 0.88);
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  column-gap: 8rpx;
  padding: 14rpx 16rpx;
  background: rgba(61, 43, 24, 0.04);
  border-bottom: 1rpx solid rgba(61, 43, 24, 0.08);
  align-items: center;
}

.th-name,
.th-cards,
.th-rate,
.th-review {
  color: #6c645a;
  font-size: 22rpx;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.th-cards,
.th-rate,
.th-review {
  text-align: center;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  column-gap: 8rpx;
  padding: 14rpx 16rpx;
  border-bottom: 1rpx solid rgba(61, 43, 24, 0.06);
  align-items: center;
}

.table-row:last-child {
  border-bottom: none;
}

.td-name {
  color: #1e1c18;
  font-size: 24rpx;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.td-cards,
.td-rate,
.td-review {
  color: #1e1c18;
  font-size: 24rpx;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
