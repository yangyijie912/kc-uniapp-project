import cards from '@/data/cards.json';
import type { Card, Category } from '@/types/card';
import { getCategories } from './categoryService';
import type { ServiceResult } from '@/types/service';
import { success, fail } from './serviceHelper';
import { generateUUID } from '@/utils/uuid';

// 本地存储的键名
const key = 'knowledge-card-cards';

// 定义一个类型来表示原始的卡片数据结构
type RawCard = {
  id: string;
  category: string;
  question: string;
  answer: string;
  content?: string;
  tags?: string[];
  status?: Card['status'];
  createdAt?: string;
  updatedAt?: string;
};

/** ================= */
/**
 * 加载分类数据并创建一个映射，方便后续将原始卡片数据中的 category 字段转换为 categoryId。
 */
const res = getCategories();
const categoryList: Category[] = res.success && res.data ? res.data : [];

// const categoryIdByNameObj: Record<string, string> = {};
// categoryList.forEach((category) => {
//   categoryIdByNameObj[category.name] = category.id;
// });

// 创建一个映射通过categoryName 来快速获取 categoryId
const categoryIdByName = new Map(categoryList.map((category) => [category.name, category.id]));

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
    categoryId: card.categoryId,
    question: card.question,
    answer: card.answer,
    content: card.content,
    tags: normalizeTags(card.tags),
    status: card.status,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
}

// 将原始卡片数据转换为Card类型
function toCard(rawCard: RawCard): Card {
  // 法一：使用对象来映射
  // const categoryId = categoryIdByNameObj[rawCard.category] ?? rawCard.category;
  // 法二：直接查找
  // const category = categoryList.find((item) => item.name === rawCard.category);
  // const categoryId = category ? category.id : rawCard.category;
  // 法三：使用Map来映射
  const categoryId = categoryIdByName.get(rawCard.category) ?? rawCard.category;

  return {
    id: rawCard.id,
    categoryId,
    question: rawCard.question,
    answer: rawCard.answer,
    content: rawCard.content,
    tags: normalizeTags(rawCard.tags),
    status: rawCard.status,
    createdAt: rawCard.createdAt,
    updatedAt: rawCard.updatedAt,
  };
}

/** ================= */

// 默认的卡片列表，从静态数据文件加载
const defaultCards: Card[] = (cards as RawCard[]).map((rawCard) => toCard(rawCard));

// 当前的卡片列表，后续会从本地存储加载或使用默认卡片
let cardList: Card[] = [];

// 克隆一个分类对象，确保外部修改不会影响内部数据
function cloneCard(card: Card): Card {
  return {
    ...card,
    tags: card.tags ? [...card.tags] : undefined,
  };
}

// 从本地存储加载卡片列表，如果没有则使用默认卡片，并保存到本地存储
function loadCardsFromStorage(): Card[] {
  const saved = uni.getStorageSync(key);
  if (saved) {
    const savedCards = JSON.parse(saved) as Card[];
    const normalizedCards = savedCards.map(normalizeCard);
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
  uni.setStorageSync(key, JSON.stringify(normalizedList));
  cardList = normalizedList.map(cloneCard);
}

loadCardsFromStorage();

// 根据参数获取卡片
export function getCards(params?: Partial<Card>): ServiceResult<Card[]> {
  const currentList = loadCardsFromStorage();
  if (!params) {
    return success(currentList.map(cloneCard));
  }
  const filteredCards = currentList.filter((card) => {
    return (Object.keys(params) as Array<keyof Card>).every((key) => card[key] === params[key]);
  });
  return success(filteredCards.map(cloneCard));
}

// 根据 id 获取单个卡片
export function getCardById(id: string): ServiceResult<Card | undefined> {
  const currentList = loadCardsFromStorage();
  const card = currentList.find((item) => item.id === id);
  return card ? success(cloneCard(card)) : fail('题目未找到');
}

// 添加新卡片
export function addCard(card: Omit<Card, 'id'>): ServiceResult<Card> {
  const currentList = loadCardsFromStorage();
  const newCard: Card = {
    id: generateUUID(),
    ...card,
  };
  const updatedList = [...currentList, newCard];
  saveCardsToStorage(updatedList);
  return success(cloneCard(newCard));
}

// 更新卡片
export function updateCard(id: string, updates: Partial<Card>): ServiceResult<Card> {
  const currentList = loadCardsFromStorage();
  const index = currentList.findIndex((item) => item.id === id);
  if (index === -1) {
    return fail('题目未找到');
  }
  const updatedCard: Card = {
    ...currentList[index],
    ...updates,
  };
  const updatedList = [...currentList];
  updatedList[index] = updatedCard;
  saveCardsToStorage(updatedList);
  return success(cloneCard(updatedCard));
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
