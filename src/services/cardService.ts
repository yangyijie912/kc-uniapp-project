import cards from '@/data/cards.json';
import categories from '@/data/category.json';
import type { Card, Category } from '@/types/card';

// 定义一个类型来表示原始的卡片数据结构
type RawCard = {
  id: string;
  category: string;
  subcategory: string;
  question: string;
  answer: string;
  content?: string;
  tags?: string[];
  status?: Card['status'];
  createdAt?: string;
  updatedAt?: string;
};

const categoryList: Category[] = categories;

// const categoryIdByNameObj: Record<string, string> = {};
// categoryList.forEach((category) => {
//   categoryIdByNameObj[category.name] = category.id;
// });

// 创建一个映射通过categoryName 来快速获取 categoryId
const categoryIdByName = new Map(categoryList.map((category) => [category.name, category.id]));

// 子类别ID生成函数，格式为 "categoryId:subcategoryName"，其中subcategoryName经过处理以适合URL或ID格式
function toSubcategoryId(categoryId: string, subcategoryName: string): string {
  return `${categoryId}:${subcategoryName.trim().toLowerCase().replace(/\s+/g, '-')}`;
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
    subcategoryId: toSubcategoryId(categoryId, rawCard.subcategory),
    question: rawCard.question,
    answer: rawCard.answer,
    content: rawCard.content,
    tags: rawCard.tags,
    status: rawCard.status,
    createdAt: rawCard.createdAt,
    updatedAt: rawCard.updatedAt,
  };
}

// 将原始卡片数据转换为Card类型的列表
const cardList: Card[] = (cards as RawCard[]).map(toCard);

// 根据参数获取卡片
export function getCards(params?: Partial<Card>): Card[] {
  if (!params) {
    return cardList;
  }
  return cardList.filter((card) => {
    return (Object.keys(params) as Array<keyof Card>).every((key) => card[key] === params[key]);
  });
}
