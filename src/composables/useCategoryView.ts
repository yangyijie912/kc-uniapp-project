// 分类页展示逻辑和数据处理的组合式函数
import { ref, computed } from 'vue';
import { getCards } from '@/services/cardService';
import { getCategories } from '@/services/categoryService';
import { getStoredDailyQuizSession } from '@/services/quizService';
import { UNCATEGORIZED_ID } from '@/constants/category';
import type { Card, Category, CategoryView } from '@/types/card';
import type { StatsResult } from '@/types/common';
import type { DailyQuizSession } from '@/types/quiz';

export default function useCategoryView() {
  const categoryList = ref<Category[]>([]);
  const cardList = ref<Card[]>([]);
  const quizSession = ref<DailyQuizSession | null>(null);

  function loadCards() {
    const res = getCards();
    if (res.success && res.data) {
      cardList.value = res.data.list;
    } else {
      cardList.value = [];
      uni.showToast({
        title: res.message || '加载卡片失败',
        icon: 'none',
      });
    }
  }

  function loadCategories() {
    const res = getCategories();
    if (res.success && res.data) {
      categoryList.value = res.data;
    } else {
      categoryList.value = [];
      uni.showToast({
        title: res.message || '加载分类失败',
        icon: 'none',
      });
    }
  }

  function getDailyQuizData() {
    return getStoredDailyQuizSession();
  }

  function loadAllData() {
    loadCards();
    loadCategories();
    quizSession.value = getDailyQuizData();
  }

  // 创建一个映射，统计每个分类的卡片数量，格式为 { [categoryId]: count }
  function createCardCountMap(cards: Card[]) {
    const countMap: Record<string, number> = {};

    cards.forEach((card) => {
      const currentCount = countMap[card.categoryId] ?? 0;
      // 如果出现这个分类ID，表示有一条该分类的卡片，累加一次
      countMap[card.categoryId] = currentCount + 1;
    });

    return countMap;
  }

  const cardCountMap = computed(() => createCardCountMap(cardList.value));

  // 计算分类视图列表，包含每个分类的卡片数量和是否可编辑/删除等属性
  const categoryViewList = computed<CategoryView[]>(() => {
    return categoryList.value
      .map((category) => {
        const cardCount = cardCountMap.value[category.id] ?? 0;
        const isUncategorized = category.id === UNCATEGORIZED_ID;

        return {
          ...category,
          cardCount,
          canEdit: !isUncategorized,
          canDelete: !isUncategorized,
          visible: !(isUncategorized && cardCount === 0),
        };
      })
      .filter((category) => category.visible);
  });

  function getAnsweredCount(session: DailyQuizSession | null) {
    if (!session) {
      return 0;
    }

    return session.finished ? session.queue.length : session.currentIndex;
  }

  function getWindowStart(days: number) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - (days - 1));
    return start.getTime();
  }

  function countCardsByTime(
    cards: Card[],
    field: 'createdAt' | 'contentUpdatedAt' | 'statusUpdatedAt' | 'masteredAt',
    start: number,
    end: number,
  ) {
    return cards.filter((card) => {
      const value = card[field];
      return typeof value === 'number' && value >= start && value <= end;
    }).length;
  }

  // 计算统计数据
  const stats = computed<StatsResult>(() => {
    const total = cardList.value.length;
    const mastered = cardList.value.filter((card) => card.status === 'mastered').length;
    const fuzzy = cardList.value.filter((card) => card.status === 'fuzzy').length;
    const unknown = cardList.value.filter((card) => card.status === 'unknown').length;
    const dailyQuizLimit = quizSession.value?.limit ?? 0;
    const dailyQuizCurrentIndex = getAnsweredCount(quizSession.value);

    const categoryStats: StatsResult['categoryStats'] = {};
    categoryList.value.forEach((category) => {
      const categoryCards = cardList.value.filter((card) => card.categoryId === category.id);
      categoryStats[category.id] = {
        total: categoryCards.length,
        mastered: categoryCards.filter((card) => card.status === 'mastered').length,
        fuzzy: categoryCards.filter((card) => card.status === 'fuzzy').length,
        unknown: categoryCards.filter((card) => card.status === 'unknown').length,
      };
    });

    const now = Date.now();
    const todayStart = getWindowStart(1);
    const day7Start = getWindowStart(7);
    const day30Start = getWindowStart(30);
    const dailyPractice = countCardsByTime(cardList.value, 'statusUpdatedAt', todayStart, now);
    const dailyMastered = countCardsByTime(cardList.value, 'masteredAt', todayStart, now);

    const day7Stats = {
      added: countCardsByTime(cardList.value, 'createdAt', day7Start, now),
      updated: countCardsByTime(cardList.value, 'contentUpdatedAt', day7Start, now),
      practice: countCardsByTime(cardList.value, 'statusUpdatedAt', day7Start, now),
      mastered: countCardsByTime(cardList.value, 'masteredAt', day7Start, now),
    };

    const day30Stats = {
      added: countCardsByTime(cardList.value, 'createdAt', day30Start, now),
      updated: countCardsByTime(cardList.value, 'contentUpdatedAt', day30Start, now),
      practice: countCardsByTime(cardList.value, 'statusUpdatedAt', day30Start, now),
      mastered: countCardsByTime(cardList.value, 'masteredAt', day30Start, now),
    };

    const activityStats = {
      '7day': day7Stats,
      '30day': day30Stats,
    };

    return {
      total,
      mastered,
      fuzzy,
      unknown,
      dailyQuizLimit,
      dailyQuizCurrentIndex,
      dailyStudied: dailyPractice,
      dailyMastered,
      categoryStats,
      activityStats,
    };
  });
  return {
    categoryList,
    cardList,
    categoryViewList,
    stats,
    loadCategories,
    loadCards,
    loadAllData,
  };
}
