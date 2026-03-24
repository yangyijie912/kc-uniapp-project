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
};

export default function useCardListView() {
  const cardList = ref<Card[]>([]);
  const categoryList = ref<Category[]>([]);
  const queryParams = ref<CardQueryParams>({});

  function setQueryParams(params: Partial<CardQueryParams>) {
    // 更新查询参数，合并新的参数到现有的查询参数中
    queryParams.value = {
      ...queryParams.value,
      ...params,
    };
  }

  const loadCards = () => {
    const res = getCards(queryParams.value);
    if (res.success && res.data) {
      cardList.value = res.data;
    } else {
      cardList.value = [];
      uni.showToast({
        title: res.message || '加载数据失败',
        icon: 'none',
      });
    }
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

  function loadAllData() {
    loadCards();
    loadCategories();
  }

  const cardViewList = computed<CardView[]>(() => {
    return toCardViews(cardList.value, categoryList.value);
  });

  return {
    cardList,
    categoryList,
    cardViewList,
    setQueryParams,
    loadCards,
    loadCategories,
    loadAllData,
  };
}
