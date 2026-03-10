import categories from '@/data/category.json';
import type { Category } from '@/types/card';

const categoryList: Category[] = categories;

export function getCategories(params?: Partial<Category>): Category[] {
  if (!params) {
    return categoryList;
  }
  return categoryList.filter((category) => {
    return (Object.keys(params) as Array<keyof Category>).every((key) => category[key] === params[key]);
  });
}
