import { getCategories, saveAllCategories } from './categoryService';
import { getCards, saveAllCards } from './cardService';
import { fail, success } from './serviceHelper';
import { generateUUID } from '@/utils/uuid';
import { UNCATEGORIZED_ID, UNCATEGORIZED_NAME } from '@/constants/category';
import type { ImportData, ImportResult, ImportMode } from '@/types/migration';
import type { RawCard, Card, Category } from '@/types/card';
import type { ServiceResult } from '@/types/service';

/**
 * ==============================================================
 * 以下是和平台相关的文件操作接口，App 和 H5 的实现不同
 * 分别封装在 pickImportDataApp 和 pickImportDataH5 两个函数中。
 * ==============================================================
 */

// 选文件读文本(H5)
export function pickImportDataH5(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('未选择文件'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        resolve(text);
      };
      reader.onerror = () => {
        reject(new Error('读取文件失败'));
      };
      reader.readAsText(file);
    };
    input.click();
  });
}

type ImportPickItem = {
  name: string;
  path: string;
  entry: PlusIoFileEntry;
};

function waitForPlusReady(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof plus !== 'undefined') {
      resolve();
      return;
    }

    document.addEventListener(
      'plusready',
      () => {
        resolve();
      },
      { once: true },
    );
  });
}

// 1. 列出 App 公共文档目录里的 json 文件
const listJsonFilesApp = (): Promise<ImportPickItem[]> => {
  return new Promise((resolve, reject) => {
    plus.io.requestFileSystem(
      plus.io.PUBLIC_DOCUMENTS,
      (fs) => {
        if (!fs.root) {
          reject(new Error('无法访问文件系统'));
          return;
        }

        const reader = fs.root.createReader();
        reader.readEntries(
          (entries) => {
            const entryList = entries as unknown as PlusIoFileEntry[];
            const jsonFiles: ImportPickItem[] = entryList
              .filter(
                (entry: PlusIoFileEntry) =>
                  entry.isFile && !!entry.name?.toLowerCase().endsWith('.json'),
              )
              .map((entry: PlusIoFileEntry) => ({
                name: entry.name || '未命名文件',
                path: entry.toLocalURL(),
                entry,
              }))
              .sort((left: ImportPickItem, right: ImportPickItem) =>
                right.name.localeCompare(left.name, 'zh-CN'),
              );

            resolve(jsonFiles);
          },
          (error) => {
            reject(new Error(error.message || '读取目录失败'));
          },
        );
      },
      (error) => {
        reject(new Error(error.message || '获取文件系统失败'));
      },
    );
  });
};

// 2. 读取某个 json 文件内容
const readJsonFileApp = (entry: PlusIoFileEntry): Promise<string> => {
  return new Promise((resolve, reject) => {
    entry.file(
      (file) => {
        const reader = new plus.io.FileReader();

        reader.onloadend = () => {
          resolve(String((reader as unknown as { result?: string }).result || ''));
        };

        reader.onerror = () => {
          reject(new Error('读取文件失败'));
        };

        reader.readAsText(file, 'utf-8');
      },
      (error) => {
        reject(new Error(error.message || '获取文件对象失败'));
      },
    );
  });
};

// 3. 让用户选一个文件（App）
export const pickImportDataApp = async (): Promise<string> => {
  // 等待 plusready 事件，确保 plus API 可用
  await waitForPlusReady();

  const files = await listJsonFilesApp();

  if (!files.length) {
    throw new Error('未找到可导入的 JSON 文件，请先将导出文件放到 App 文档目录');
  }

  const index = await new Promise<number>((resolve, reject) => {
    plus.nativeUI.actionSheet(
      {
        title: '选择要导入的文件',
        cancel: '取消',
        buttons: files.map((file) => ({ title: file.name })),
      },
      (event) => {
        const index = event?.index;
        if (typeof index !== 'number' || index <= 0) {
          reject(new Error('已取消选择'));
          return;
        }

        const selectedFile = files[index - 1];
        if (!selectedFile) {
          reject(new Error('所选文件不存在'));
          return;
        }

        resolve(index - 1);
      },
    );
  });

  return readJsonFileApp(files[index].entry);
};

/**
 * ==============================================================
 * 以下是和平台无关的导入数据处理逻辑，包括数据格式验证、分类合并、卡片合并等核心功能。
 * ==============================================================
 */

// 判断导入的数据是否符合 ImportData 的结构，确保数据的有效性和安全性
function isImportData(data: any): data is ImportData {
  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.categories) &&
    Array.isArray(data.cards) &&
    typeof data.version === 'string' &&
    typeof data.exportedAt === 'number'
  );
}

// 解析JSON
function parseImportData(jsonStr: string): ImportData {
  let data: unknown;
  try {
    data = JSON.parse(jsonStr);
  } catch (error) {
    throw new Error('解析JSON失败');
  }

  if (!isImportData(data)) {
    throw new Error('数据格式不正确');
  }

  return data;
}

/**
 * example:
 * 系统数据分类：[{id: '1', name: 'React'}, {id: '2', name: 'Vue'}]
 * 导入数据分类：[
 * {id: '1', name: 'React'},
 * {id: '2', name: 'JS'},
 * {id: '3', name: 'Vue'},
 * {id: '4', name: 'CSS'}
 * ]
 * 合并后系统分类：[
 * {id: '1', name: 'React'}, // ID和名称都匹配，认为是同一个分类，不重复添加
 * {id: '2', name: 'Vue'},  // 名称匹配但ID不匹配的分类, 认为是同一个分类，保留系统中已有的分类信息
 * {id: '1002', name: 'JS'},  // ID匹配但名称不匹配的分类，原分类不动，重新创建新分类JS
 * {id: '4', name: 'CSS'} // ID和名称都不匹配的分类，认为是新分类，添加到列表中
 * ]
 * 总结：
 * 分类名优先，ID 只拿来辅助判断；同名视为同类，不同名再看是不是 ID 冲突，冲突就新建分类
 */

// 导入结果统计对象，记录整个导入过程中各种情况的数量，最终返回给用户
const countTotal = {
  newCategoryCount: 0,
  newCardCount: 0,
  skippedCategoryCount: 0,
  skippedCardCount: 0,
  overwrittenCardCount: 0,
};

type MergeCategoriesResult = {
  mergedCategories: Category[];
  importedCategoryMap: Map<string, string>; // key: 导入分类ID，value: 系统分类ID，用于后续关联卡片时转换导入的 categoryId
};

// 处理导入的分类数据，返回合并后的分类列表和导入分类ID到系统分类ID的映射关系
function mergeCategories(
  importedCategories: ImportData['categories'],
  currentCategories: Category[],
): MergeCategoriesResult {
  const mergedCategories: Category[] = [...currentCategories];
  const importedCategoryMap: Map<string, string> = new Map();

  // 构建当前分类的名称和ID映射，方便后续匹配
  const nameMap = new Map(currentCategories.map((cat) => [cat.name, cat]));
  const idMap = new Map(currentCategories.map((cat) => [cat.id, cat]));

  for (const importedCategory of importedCategories) {
    const importedName = importedCategory.name.trim();
    const importedId = importedCategory.id;
    if (!importedName) {
      countTotal.skippedCategoryCount += 1;
      continue; // 跳过名称为空的分类
    }

    // 未分类是系统保留分类，直接跳过
    if (importedId === UNCATEGORIZED_ID || importedName === UNCATEGORIZED_NAME) {
      importedCategoryMap.set(importedId, UNCATEGORIZED_ID); // 无论ID还是名称匹配，都映射到系统的未分类ID
      countTotal.skippedCategoryCount += 1;
      continue;
    }

    const nameMatch = nameMap.get(importedName);
    const idMatch = idMap.get(importedId);

    // 1、按名称匹配，认为是同一个分类，不重复添加
    if (nameMatch) {
      importedCategoryMap.set(importedId, nameMatch.id);
      countTotal.skippedCategoryCount += 1;
      continue;
    }

    // 2、按ID匹配但名称不匹配，保留旧分类，重新创建一个新分类
    if (idMatch) {
      const newCategory: Category = {
        id: generateUUID(),
        name: importedName,
        sort: mergedCategories.length, // 新分类排序值放到最后
      };
      mergedCategories.push(newCategory);
      importedCategoryMap.set(importedId, newCategory.id);
      nameMap.set(importedName, newCategory); // 更新名称映射，避免后续同名分类重复添加
      idMap.set(newCategory.id, newCategory); // 更新ID映射，避免后续ID冲突重复添加
      countTotal.newCategoryCount += 1;
      continue;
    }

    // 3、名称和ID都不匹配，认为是新分类，添加到列表中
    const newCategory: Category = {
      ...importedCategory,
      sort: importedCategory.sort ?? mergedCategories.length, // 保留原排序值，或者放到最后
    };
    mergedCategories.push(newCategory);
    importedCategoryMap.set(importedId, newCategory.id);
    nameMap.set(importedName, newCategory);
    idMap.set(importedId, newCategory);
    countTotal.newCategoryCount += 1;
  }

  return {
    mergedCategories,
    importedCategoryMap,
  };
}

// 分类合并后，处理分类ID的映射关系，确保导入的卡片数据能够正确关联到合并后的分类
function transformImportedCategoryId(rawCard: RawCard, mergeResult: MergeCategoriesResult): string {
  const mergedCategories = mergeResult.mergedCategories;
  const importedCategoryMap = mergeResult.importedCategoryMap;
  // 从原始数据中获取分类名称和ID
  const rawCategoryName = rawCard.category?.trim();
  const rawCategoryId = rawCard.categoryId;

  // 1、如果卡片的 categoryId 在导入分类ID映射中，说明这个分类在合并后被保留或新建了，直接使用映射后的系统分类ID
  if (rawCategoryId && importedCategoryMap.has(rawCategoryId)) {
    return importedCategoryMap.get(rawCategoryId)!;
  }

  // 2、按原始卡片名称获取匹配的分类，优先按名称匹配
  if (rawCategoryName) {
    const matched = mergedCategories.find((category) => category.name === rawCategoryName);
    if (matched) {
      return matched.id;
    }
  }

  // 3、其余情况，返回未分类
  return UNCATEGORIZED_ID;
}

// 把导入的原始卡片数据转换成系统的卡片数据结构
function normalizeImportedCard(rawCard: RawCard, mergeResult: MergeCategoriesResult): Card | null {
  if (!rawCard.question || !rawCard.answer) {
    console.warn(
      `[importService] 导入卡片数据不完整，缺少 question 或 answer 字段，已跳过。rawCard=${JSON.stringify(rawCard)}`,
    );
    countTotal.skippedCardCount += 1;
    return null; // 跳过数据不完整的卡片
  }

  const createdAt = rawCard?.createdAt || Date.now();

  return {
    id: rawCard.id || generateUUID(),
    categoryId: transformImportedCategoryId(rawCard, mergeResult),
    question: rawCard?.question,
    answer: rawCard?.answer,
    content: rawCard?.content,
    tags: rawCard?.tags,
    status: rawCard?.status,
    createdAt,
    updatedAt: rawCard?.updatedAt || createdAt,
    sort: rawCard?.sort ?? Number.MAX_SAFE_INTEGER, // 没有排序值的卡片放到最后
  };
}

// 合并卡片
function mergeCards(
  importedCards: ImportData['cards'],
  currentCards: Card[],
  mergeResult: MergeCategoriesResult,
): Card[] {
  const cardsMap = new Map(currentCards.map((card) => [card.id, card]));
  for (const rawCard of importedCards) {
    const normalizedCard = normalizeImportedCard(rawCard, mergeResult);
    if (normalizedCard) {
      const existed = cardsMap.has(normalizedCard.id);
      cardsMap.set(normalizedCard.id, normalizedCard); // ID 冲突时覆盖原有卡片
      if (existed) {
        countTotal.overwrittenCardCount += 1;
      } else {
        countTotal.newCardCount += 1;
      }
    }
  }

  return Array.from(cardsMap.values());
}

// 未分类处理：如果导入的卡片数据没有未分类，categoryCount不计算未分类，有则计算
function getVisibleCategoryCount(categories: Category[], cards: Card[]): number {
  // 判断是否有未分类的卡片
  const hasUncategorizedCards = cards.some((card) => card.categoryId === UNCATEGORIZED_ID);
  return categories.filter((cat) => {
    if (cat.id === UNCATEGORIZED_ID) {
      return hasUncategorizedCards; // 只有当有未分类卡片时，才显示未分类
    }
    return true; // 其他分类正常显示
  }).length;
}

// 旧分类可能没有sort，补上sort
const ensureCategoriesSort = (categories: Category[]): Category[] => {
  return categories.map((category, index) => ({
    ...category,
    name: category.name.trim(),
    sort:
      typeof category.sort === 'number' && Number.isFinite(category.sort) ? category.sort : index,
  }));
};

// 最终导入流程
export async function importFromJsonFile(
  jsonStr: string,
  mode: ImportMode = 'merge',
): Promise<ServiceResult<ImportResult>> {
  // 重置计数器，确保每次导入都是独立统计
  countTotal.newCategoryCount = 0;
  countTotal.newCardCount = 0;
  countTotal.skippedCategoryCount = 0;
  countTotal.skippedCardCount = 0;
  countTotal.overwrittenCardCount = 0;
  try {
    if (mode !== 'merge' && mode !== 'overwrite') {
      return fail('不支持的导入模式');
    }
    // 1、解析数据
    const importData = parseImportData(jsonStr);
    let mergedCategories: Category[] = [];
    let mergedCards: Card[] = [];
    // 合并模式
    if (mode === 'merge') {
      // 2、获取当前系统数据
      const currentCategories = getCategories().data || [];
      const currentCards = getCards().data?.list || [];
      // 3、合并分类和卡片数据，并处理分类ID映射关系
      const mergeResult = mergeCategories(importData.categories, currentCategories);
      mergedCategories = mergeResult.mergedCategories;
      mergedCards = mergeCards(importData.cards, currentCards, mergeResult);
    }
    // 覆盖模式
    if (mode === 'overwrite') {
      // 2、已修复，不是“先清空再导入”，而是用处理好的新数据一次性替换旧数据
      // 3、清理传入数据中无效的数据
      const mergeResult = mergeCategories(importData.categories, []); // 传空数组让所有导入分类都被视为新分类，统计无效分类数量
      mergedCategories = mergeResult.mergedCategories;
      mergedCards = mergeCards(importData.cards, [], mergeResult);
    }
    // 4、批量保存合并后的分类和卡片
    const categoryRes = saveAllCategories(ensureCategoriesSort(mergedCategories));
    if (!categoryRes.success) {
      return fail(categoryRes.message || '导入分类失败');
    }
    const cardRes = saveAllCards(mergedCards);
    if (!cardRes.success) {
      return fail(cardRes.message || '导入卡片失败');
    }
    // 5、返回导入结果
    return success({
      categoryCount: mergedCategories.length,
      categoryViewCount: getVisibleCategoryCount(mergedCategories, mergedCards),
      cardCount: mergedCards.length,
      newCategoryCount: countTotal.newCategoryCount,
      newCardCount: countTotal.newCardCount,
      skippedCategoryCount: countTotal.skippedCategoryCount,
      skippedCardCount: countTotal.skippedCardCount,
      overwrittenCardCount: countTotal.overwrittenCardCount,
    });
  } catch (error: unknown) {
    return fail(error instanceof Error ? error.message : '导入失败');
  }
}
