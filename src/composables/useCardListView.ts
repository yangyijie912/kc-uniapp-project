/**
 * 处理卡片列表视图的逻辑
 */

import { ref, computed } from 'vue';
import { getCards } from '@/services/cardService';
import { getCategories } from '@/services/categoryService';
import type { Card, Category, CardView } from '@/types/card';
import type { PageResult } from '@/types/common';
import { toCardViews } from '@/utils/cardView';

type CardQueryParams = Partial<Card> & {
  keyword?: string;
  page?: number;
  pageSize?: number;
};

export default function useCardListView() {
  const cardList = ref<Card[]>([]);
  const categoryList = ref<Category[]>([]);
  const queryParams = ref<CardQueryParams>({
    page: 1,
    pageSize: 10,
  });

  const total = ref(0);
  const loading = ref(false);
  const hasMore = ref(true);

  function setQueryParams(params: Partial<CardQueryParams>) {
    // 更新查询参数，合并新的参数到现有的查询参数中
    queryParams.value = {
      ...queryParams.value,
      ...params,
    };
  }

  const loadCards = (append = false) => {
    if (loading.value) return;
    loading.value = true;
    const res = getCards(queryParams.value);
    if (res.success && res.data) {
      const pageData = res.data as PageResult<Card>;
      total.value = pageData.total;
      hasMore.value = pageData.page * pageData.pageSize < pageData.total;
      cardList.value = append ? [...cardList.value, ...pageData.list] : pageData.list;
    } else {
      if (!append) {
        cardList.value = [];
      }
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

  function loadAllData() {
    loadCards();
    loadCategories();
  }

  function loadNextPage() {
    if (!hasMore.value || loading.value) return;
    queryParams.value.page = (queryParams.value.page ?? 1) + 1;
    loadCards(true);
  }

  const cardViewList = computed<CardView[]>(() => {
    return toCardViews(cardList.value, categoryList.value);
  });

  return {
    loading,
    hasMore,
    cardList,
    categoryList,
    cardViewList,
    setQueryParams,
    loadCards,
    loadCategories,
    loadAllData,
    loadNextPage,
  };
}
