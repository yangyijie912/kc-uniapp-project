/**
 * 处理卡片列表视图的逻辑
 */

import { ref, computed } from 'vue';
import { getCards } from '@/services/cardService';
import { getCategories } from '@/services/categoryService';
import type { Card, Category, CardView } from '@/types/card';
import { cardStatusTextMap } from '@/constants/cardStatus';

type CardQueryParams = Partial<Card> & {
  keyword?: string;
};

export default function useCardListView() {
  const cardList = ref<Card[]>([]);
  const categoryList = ref<Category[]>([]);
  const queryParams = ref<CardQueryParams>({});
  let categoryNameById: Map<string, string> = new Map();

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
      categoryNameById = new Map(res.data.map((category) => [category.id, category.name]));
    } else {
      categoryList.value = [];
      categoryNameById = new Map();
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
    return cardList.value.map((card) => ({
      ...card,
      categoryName: categoryNameById.get(card.categoryId),
      statusName: card.status ? cardStatusTextMap[card.status] : undefined,
    }));
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
