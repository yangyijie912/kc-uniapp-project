import categories from '@/data/category.json';
import type { Category } from '@/types/card';
import { generateUUID } from '@/utils/uuid';

const categoryList: Category[] = categories;

// 获取分类列表，支持根据参数过滤分类
export function getCategories(params?: Partial<Category>): Category[] {
  if (!params) {
    return categoryList;
  }
  return categoryList.filter((category) => {
    return (Object.keys(params) as Array<keyof Category>).every((key) => category[key] === params[key]);
  });
}

// 根据 id 获取单个分类
export function getCategoryById(id: string): Category | undefined {
  return categoryList.find((category) => category.id === id);
}

// 添加新分类
export function addCategory(category: Omit<Category, 'id'>): Category {
  const newCategory: Category = {
    id: generateUUID(),
    ...category,
  };
  categoryList.push(newCategory);
  return newCategory;
}

// 更新分类
export function updateCategory(updates: Partial<Category>): Category | null {
  const category = categoryList.find((cat) => cat.id === updates.id);
  if (!category) {
    return null;
  }
  Object.assign(category, updates);
  return category;
}
