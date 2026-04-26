import type { CardSortConfig } from '@/types/card';

export const CARD_SORT_OPTIONS: Array<{ label: string; value: CardSortConfig }> = [
  {
    label: '自定义排序',
    value: {
      sortBy: 'customSort',
    },
  },
  {
    label: '创建时间升序',
    value: {
      sortBy: 'createdAt',
      order: 'asc',
    },
  },
  {
    label: '创建时间降序',
    value: {
      sortBy: 'createdAt',
      order: 'desc',
    },
  },
  {
    label: '更新时间升序',
    value: {
      sortBy: 'updatedAt',
      order: 'asc',
    },
  },
  {
    label: '更新时间降序',
    value: {
      sortBy: 'updatedAt',
      order: 'desc',
    },
  },
];
