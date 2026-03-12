import categories from '@/data/category.json';
import type { Category } from '@/types/card';
import { generateUUID } from '@/utils/uuid';

// 本地存储的键名
const key = 'knowledge-card-categories';

let categoryList: Category[] = categories;

// 保存整个分类列表到本地存储
export function saveCategoriesToStorage(list: Category[]) {
  uni.setStorageSync(key, JSON.stringify(list));
}

// 初始化时将默认分类列表存储到本地存储中，如果已经存在则不覆盖
if (!uni.getStorageSync(key)) {
  saveCategoriesToStorage(categoryList);
} else {
  // 如果本地存储中已经有数据，则使用存储的数据覆盖默认的分类列表
  categoryList = JSON.parse(uni.getStorageSync(key)) as Category[];
}

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
  saveCategoriesToStorage(categoryList);
  return newCategory;
}

// 更新分类
export function updateCategory(updates: Partial<Category>): Category | null {
  const category = categoryList.find((cat) => cat.id === updates.id);
  if (!category) {
    return null;
  }
  Object.assign(category, updates);
  saveCategoriesToStorage(categoryList);
  return category;
}

// 删除分类
export function deleteCategory(id: string): boolean {
  const index = categoryList.findIndex((category) => category.id === id);
  if (index === -1) {
    return false;
  }
  categoryList.splice(index, 1);
  saveCategoriesToStorage(categoryList);
  return true;
}
