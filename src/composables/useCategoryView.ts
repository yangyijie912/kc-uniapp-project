// 分类页展示逻辑
import type { Card, Category, CategoryView } from '@/types/card';
import { getCards } from '@/services/cardService';
import { getCategories, uncategorizedId } from '@/services/categoryService';
import { ref, computed } from 'vue';

export default function useCategoryView() {
  const categoryList = ref<Category[]>([]);
  const cardList = ref<Card[]>([]);

  function loadCards() {
    cardList.value = getCards();
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

  // 计算每个分类的卡片数量，建立一个映射，告诉Vue卡片数量依赖于当前的卡片列表
  //   const cardCountMap = computed(() => createCardCountMap(cardList.value));

  // 计算分类视图列表，包含每个分类的卡片数量和是否可编辑/删除等属性
  const categoryViewList = computed<CategoryView[]>(() => {
    return categoryList.value
      .map((category) => {
        const cardCount = createCardCountMap(cardList.value)[category.id] ?? 0;
        const isUncategorized = category.id === uncategorizedId;

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
