// 定义卡片状态的相关类型
export type CardStatusMap = {
  unknown: {
    code: 0;
    label: '未知';
  };
  fuzzy: {
    code: 1;
    label: '模糊';
  };
  mastered: {
    code: 2;
    label: '掌握';
  };
};

export type CardStatus = keyof CardStatusMap;
export type CardStatusCode = CardStatusMap[CardStatus]['code'];
export type CardStatusLabel = CardStatusMap[CardStatus]['label'];

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
  status?: CardStatus;
  createdAt?: number;
  updatedAt?: number;
  statusUpdatedAt?: number;
  masteredAt?: number;
  contentUpdatedAt?: number;
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
  statusUpdatedAt?: number; // 记录状态最后一次更新的时间戳
  masteredAt?: number; // 记录卡片被标记为已掌握的时间戳
  contentUpdatedAt?: number; // 记录内容最后一次更新的时间戳
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

export type CardSortBy = 'createdAt' | 'updatedAt' | 'contentUpdatedAt' | 'customSort';

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

// 卡片的每日学习状态统计数据结构
export type DailyLearningStats = {
  date: string; // 最多保留60天
  practicedCardIds: string[]; // 存储不去重，下同。需要去重再根据业务手动去重
  practiceStatuses: CardStatusCode[]; // 与 practicedCardIds 一一对应，记录每次练习的状态，存储用数字表示，减少存储空间
};
