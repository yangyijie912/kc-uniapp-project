// 分类页展示逻辑
import type { Card, Category, CategoryView } from '@/types/card';
import { getCards } from '@/services/cardService';
import { getCategories } from '@/services/categoryService';
import { ref, computed } from 'vue';
import { UNCATEGORIZED_ID } from '@/constants/category';

export default function useCategoryView() {
  const categoryList = ref<Category[]>([]);
  const cardList = ref<Card[]>([]);

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

  function loadAllData() {
    loadCards();
    loadCategories();
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

  return {
    categoryList,
    cardList,
    categoryViewList,
    loadCategories,
    loadCards,
    loadAllData,
  };
}
