// 分类页展示逻辑
import type { Card, CategoryView } from '@/types/card';
import { getCards } from '@/services/cardService';
import { getCategories, uncategorizedId } from '@/services/categoryService';
import { ref } from 'vue';

export default function useCategoryView() {
  const categoryList = ref<CategoryView[]>([]);
  const cardList = ref<Card[]>([]);

  function loadCards() {
    const cards = getCards();
    cardList.value = cards;
  }

  // 加载分类数据并计算每个分类的卡片数量
  function loadCategoryViews() {
    // 加载数据
    loadCards();
    const res = getCategories();
    if (res.success && res.data) {
      const categories = res.data;
      categoryList.value = categories
        .map((category) => {
          const cardCount = cardList.value.filter((card) => card.categoryId === category.id).length;
          const visible = !(category.id === uncategorizedId && cardCount === 0); // 如果是未分类且没有卡片，则隐藏
          return {
            ...category,
            // 计算每个分类的卡片数量
            cardCount,
            // 固定的未分类不可以编辑和删除
            canEdit: category.id !== uncategorizedId,
            canDelete: category.id !== uncategorizedId,
            // 如果是未分类且没有卡片，则隐藏
            visible,
          };
        })
        .filter((category) => category.visible); // 只保留可见的分类
    } else {
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
