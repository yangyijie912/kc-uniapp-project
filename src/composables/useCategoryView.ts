// 分类页展示逻辑
import type { Card, CategoryView } from '@/types/card';
import { getCards } from '@/services/cardService';
import { getCategories, uncategorizedId } from '@/services/categoryService';
import { ref } from 'vue';

export default function useCategoryView() {
  const categoryList = ref<CategoryView[]>([]);
  const cardList = ref<Card[]>([]);

  function loadCards() {
    cardList.value = getCards();
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

  // 加载分类数据并计算每个分类的卡片数量
  function loadCategoryViews() {
    loadCards();
    const res = getCategories();

    if (res.success && res.data) {
      const categories = res.data;
      const countMap = createCardCountMap(cardList.value);

      categoryList.value = categories
        .map((category) => {
          const cardCount = countMap[category.id] ?? 0;
          const isUncategorized = category.id === uncategorizedId;

          return {
            ...category,
            cardCount,
            canEdit: !isUncategorized,
            canDelete: !isUncategorized,
            visible: !(isUncategorized && cardCount === 0),
          };
        })
        .filter((category) => category.visible); // 只保留可见的分类

      return;
    } else {
      categoryList.value = [];
      uni.showToast({
        title: res.message || '加载分类失败',
        icon: 'none',
      });
    }
  }

  return {
    categoryList,
    cardList,
    loadCategoryViews,
    loadCards,
  };
}
