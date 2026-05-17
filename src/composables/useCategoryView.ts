// 分类页展示逻辑和数据处理的组合式函数
import { ref, computed } from 'vue';
import { getCards } from '@/services/cardService';
import { getCategories } from '@/services/categoryService';
import { UNCATEGORIZED_ID } from '@/constants/category';
import type { Card, Category, CategoryView } from '@/types/card';

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
      .map((category, idx) => {
        const cardCount = cardCountMap.value[category.id] ?? 0;
        const isUncategorized = category.id === UNCATEGORIZED_ID;

        // 视图层统一裁剪未分类的交互能力，页面只消费这里的结果，不再自己判断系统 ID。
        const prev = categoryList.value[idx - 1];
        const next = categoryList.value[idx + 1];
        const canEdit = !isUncategorized && !category.isSystem;
        const canDelete = !isUncategorized && !category.isSystem;
        const canMoveUp = Boolean(
          canEdit && !isUncategorized && prev && prev.id !== UNCATEGORIZED_ID,
        );
        const canMoveDown = Boolean(
          canEdit && !isUncategorized && next && next.id !== UNCATEGORIZED_ID,
        );

        return {
          ...category,
          cardCount,
          canEdit,
          canDelete,
          canMoveUp,
          canMoveDown,
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
