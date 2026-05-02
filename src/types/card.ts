export type CardStatus = 'unknown' | 'fuzzy' | 'mastered';

export interface Category {
  id: string;
  name: string;
  sort: number;
  isSystem?: boolean;
}

// 定义一个类型来表示原始的卡片数据结构
export type RawCard = {
  id: string;
  categoryId?: string;
  category?: string;
  question: string;
  answer: string;
  content?: string;
  tags?: string[];
  status?: Card['status'];
  createdAt?: number;
  updatedAt?: number;
  sort?: number;
};

export interface Card {
  id: string;
  categoryId: string;
  question: string;
  answer: string;
  content?: string;
  tags?: string[];
  status?: CardStatus;
  createdAt: number;
  updatedAt: number;
  sort: number;
}

export interface CategoryView extends Category {
  cardCount: number;
  canEdit: boolean;
  canDelete: boolean;
  visible: boolean;
}

export interface CardView extends Card {
  categoryName?: string;
  statusName?: string;
}

export type CardSortBy = 'createdAt' | 'updatedAt' | 'customSort';

export type SortOrder = 'asc' | 'desc';

export interface CardSortConfig {
  sortBy: CardSortBy;
  order?: SortOrder;
}

export type Move = {
  movedId: string;
  anchorId: string;
  position: 'before' | 'after';
};

// 卡片列表的交互模式
export type InteractionMode = 'browse' | 'select' | 'sort';
