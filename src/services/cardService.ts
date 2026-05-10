import cards from '@/data/cards.json';
import categories from '@/data/category.json';
import { UNCATEGORIZED_ID } from '@/constants/category';
import {
  CATEGORY_STORAGE_KEY,
  CARD_STORAGE_KEY,
  DAILY_LEARNING_STATS_KEY,
} from '@/constants/storageKeys';
import { SORT_STEP } from '@/constants/sortConfig';
import { CARD_STATUS_TO_CODE } from '@/constants/cardStatus';
import type {
  Card,
  Category,
  RawCard,
  CardSortConfig,
  Move,
  DailyLearningStats,
  CardStatus,
  CardStatusCode,
} from '@/types/card';
import type { ServiceResult } from '@/types/service';
import type { PageResult, StatsResult } from '@/types/common';
import { success, fail } from './serviceHelper';
import { generateUUID } from '@/utils/uuid';
import { sortCards } from '@/utils/cardSort';
import { getStoredDailyQuizSession } from '@/utils/storage';
import { getDateKey, getTimestampDaysAgo, dateKeyToTimestamp } from '@/utils/date';

const defaultCategories = categories as Category[];

// 默认种子数据/历史数据迁移时把分类名映射成分类 ID，后续新增的卡片和正常导入的卡片都会有分类ID，业务主路径不依赖它
const defaultCategoryIdByName = new Map(
  defaultCategories.map((category) => [category.name, category.id]),
);

type CategorySortCache = {
  snapshot: string;
  categories: Category[];
};

// 同一份分类存储在查询期间不会频繁变化，所以这里缓存一份可用于排序的快照。
type CardQueryCache = {
  version: number;
  signature: string; // 基于查询参数构建的签名，用来判断能不能复用这个缓存结果
  result: Card[];
};

// 这个版本号用来判断卡片数据有没有发生写入变化，写入后需要让查询缓存失效。
let cardDataVersion = 0;
// 分类排序缓存，避免每次取卡片都重复读分类 storage。
let categorySortCache: CategorySortCache | null = null;
// 卡片查询缓存，同一组筛选和排序条件重复翻页时直接复用结果。
let cardQueryCache: CardQueryCache | null = null;
// 每日最大学习状态统计天数，超过这个天数的统计数据会被丢弃，避免占用过多存储空间。
const MAX_DAILY_LEARNING_STATS_DAYS = 60;

// 复制分类对象，防止外部修改影响缓存里的原始数据。
function cloneCategory(category: Category): Category {
  return { ...category };
}

// 别只拿静态的 category.json 做分类顺序基准，而是使用当前实际存储的分类顺序
function loadCategoriesForSort(): CategorySortCache {
  const saved = uni.getStorageSync(CATEGORY_STORAGE_KEY);
  const snapshot = saved || '__empty__';

  if (categorySortCache && categorySortCache.snapshot === snapshot) {
    return {
      snapshot: categorySortCache.snapshot,
      categories: categorySortCache.categories.map(cloneCategory),
    };
  }

  if (!saved) {
    const nextCache = {
      snapshot,
      categories: [...defaultCategories],
    };
    categorySortCache = nextCache;
    return {
      snapshot: nextCache.snapshot,
      categories: nextCache.categories.map(cloneCategory),
    };
  }

  try {
    const savedList = JSON.parse(saved) as Category[];
    // 如果解析失败或者数据不合法，就回退成默认分类列表，避免整个卡片查询功能都受影响。
    if (!Array.isArray(savedList) || savedList.length === 0) {
      const nextCache = {
        snapshot,
        categories: [...defaultCategories],
      };
      categorySortCache = nextCache;
      return {
        snapshot: nextCache.snapshot,
        categories: nextCache.categories.map(cloneCategory),
      };
    }
    // 正常解析到合法的分类列表，缓存起来供排序使用。
    const nextCache = {
      snapshot,
      categories: savedList.map(cloneCategory),
    };
    categorySortCache = nextCache;
    return {
      snapshot: nextCache.snapshot,
      categories: nextCache.categories.map(cloneCategory),
    };
  } catch {
    const nextCache = {
      snapshot,
      categories: [...defaultCategories],
    };
    categorySortCache = nextCache;
    return {
      snapshot: nextCache.snapshot,
      categories: nextCache.categories.map(cloneCategory),
    };
  }
}

// 只把静态默认卡片映射成可存储的 categoryId，不处理导入时的分类冲突。
function resolveDefaultCategoryId(rawCard: RawCard): string {
  const rawCategoryName = rawCard.category?.trim();

  if (rawCategoryName) {
    const categoryId = defaultCategoryIdByName.get(rawCategoryName);
    if (categoryId) {
      return categoryId;
    }
  }

  if (rawCard.categoryId) {
    return rawCard.categoryId;
  }

  return UNCATEGORIZED_ID;
}

// 清洗标签数据，去除空字符串和重复项
function normalizeTags(tags?: string[]): string[] | undefined {
  // 使用 Set 来去重，同时保持原有的顺序
  const tagSet = new Set<string>();
  (tags ?? []).forEach((tag) => {
    const normalizedTag = tag.trim();
    if (normalizedTag) {
      tagSet.add(normalizedTag);
    }
  });
  if (tagSet.size === 0) {
    return undefined;
  }
  // 将 Set 转换回数组，并返回
  return Array.from(tagSet);
}

// 清洗卡片数据，确保每个字段都符合预期的格式
function normalizeCard(card: Card): Card {
  return {
    id: card.id,
    categoryId: card.categoryId || UNCATEGORIZED_ID,
    question: card.question,
    answer: card.answer,
    content: card.content,
    tags: normalizeTags(card.tags),
    status: card.status,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
    statusUpdatedAt: card.statusUpdatedAt,
    masteredAt: card.masteredAt,
    contentUpdatedAt: card.contentUpdatedAt,
    sort: card.sort,
  };
}

// 将原始卡片数据转换为Card类型
function toCard(rawCard: RawCard): Card {
  const categoryId = resolveDefaultCategoryId(rawCard);

  const createdAt = Date.now();

  return {
    id: rawCard.id,
    categoryId,
    question: rawCard.question,
    answer: rawCard.answer,
    content: rawCard.content,
    tags: normalizeTags(rawCard.tags),
    status: rawCard.status,
    createdAt: rawCard?.createdAt ?? createdAt,
    updatedAt: rawCard?.updatedAt ?? createdAt,
    statusUpdatedAt: rawCard?.statusUpdatedAt,
    masteredAt: rawCard?.masteredAt,
    contentUpdatedAt: rawCard?.contentUpdatedAt,
    sort: rawCard?.sort ?? Number.MAX_SAFE_INTEGER,
  };
}

// 默认的卡片列表，从静态数据文件加载
const defaultCards: Card[] = (cards as RawCard[]).map((rawCard) => toCard(rawCard));
const defaultCardById = new Map(defaultCards.map((card) => [card.id, cloneCard(card)]));

// 当前的卡片列表，后续会从本地存储加载或使用默认卡片
let cardList: Card[] = [];

// 克隆一个卡片对象，确保外部修改不会影响内部数据
function cloneCard(card: Card): Card {
  return {
    ...card,
    tags: card.tags ? [...card.tags] : undefined,
  };
}

// 对已经存在于本地 storage 的旧卡片做轻量迁移：只补齐缺失的 tags，避免覆盖用户自行编辑过的数据。
function mergeMissingCardFields(card: Card): Card {
  const defaultCard = defaultCardById.get(card.id);

  if (!defaultCard) {
    return normalizeCard(card);
  }

  return normalizeCard({
    ...card,
    categoryId: card.categoryId || defaultCard.categoryId,
    tags: card.tags && card.tags.length > 0 ? card.tags : defaultCard.tags,
  });
}

// 从本地存储加载卡片列表，如果没有则使用默认卡片，并保存到本地存储
function loadCardsFromStorage(): Card[] {
  // 已经加载过了就直接返回，避免重复解析和克隆
  if (cardList.length > 0) {
    return cardList.map(cloneCard);
  }

  const saved = uni.getStorageSync(CARD_STORAGE_KEY);
  if (saved) {
    const savedCards = JSON.parse(saved) as Card[];
    const normalizedCards = savedCards.map(mergeMissingCardFields);
    saveCardsToStorage(normalizedCards);
    return normalizedCards.map(cloneCard);
  } else {
    saveCardsToStorage(defaultCards); // 保存默认卡片到本地存储
    return defaultCards.map(cloneCard);
  }
}

// 保存整个卡片列表到本地存储
function saveCardsToStorage(list: Card[]) {
  const normalizedList = list.map(normalizeCard);
  uni.setStorageSync(CARD_STORAGE_KEY, JSON.stringify(normalizedList));
  cardList = normalizedList.map(cloneCard);
  // 卡片数据发生了写入变化，更新版本号让查询缓存失效。
  cardDataVersion += 1;
  cardQueryCache = null;
}

// 从本地存储加载日常学习状态统计数据，如果没有则返回空数组
export function loadDailyLearningStats(): DailyLearningStats[] {
  const saved = uni.getStorageSync(DAILY_LEARNING_STATS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved) as DailyLearningStats[];
    } catch {
      return [];
    }
  }
  return [];
}

// 保存日常学习状态统计数据到本地存储，按日期排序后只保留一定日期的天数
export function saveDailyLearningStats(stats: DailyLearningStats[]) {
  const trimmedStats = [...stats]
    .sort((left, right) => dateKeyToTimestamp(left.date) - dateKeyToTimestamp(right.date))
    .slice(-MAX_DAILY_LEARNING_STATS_DAYS);
  uni.setStorageSync(DAILY_LEARNING_STATS_KEY, JSON.stringify(trimmedStats));
}

function hasOwnField<T extends object>(target: T, key: keyof T) {
  return Object.prototype.hasOwnProperty.call(target, key);
}

function shouldUpdateContentTimestamp(updates: Partial<Card>) {
  return (
    hasOwnField(updates, 'content') ||
    hasOwnField(updates, 'question') ||
    hasOwnField(updates, 'answer') ||
    hasOwnField(updates, 'tags')
  );
}

loadCardsFromStorage();

type CardQueryParams = Partial<Card> & {
  keyword?: string;
  page?: number;
  pageSize?: number;
  cardSortConfig?: CardSortConfig;
};

// 把查询条件拼成稳定的签名，用来判断这次查询能不能直接复用缓存结果。
function buildCardQuerySignature(params: {
  keyword?: string;
  filters: Partial<Card>;
  sortBy: CardSortConfig['sortBy'];
  order: CardSortConfig['order'];
  categorySnapshot: string;
}): string {
  const filterEntries = Object.entries(params.filters)
    .filter(([, value]) => value !== undefined)
    .sort(([key1], [key2]) => key1.localeCompare(key2));

  return [
    `keyword:${params.keyword || ''}`,
    `sortBy:${params.sortBy}`,
    `order:${params.order || 'asc'}`,
    `categorySnapshot:${params.categorySnapshot}`,
    ...filterEntries.map(([key, value]) => `${key}:${String(value)}`),
  ].join('|');
}

// 先做过滤，再做排序；这个结果会被缓存，给下拉翻页直接复用。
function getMatchedCards(params: CardQueryParams): Card[] {
  const { keyword, page, pageSize, cardSortConfig, ...filters } = params;
  const normalizedKeyword = keyword?.trim().toLowerCase();
  const defaultSortConfig: CardSortConfig = {
    sortBy: 'customSort',
    order: 'asc',
  };
  const { sortBy, order } = cardSortConfig || defaultSortConfig;
  const categorySortState = loadCategoriesForSort();
  // 构建查询签名，判断能不能复用缓存结果。
  const querySignature = buildCardQuerySignature({
    keyword: normalizedKeyword,
    filters,
    sortBy,
    order,
    categorySnapshot: categorySortState.snapshot,
  });
  // 如果缓存的版本和签名都匹配，就直接复用缓存结果，避免重复过滤和排序。
  if (
    cardQueryCache &&
    cardQueryCache.version === cardDataVersion &&
    cardQueryCache.signature === querySignature
  ) {
    return cardQueryCache.result;
  }

  const currentList = loadCardsFromStorage();
  const filteredList = currentList.filter((card) => {
    // 关键词查询，匹配题目、答案、内容和标签，模糊匹配不区分大小写。
    if (normalizedKeyword) {
      const matchKeyword =
        card.question.toLowerCase().includes(normalizedKeyword) ||
        card.answer.toLowerCase().includes(normalizedKeyword) ||
        card.content?.toLowerCase().includes(normalizedKeyword) ||
        card.tags?.some((tag) => tag.toLowerCase().includes(normalizedKeyword));

      if (!matchKeyword) return false;
    }
    // 精准过滤，如果参数中有这个字段，并且卡片的对应字段不等于这个值，则过滤掉这个卡片
    for (const key of Object.keys(filters) as Array<keyof Card>) {
      const value = filters[key];

      if (value !== undefined && card[key] !== value) {
        return false;
      }
    }

    return true;
  });

  // 对过滤后的结果进行排序，得到最终的查询结果。
  const sortedList = sortCards(filteredList, sortBy, order, categorySortState.categories);
  cardQueryCache = {
    version: cardDataVersion,
    signature: querySignature,
    result: sortedList,
  };

  return sortedList;
}

// 根据参数获取卡片
export function getCards(params?: CardQueryParams): ServiceResult<PageResult<Card>> {
  const currentList = loadCardsFromStorage();
  if (!params) {
    return success({
      list: currentList.map(cloneCard),
      total: currentList.length,
      page: 1,
      pageSize: currentList.length,
    });
  }
  const { page = 1, pageSize } = params;
  const result = getMatchedCards(params);

  let paginatedResult = result;
  // 分页计算
  if (page && pageSize) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    paginatedResult = result.slice(start, end);
  }

  return success({
    list: paginatedResult.map(cloneCard),
    total: result.length,
    page,
    pageSize: pageSize ?? result.length,
  });
}

// 根据 id 获取单个卡片
export function getCardById(id: string): ServiceResult<Card | undefined> {
  const currentList = loadCardsFromStorage();
  const card = currentList.find((item) => item.id === id);
  return card ? success(cloneCard(card)) : fail('题目未找到');
}

// 添加新卡片
export function addCard(
  card: Omit<
    Card,
    | 'id'
    | 'createdAt'
    | 'updatedAt'
    | 'statusUpdatedAt'
    | 'masteredAt'
    | 'contentUpdatedAt'
    | 'sort'
  >,
): ServiceResult<Card> {
  const currentList = loadCardsFromStorage();
  const createdAt = Date.now();
  const newCard: Card = {
    id: generateUUID(),
    ...card,
    createdAt,
    updatedAt: createdAt,
    sort: currentList.length > 0 ? (currentList.length + 1) * SORT_STEP : SORT_STEP,
  };
  const updatedList = [...currentList, newCard];
  saveCardsToStorage(updatedList);
  return success(cloneCard(newCard));
}

// 更新卡片
export function updateCard(updates: Partial<Card>): ServiceResult<Card> {
  const currentList = loadCardsFromStorage();
  const index = currentList.findIndex((item) => item.id === updates.id);
  if (index === -1) {
    return fail('题目未找到');
  }
  const now = Date.now();
  // 如果包含状态更新，更新statusUpdatedAt和masteredAt字段
  if (hasOwnField(updates, 'status') && updates.status) {
    updates.statusUpdatedAt = now;
    if (updates.status === 'mastered') {
      updates.masteredAt = now;
    }
  }
  // 如果包含内容更新，更新contentUpdatedAt字段
  if (shouldUpdateContentTimestamp(updates)) {
    updates.contentUpdatedAt = now;
  }
  const updatedCard: Card = {
    ...currentList[index],
    ...updates,
    updatedAt: now,
  };
  const updatedList = [...currentList];
  updatedList[index] = updatedCard;
  saveCardsToStorage(updatedList);
  return success(cloneCard(updatedCard));
}

// 测验时更新卡片状态并记更新DailyLearningStats
export function updateDailyLearningStats(cardId: string, status: CardStatus): ServiceResult<Card> {
  const currentList = loadCardsFromStorage();
  const index = currentList.findIndex((item) => item.id === cardId);
  if (index === -1) {
    return fail('题目未找到');
  }
  const now = Date.now();
  const updatedCard: Card = {
    ...currentList[index],
    status,
    statusUpdatedAt: now,
    masteredAt: status === 'mastered' ? now : currentList[index].masteredAt,
    updatedAt: now,
  };
  const updatedList = [...currentList];
  updatedList[index] = updatedCard;

  // 更新卡片的同时更新每日学习状态统计数据
  const dailyStats = loadDailyLearningStats();
  const todayKey = getDateKey(new Date(now));
  const todayStatsIndex = dailyStats.findIndex((stats) => stats.date === todayKey);
  if (todayStatsIndex !== -1) {
    const todayStats = dailyStats[todayStatsIndex];
    todayStats.practicedCardIds.push(cardId);
    todayStats.practiceStatuses.push(CARD_STATUS_TO_CODE[status]);
    dailyStats[todayStatsIndex] = todayStats;
  } else {
    dailyStats.push({
      date: todayKey,
      practicedCardIds: [cardId],
      practiceStatuses: [CARD_STATUS_TO_CODE[status]],
    });
  }

  saveDailyLearningStats(dailyStats);
  saveCardsToStorage(updatedList);
  return success(cloneCard(updatedCard));
}

// 批量更新卡片
export function batchUpdateCards(ids: string[], patch: Partial<Card>): ServiceResult<null> {
  const currentList = loadCardsFromStorage();
  // 先检查所有 id 是否都存在
  for (const id of ids) {
    if (!currentList.some((item) => item.id === id)) {
      return fail(`题目 ID ${id} 未找到，无法批量更新`);
    }
  }
  ids.forEach((id) => {
    const index = currentList.findIndex((item) => item.id === id);
    const updatedCard: Card = {
      ...currentList[index],
      ...patch,
      updatedAt: Date.now(),
    };
    currentList[index] = updatedCard;
  });
  saveCardsToStorage(currentList);
  return success(null);
}

// 删除卡片
export function deleteCard(id: string): ServiceResult<null> {
  const currentList = loadCardsFromStorage();
  const nextList = currentList.filter((card) => card.id !== id);
  if (nextList.length === currentList.length) {
    return fail('题目未找到');
  }
  saveCardsToStorage(nextList);
  return success(null);
}

// 批量删除卡片
export function batchDeleteCards(ids: string[]): ServiceResult<null> {
  const currentList = loadCardsFromStorage();
  const nextList = currentList.filter((card) => !ids.includes(card.id));
  if (nextList.length === currentList.length) {
    return fail('没有找到要删除的题目');
  }
  if (currentList.length - nextList.length !== ids.length) {
    return fail('部分题目未找到，无法批量删除');
  }
  saveCardsToStorage(nextList);
  return success(null);
}

// 保存所有卡片（覆盖式），用于导入时批量保存
export function saveAllCards(cards: Card[]): ServiceResult<null> {
  saveCardsToStorage(cards);
  return success(null);
}

const compareCardSort = (a: Card, b: Card) => {
  if (a.sort !== b.sort) {
    return a.sort - b.sort;
  }

  return a.createdAt - b.createdAt;
};

// 更新分类下的卡片排序
export function updateCardOrderInCategory(categoryId: string, move: Move): ServiceResult<null> {
  if (!categoryId) {
    return fail('分类 ID 不能为空');
  }
  const currentList = loadCardsFromStorage();
  // 保存拖拽结果时必须基于分类全量顺序，而不是页面当前已加载片段。
  const categoryCards = currentList
    .filter((card) => card.categoryId === categoryId)
    .sort(compareCardSort);

  const movedIndex = categoryCards.findIndex((card) => card.id === move.movedId);
  const anchorIndex = categoryCards.findIndex((card) => card.id === move.anchorId);

  if (movedIndex === -1 || anchorIndex === -1) {
    return fail('排序目标不存在');
  }

  if (move.position === 'before' && movedIndex < anchorIndex && movedIndex + 1 === anchorIndex) {
    return success(null);
  }

  if (move.position === 'after' && movedIndex > anchorIndex && movedIndex === anchorIndex + 1) {
    return success(null);
  }

  const nextCategoryCards = [...categoryCards];
  const [movedCard] = nextCategoryCards.splice(movedIndex, 1);
  const adjustedAnchorIndex = movedIndex < anchorIndex ? anchorIndex - 1 : anchorIndex;
  const insertIndex = move.position === 'before' ? adjustedAnchorIndex : adjustedAnchorIndex + 1;

  nextCategoryCards.splice(insertIndex, 0, movedCard);

  // 重写整个分类的 sort，保证 storage 里的顺序和用户最终看到的一致。
  nextCategoryCards.forEach((card, index) => {
    card.sort = (index + 1) * SORT_STEP;
  });
  // 更新整个卡片列表中对应分类的卡片顺序，其他分类的卡片保持不变
  const nextList = currentList.map((card) => {
    if (card.categoryId === categoryId) {
      const updatedCard = nextCategoryCards.find((c) => c.id === card.id);
      return updatedCard ? { ...card, sort: updatedCard.sort } : card;
    }
    return card;
  });
  saveCardsToStorage(nextList);
  return success(null);
}

// 获取统计数据
export function getCardStats(): ServiceResult<StatsResult> {
  // 拿到每日的学习状态统计数据
  const currentList = loadCardsFromStorage();
  const currentCategories = loadCategoriesForSort().categories;
  const dailyStats = loadDailyLearningStats();
  const todayKey = getDateKey(new Date());
  const todayStart = dateKeyToTimestamp(todayKey);
  const now = Date.now();

  // 概览
  const total = currentList.length;
  const mastered = currentList.filter((card) => card.status === 'mastered').length;
  const fuzzy = currentList.filter((card) => card.status === 'fuzzy').length;
  const unknown = currentList.filter((card) => card.status === 'unknown').length;

  // 今日练习状态统计：刷题数当前口径按去重处理
  const { dailyQuizLimit, dailyQuizCurrentIndex } = getAnsweredCount();
  const hasTodayDailyStats = hasDailyStatsInRange(dailyStats, todayStart);
  const todayPracticeIds = hasTodayDailyStats
    ? getCardIdsFromDailyStats(dailyStats, todayStart)
    : getCardIdsByTime(currentList, 'statusUpdatedAt', todayStart, now);
  const todayMasteredIds = hasTodayDailyStats
    ? getCardIdsFromDailyStats(dailyStats, todayStart, CARD_STATUS_TO_CODE.mastered)
    : getCardIdsByTime(currentList, 'masteredAt', todayStart, now);
  const dailyStudied = getUniqueCount(todayPracticeIds);
  const dailyMastered = getUniqueCount(todayMasteredIds);

  // 分类统计
  const categoryStats: StatsResult['categoryStats'] = {};
  currentCategories.forEach((category) => {
    const categoryCards = currentList.filter((card) => card.categoryId === category.id);
    categoryStats[category.id] = {
      total: categoryCards.length,
      mastered: categoryCards.filter((card) => card.status === 'mastered').length,
      fuzzy: categoryCards.filter((card) => card.status === 'fuzzy').length,
      unknown: categoryCards.filter((card) => card.status === 'unknown').length,
    };
  });

  const activityStats = getActivityStats(currentList, dailyStats);

  return success({
    total,
    mastered,
    fuzzy,
    unknown,
    dailyQuizLimit,
    dailyQuizCurrentIndex,
    dailyStudied,
    dailyMastered,
    categoryStats,
    activityStats,
  });
}

function countCardsByTime(
  cards: Card[],
  field: 'createdAt' | 'contentUpdatedAt' | 'statusUpdatedAt' | 'masteredAt',
  start: number,
  end: number,
) {
  return cards.filter((card) => {
    const value = card[field];
    return typeof value === 'number' && value >= start && value <= end;
  }).length;
}

// 获取每日测验已答题数量和总题量
function getAnsweredCount() {
  const quizSession = getStoredDailyQuizSession();
  if (!quizSession) {
    return {
      dailyQuizLimit: 0,
      dailyQuizCurrentIndex: 0,
    };
  }

  return {
    dailyQuizLimit: quizSession.limit,
    dailyQuizCurrentIndex: quizSession.finished
      ? quizSession.queue.length
      : quizSession.currentIndex,
  };
}

// 根据卡片的时间字段筛选出在指定时间范围内的卡片 ID 列表，用于补足 dailyStats 的计算
function getCardIdsByTime(
  cards: Card[],
  field: 'createdAt' | 'contentUpdatedAt' | 'statusUpdatedAt' | 'masteredAt',
  start: number,
  end: number,
) {
  return cards
    .filter((card) => {
      const value = card[field];
      return typeof value === 'number' && value >= start && value <= end;
    })
    .map((card) => card.id);
}

// 根据 dailyStats 的练习记录统计在指定时间范围内的练习卡片 ID 列表，按状态码过滤
function getCardIdsFromDailyStats(
  dailyStats: DailyLearningStats[],
  start: number,
  statusCode?: CardStatusCode,
) {
  const ids: string[] = [];

  dailyStats.forEach((stats) => {
    if (dateKeyToTimestamp(stats.date) < start) {
      return;
    }

    const pairCount = Math.min(stats.practicedCardIds.length, stats.practiceStatuses.length);
    for (let index = 0; index < pairCount; index += 1) {
      if (statusCode === undefined || stats.practiceStatuses[index] === statusCode) {
        ids.push(stats.practicedCardIds[index]);
      }
    }
  });

  return ids;
}

// 去重 ID 列表，返回一个新的数组
function getUniqueCount(ids: string[]) {
  return new Set(ids).size;
}

function hasDailyStatsInRange(dailyStats: DailyLearningStats[], start: number) {
  return dailyStats.some((stats) => dateKeyToTimestamp(stats.date) >= start);
}

// 新增和内容更新继续使用卡片时间字段；练习和掌握优先使用 dailyStats，仅在窗口内没有 dailyStats 时才回退到时间字段。
function getActivityStats(
  currentList: Card[],
  dailyStats: DailyLearningStats[],
): StatsResult['activityStats'] {
  const now = Date.now();
  const day7Start = getTimestampDaysAgo(7);
  const day30Start = getTimestampDaysAgo(30);

  const hasDay7DailyStats = hasDailyStatsInRange(dailyStats, day7Start);
  const hasDay30DailyStats = hasDailyStatsInRange(dailyStats, day30Start);

  const day7PracticeIds = hasDay7DailyStats
    ? getCardIdsFromDailyStats(dailyStats, day7Start)
    : getCardIdsByTime(currentList, 'statusUpdatedAt', day7Start, now);
  const day30PracticeIds = hasDay30DailyStats
    ? getCardIdsFromDailyStats(dailyStats, day30Start)
    : getCardIdsByTime(currentList, 'statusUpdatedAt', day30Start, now);
  const day7MasteredIds = hasDay7DailyStats
    ? getCardIdsFromDailyStats(dailyStats, day7Start, CARD_STATUS_TO_CODE.mastered)
    : getCardIdsByTime(currentList, 'masteredAt', day7Start, now);
  const day30MasteredIds = hasDay30DailyStats
    ? getCardIdsFromDailyStats(dailyStats, day30Start, CARD_STATUS_TO_CODE.mastered)
    : getCardIdsByTime(currentList, 'masteredAt', day30Start, now);

  const day7Stats = {
    added: countCardsByTime(currentList, 'createdAt', day7Start, now),
    updated: countCardsByTime(currentList, 'contentUpdatedAt', day7Start, now),
    practice: getUniqueCount(day7PracticeIds),
    mastered: getUniqueCount(day7MasteredIds),
  };

  const day30Stats = {
    added: countCardsByTime(currentList, 'createdAt', day30Start, now),
    updated: countCardsByTime(currentList, 'contentUpdatedAt', day30Start, now),
    practice: getUniqueCount(day30PracticeIds),
    mastered: getUniqueCount(day30MasteredIds),
  };

  const activityStats = {
    '7day': day7Stats,
    '30day': day30Stats,
  };

  return activityStats;
}
