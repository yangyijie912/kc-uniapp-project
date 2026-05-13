import { UNCATEGORIZED_ID } from '@/constants/category';
import { CATEGORY_THEMES } from '@/constants/themes';
import type { Category } from '@/types/card';

// 通过字符串生成一个稳定的哈希值，确保同一个字符串总是得到同一个哈希值
function hashString(value: string) {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    // 这里使用一个简单的哈希算法，将字符的Unicode值与之前的哈希值进行组合
    // hash << 5 是将之前的哈希值左移5位，相当于乘以32，这样可以增加哈希值的分布范围
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }

  return Math.abs(hash);
}

type CategoryThemeSource = Pick<Category, 'id' | 'name' | 'themeIndex' | 'isSystem'>;

// 未分类的主题颜色固定，不参与主题分配算法
const UNCATEGORIZED_THEME = {
  background: 'linear-gradient(135deg, #6b7280, #9ca3af)',
  color: '#f9fafb',
};

// 检查 themeIndex 是否有效，即是否为一个非负整数且在主题列表范围内
export function isValidCategoryThemeIndex(themeIndex: unknown): themeIndex is number {
  return (
    Number.isInteger(themeIndex) &&
    Number(themeIndex) >= 0 &&
    Number(themeIndex) < CATEGORY_THEMES.length
  );
}

// 旧数据没有 themeIndex 时，继续沿用原来的哈希规则，这样第一次迁移不会让现有分类变色
export function getCategoryThemeIndexByName(name: string) {
  return hashString(name) % CATEGORY_THEMES.length;
}

// 计算当前分类列表中每个主题的使用数量，返回一个数组，索引对应主题索引，值对应使用数量
function countThemeUsage(categories: CategoryThemeSource[]) {
  // 利用Array.from创建一个长度为主题数量的数组，并初始化所有元素为0，表示每个主题当前的使用数量为0
  const usage = Array.from({ length: CATEGORY_THEMES.length }, () => 0);

  categories.forEach((category) => {
    if (category.id === UNCATEGORIZED_ID || category.isSystem) {
      return;
    }

    if (isValidCategoryThemeIndex(category.themeIndex)) {
      usage[category.themeIndex] += 1;
    }
  });

  return usage;
}

// 根据分类列表和一个可选的首选主题索引，选择一个可用的主题索引。优先使用首选索引，如果它未被使用；否则选择使用最少的索引。
export function pickAvailableCategoryThemeIndex(
  categories: CategoryThemeSource[],
  preferredThemeIndex?: number,
) {
  const usage = countThemeUsage(categories);

  // 首选索引有效且未被使用，直接返回首选索引
  if (isValidCategoryThemeIndex(preferredThemeIndex) && usage[preferredThemeIndex] === 0) {
    return preferredThemeIndex;
  }

  // 找出使用数量最少的主题索引，可能有多个并列最少的索引，这时优先选择首选索引（如果在其中）
  const minUsage = Math.min(...usage);
  if (isValidCategoryThemeIndex(preferredThemeIndex) && usage[preferredThemeIndex] === minUsage) {
    return preferredThemeIndex;
  }

  // 第二轮开始按当前分类数量轮转，避免主题池耗尽后总是偏向前几个主题。
  const startIndex =
    categories.filter((category) => category.id !== UNCATEGORIZED_ID && !category.isSystem).length %
    CATEGORY_THEMES.length;

  // 规则固定，轮流选但结果稳定：从 startIndex 开始，找到第一个使用数量等于最少使用数量的索引并返回。
  for (let offset = 0; offset < CATEGORY_THEMES.length; offset += 1) {
    const index = (startIndex + offset) % CATEGORY_THEMES.length;
    if (usage[index] === minUsage) {
      return index;
    }
  }

  return 0;
}

// 根据分类对象获取对应的主题颜色；优先使用持久化的 themeIndex，没有时再回退到旧哈希规则
export function getCategoryTheme(category: CategoryThemeSource | string) {
  if (typeof category === 'string') {
    const index = getCategoryThemeIndexByName(category);
    return CATEGORY_THEMES[index];
  }

  if (category.id === UNCATEGORIZED_ID || category.isSystem) {
    return UNCATEGORIZED_THEME;
  }

  const index = isValidCategoryThemeIndex(category.themeIndex)
    ? category.themeIndex
    : getCategoryThemeIndexByName(category.name);

  return CATEGORY_THEMES[index];
}
