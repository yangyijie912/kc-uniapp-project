import type { Card, Category, CardSortBy, SortOrder } from '../types/card';

const getSafeNumber = (value: unknown, fallback = Number.MAX_SAFE_INTEGER): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const compareNumber = (a: number, b: number, order: SortOrder = 'asc'): number => {
  return order === 'asc' ? a - b : b - a;
};

export const sortCards = (
  cards: Card[],
  sortBy: CardSortBy,
  order: SortOrder = 'asc',
  categories: Category[] = [],
): Card[] => {
  if (sortBy === 'customSort') {
    return sortCardsByCategoryAndSort(cards, categories);
  }

  return [...cards].sort((a, b) => {
    const aValue = getSafeNumber(a[sortBy], 0);
    const bValue = getSafeNumber(b[sortBy], 0);

    const result = compareNumber(aValue, bValue, order);

    if (result !== 0) {
      return result;
    }

    return getSafeNumber(a.createdAt, 0) - getSafeNumber(b.createdAt, 0);
  });
};

// 先按分类 sort 排，再按卡片内部 sort 排
export const sortCardsByCategoryAndSort = (cards: Card[], categories: Category[]): Card[] => {
  const categorySortMap = new Map(
    categories.map((category) => [category.id, getSafeNumber(category.sort)]),
  );

  return [...cards].sort((a, b) => {
    const aCategorySort = categorySortMap.get(a.categoryId) ?? Number.MAX_SAFE_INTEGER;
    const bCategorySort = categorySortMap.get(b.categoryId) ?? Number.MAX_SAFE_INTEGER;
    // 先按分类排序
    if (aCategorySort !== bCategorySort) {
      return aCategorySort - bCategorySort;
    }
    // 分类相同则按卡片的sort排序
    const aCardSort = getSafeNumber(a.sort);
    const bCardSort = getSafeNumber(b.sort);

    if (aCardSort !== bCardSort) {
      return aCardSort - bCardSort;
    }
    // sort相同按创建时间排
    return getSafeNumber(a.createdAt, 0) - getSafeNumber(b.createdAt, 0);
  });
};
