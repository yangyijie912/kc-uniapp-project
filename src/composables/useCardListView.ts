/**
 * 处理卡片列表视图的逻辑
 */

import { ref, computed } from 'vue';
import { getCards } from '@/services/cardService';
import { getCategories } from '@/services/categoryService';
import type { Card, Category, CardView } from '@/types/card';
import { toCardViews } from '@/utils/cardView';

type CardQueryParams = Partial<Card> & {
  keyword?: string;
  page?: number;
  pageSize?: number;
};

export default function useCardListView() {
  const cardList = ref<Card[]>([]);
  const categoryList = ref<Category[]>([]);
  const loading = ref(false);
  const total = ref(0);
  const hasMore = ref(true);

  const loadCards = (params?: CardQueryParams) => {
    if (loading.value) return;
    loading.value = true;

    // 这里维护的是“当前已加载出来的前 N 条”，用于无限滚动显示；
    // 它不是某个分类下的全量卡片集合，服务层保存排序时不能直接拿它当全量基线。
    const res = getCards({
      ...params,
      page: 1,
      pageSize: (params?.pageSize || 10) * (params?.page || 1),
    });
    if (res.success && res.data) {
      total.value = res.data.total;
      hasMore.value = res.data.page * res.data.pageSize < res.data.total;
      //   cardList.value = append ? [...cardList.value, ...res.data.list] : res.data.list;
      cardList.value = res.data.list;
    } else {
      cardList.value = [];
      uni.showToast({
        title: res.message || '加载数据失败',
        icon: 'none',
      });
    }

    loading.value = false;
  };

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

  function loadAllData(params?: CardQueryParams) {
    loadCards(params);
    loadCategories();
  }

  const cardViewList = computed<CardView[]>(() => {
    return toCardViews(cardList.value, categoryList.value);
  });

  return {
    loading,
    hasMore,
    total,
    cardList,
    categoryList,
    cardViewList,
    loadCards,
    loadCategories,
    loadAllData,
  };
}
