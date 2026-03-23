<template>
  <view class="page">
    <view class="hero-card">
      <view class="hero-badge">Knowledge Card</view>
      <view class="hero-title">把零散知识，练成稳定记忆</view>
      <view class="hero-desc"> 用抽题、分类和检索把前端知识点串起来，适合日常复习和面试前冲刺。 </view>

      <view class="hero-actions">
        <view class="quiz-btn" @click="openQuizSetup">开始抽题</view>
        <view class="secondary-btn" @click="goToCardListbyAll">查看卡库</view>
      </view>

      <view class="hero-metrics">
        <view class="metric-item">
          <view class="metric-value">{{ cardList.length }}</view>
          <view class="metric-label">知识卡</view>
        </view>
        <view class="metric-item">
          <view class="metric-value">{{ categoryViewList.length }}</view>
          <view class="metric-label">分类</view>
        </view>
        <view class="metric-item">
          <view class="metric-value">{{ cardList.filter((card) => card.status !== 'mastered').length }}</view>
          <view class="metric-label">未掌握</view>
        </view>
      </view>
    </view>

    <view class="search-panel">
      <view class="section-head">
        <view class="section-title">快速搜索</view>
        <view class="section-tip">按问题、答案或关键词查找</view>
      </view>

      <view class="search-area">
        <input
          class="search-input"
          placeholder="例如：useEffect、闭包、响应式"
          placeholder-class="search-placeholder"
          v-model="searchQuery"
        />
        <view class="search-btn" @click="searchCard">搜索</view>
      </view>
    </view>

    <view class="category-panel">
      <view class="section-head">
        <view class="section-title">热门分类</view>
        <view class="section-tip">从熟悉的主题开始刷题</view>
      </view>

      <view class="category-list">
        <view
          v-for="c in categoryViewList"
          :key="c.id"
          class="category-item"
          :style="{ background: getCategoryTheme(c.name).background, color: getCategoryTheme(c.name).color }"
          @click="goToCardList(c.id)"
        >
          <text class="category-name">{{ c.name }}</text>
          <text class="category-count">{{ c.cardCount }} 张卡片</text>
        </view>
      </view>
    </view>

    <view class="manage-panel">
      <view class="section-head">
        <view class="section-title">管理入口</view>
        <view class="section-tip">维护分类和后续导入内容，入口收在次级区域</view>
      </view>

      <view class="manage-grid">
        <view class="manage-item" @click="goToCategoryManage">
          <view class="manage-item-title">分类管理</view>
          <view class="manage-item-desc">新增、修改和整理分类</view>
        </view>
        <view class="manage-item manage-item-muted">
          <view class="manage-item-title">数据导入</view>
          <view class="manage-item-desc">后续接 Word 导入流程</view>
        </view>
      </view>
    </view>

    <QuizSetupSheet :open="showQuizSetup" @close="closeQuizSetup" @start="startQuizWithCurrentUI" />
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { getCategoryTheme } from '@/utils/categoryTheme';
import { ref } from 'vue';
import useCategoryView from '@/composables/useCategoryView';
import QuizSetupSheet from '@/components/QuizSetupSheet.vue';
import type { quizQuery } from '@/types/quiz';

const { categoryViewList, cardList, loadAllData } = useCategoryView();
const searchQuery = ref('');
const showQuizSetup = ref(false);

onShow(() => {
  loadAllData(); // 加载分类数据
});

// 搜索
const searchCard = () => {
  if (!searchQuery.value.trim()) {
    uni.showToast({
      title: '请输入搜索关键词',
      icon: 'none',
    });
    return;
  }
  uni.navigateTo({
    url: '/pages/cardList/index?keyword=' + encodeURIComponent(searchQuery.value),
  });
};

// 抽题
const onQuiz = (options?: quizQuery) => {
  let url = '/pages/quiz/index';
  if (options) {
    const { mode, type, limit } = options;
    url += `?mode=${mode}&type=${type}&limit=${limit}`;
  }
  uni.navigateTo({
    url,
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
  onQuiz(query);
};

// 进入卡片列表
const goToCardListbyAll = () => {
  uni.navigateTo({
    url: '/pages/cardList/index',
  });
};

// 进入卡片列表
const goToCardList = (categoryId: string) => {
  uni.navigateTo({
    url: `/pages/cardList/index?categoryId=${categoryId}`,
  });
};

// 进入分类管理
const goToCategoryManage = () => {
  uni.navigateTo({
    url: '/pages/categoryManage/index',
  });
};
</script>

<style scoped>
.page {
  --bg-cream: #f7f1e8;
  --bg-surface: rgba(255, 252, 247, 0.84);
  --text-main: #1e1c18;
  --text-muted: #6c645a;
  --line-soft: rgba(61, 43, 24, 0.12);
  --accent-orange: #ef7d42;
  --accent-teal: #127a72;
  --accent-blue: #1f5eff;
  padding: 40rpx 28rpx 56rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  background:
    radial-gradient(circle at top left, rgba(239, 125, 66, 0.2), transparent 34%),
    radial-gradient(circle at top right, rgba(31, 94, 255, 0.16), transparent 30%),
    linear-gradient(180deg, #f8f2e8 0%, #efe5d5 100%);
}

.hero-card,
.search-panel,
.category-panel,
.manage-panel {
  position: relative;
  overflow: hidden;
  border: 1rpx solid var(--line-soft);
  border-radius: 36rpx;
  background: var(--bg-surface);
  box-shadow: 0 20rpx 60rpx rgba(80, 55, 25, 0.08);
  backdrop-filter: blur(12rpx);
}

.hero-card {
  padding: 38rpx 32rpx 34rpx;
}

.hero-card::after {
  content: '';
  position: absolute;
  right: -40rpx;
  top: -50rpx;
  width: 220rpx;
  height: 220rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(239, 125, 66, 0.28), rgba(255, 255, 255, 0));
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(18, 122, 114, 0.12);
  color: var(--accent-teal);
  font-size: 22rpx;
  letter-spacing: 1rpx;
}

.hero-title {
  margin-top: 22rpx;
  color: var(--text-main);
  font-size: 56rpx;
  line-height: 1.15;
  font-weight: 700;
}

.hero-desc {
  margin-top: 18rpx;
  max-width: 580rpx;
  color: var(--text-muted);
  font-size: 28rpx;
  line-height: 1.7;
}

.hero-actions {
  margin-top: 28rpx;
  display: flex;
  gap: 18rpx;
  flex-wrap: wrap;
}

.quiz-btn,
.secondary-btn,
.search-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.quiz-btn {
  min-width: 220rpx;
  height: 88rpx;
  background: linear-gradient(135deg, #1f5eff, #3b82ff);
  color: #fff;
  box-shadow: 0 18rpx 36rpx rgba(31, 94, 255, 0.24);
}

.secondary-btn {
  min-width: 220rpx;
  height: 88rpx;
  border: 1rpx solid rgba(31, 94, 255, 0.15);
  background: rgba(255, 255, 255, 0.64);
  color: var(--accent-blue);
}

.hero-metrics {
  margin-top: 30rpx;
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
}

.metric-item {
  flex: 1;
  padding: 24rpx 18rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.72);
  border: 1rpx solid rgba(61, 43, 24, 0.08);
}

.metric-value {
  color: var(--text-main);
  font-size: 40rpx;
  font-weight: 700;
}

.metric-label {
  margin-top: 6rpx;
  color: var(--text-muted);
  font-size: 24rpx;
}

.search-panel,
.category-panel,
.manage-panel {
  padding: 30rpx 28rpx;
}

.section-head {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.section-title {
  color: var(--text-main);
  font-size: 34rpx;
  font-weight: 700;
}

.section-tip {
  color: var(--text-muted);
  font-size: 24rpx;
}

.search-area {
  margin-top: 24rpx;
  padding: 12rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.78);
  border: 1rpx solid rgba(61, 43, 24, 0.08);
}

.search-input {
  flex: 1;
  height: 84rpx;
  padding: 0 24rpx;
  color: var(--text-main);
  font-size: 28rpx;
}

.search-placeholder {
  color: #9d9487;
  font-size: 28rpx;
}

.search-btn {
  min-width: 154rpx;
  height: 84rpx;
  background: linear-gradient(135deg, #ef7d42, #f39c54);
  color: #fff;
  box-shadow: 0 14rpx 28rpx rgba(239, 125, 66, 0.22);
}

.category-list {
  margin-top: 24rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
}

.category-item {
  min-height: 152rpx;
  padding: 26rpx 24rpx;
  border-radius: 28rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
}

.category-name {
  font-size: 34rpx;
  font-weight: 700;
}

.category-count {
  margin-top: 8rpx;
  font-size: 24rpx;
  opacity: 0.88;
}

.manage-grid {
  margin-top: 24rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
}

.manage-item {
  min-height: 160rpx;
  padding: 24rpx;
  border-radius: 26rpx;
  border: 1rpx solid rgba(31, 94, 255, 0.12);
  background: linear-gradient(135deg, rgba(31, 94, 255, 0.09), rgba(255, 255, 255, 0.72));
  box-sizing: border-box;
}

.manage-item-muted {
  border-color: rgba(61, 43, 24, 0.08);
  background: linear-gradient(135deg, rgba(239, 125, 66, 0.08), rgba(255, 255, 255, 0.72));
}

.manage-item-title {
  color: var(--text-main);
  font-size: 30rpx;
  font-weight: 700;
}

.manage-item-desc {
  margin-top: 12rpx;
  color: var(--text-muted);
  font-size: 24rpx;
  line-height: 1.7;
}

@media (max-width: 320px) {
  .manage-grid {
    grid-template-columns: 1fr;
  }
}

.category-count {
  font-size: 24rpx;
  opacity: 0.88;
}

.accent-orange {
  box-shadow: inset 10rpx 0 0 #ef7d42;
}

.accent-blue {
  box-shadow: inset 10rpx 0 0 #1f5eff;
}

@media (max-width: 320px) {
  .hero-title {
    font-size: 48rpx;
  }

  .category-list {
    grid-template-columns: 1fr;
  }
}
</style>
