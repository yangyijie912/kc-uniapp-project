import { getCategories } from './categoryService';
import { getCards } from './cardService';
import type { ExportData } from '@/types/migration';

// 导出的数据结构
const buildExportData = async (): Promise<ExportData> => {
  const categoriesRes = await getCategories();
  const cardsRes = await getCards();

  const categories = categoriesRes.data || [];
  const cards = cardsRes.data?.list || [];

  return {
    categories,
    cards,
    version: '1.0',
    exportedAt: Date.now(),
  };
};

// 转成 JSON 字符串
export const buildExportJson = async (): Promise<string> => {
  const data = await buildExportData();
  return JSON.stringify(
    data,
    (key, value) => {
      if (value === undefined) {
        return undefined;
      }
      return value;
    },
    2,
  );
};

const formatExportedAt = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
};

// 导出为 JSON 文件(H5 端)
export const exportToJsonH5 = async () => {
  const jsonStr = await buildExportJson();
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${formatExportedAt()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * ---------- 以下是 app 端的导出实现 ----------
 */

type ExportDirectoryEntry = PlusIoDirectoryEntry;
type ExportEntry = {
  isFile?: boolean;
  name?: string;
  fullPath?: string;
  remove: (successCB?: () => void, errorCB?: (result: any) => void) => void;
};

type ExportFileEntry = ExportEntry & {
  createWriter: (
    successCB?: (writer: PlusIoFileWriter) => void,
    errorCB?: (result: any) => void,
  ) => void;
};

type ExportDirectoryHandle = {
  createReader: () => {
    readEntries: (successCB?: (entries: unknown) => void, errorCB?: (result: any) => void) => void;
  };
  getFile: (
    path: string,
    flag?: PlusIoFlags,
    successCB?: (result: ExportFileEntry) => void,
    errorCB?: (result: any) => void,
  ) => void;
};

type ExportFilesystem = {
  root?: ExportDirectoryHandle;
};

// 读取 PUBLIC_DOCUMENTS 目录下的导出文件列表
function requestPublicDocumentsFS(): Promise<ExportFilesystem> {
  return new Promise((resolve, reject) => {
    plus.io.requestFileSystem(plus.io.PUBLIC_DOCUMENTS, resolve, reject);
  });
}

// 读取目录下的所有条目（文件和子目录）
function readAllEntries(dirEntry: ExportDirectoryHandle): Promise<ExportEntry[]> {
  return new Promise((resolve, reject) => {
    const reader = dirEntry.createReader();
    const allEntries: ExportEntry[] = [];

    function readBatch() {
      reader.readEntries((entries: unknown) => {
        const batch = entries as ExportEntry[];

        if (!batch.length) {
          resolve(allEntries);
          return;
        }
        allEntries.push(...batch);
        readBatch();
      }, reject);
    }

    readBatch();
  });
}

// 删除指定的文件或目录
function removeEntry(entry: ExportEntry): Promise<void> {
  return new Promise((resolve, reject) => {
    entry.remove(() => resolve(), reject);
  });
}

// 获取导出文件列表，按时间排序
function getExportFiles(entries: ExportEntry[]): ExportFileEntry[] {
  return entries
    .filter((entry): entry is ExportFileEntry => {
      return Boolean(
        entry.isFile &&
        entry.name &&
        /^export_\d+\.json$/.test(entry.name) &&
        typeof (entry as ExportFileEntry).createWriter === 'function',
      );
    })
    .sort((a, b) => {
      const timeA = Number(a.name?.match(/^export_(\d+)\.json$/)?.[1] || 0);
      const timeB = Number(b.name?.match(/^export_(\d+)\.json$/)?.[1] || 0);
      return timeA - timeB;
    });
}

// 清理旧的导出文件，保留最新的 maxCount 个
async function cleanupOldExports(root: ExportDirectoryHandle, maxCount = 5): Promise<void> {
  try {
    const entries = await readAllEntries(root);
    const exportFiles = getExportFiles(entries);

    if (exportFiles.length <= maxCount) {
      return;
    }

    const removeCount = exportFiles.length - maxCount;
    const filesToRemove = exportFiles.slice(0, removeCount);

    for (const file of filesToRemove) {
      try {
        await removeEntry(file);
      } catch (error) {
        void error;
      }
    }
  } catch (error) {
    void error;
  }
}

// 写入文件
function writeFile(
  root: ExportDirectoryHandle,
  fileName: string,
  content: string,
): Promise<ExportFileEntry> {
  return new Promise((resolve, reject) => {
    root.getFile(
      fileName,
      { create: true },
      (fileEntry) => {
        fileEntry.createWriter((writer: PlusIoFileWriter) => {
          writer.onerror = reject;
          writer.onwrite = () => resolve(fileEntry);
          writer.write(content);
        }, reject);
      },
      reject,
    );
  });
}

async function exportJsonWithLimit(json: string, fileName: string, maxCount = 5): Promise<string> {
  const fs = await requestPublicDocumentsFS();
  const root = fs.root;

  if (!root) {
    throw new Error('无法访问文件系统');
  }

  const fileEntry = await writeFile(root, fileName, json);

  if (!fileEntry.fullPath) {
    throw new Error('写入文件成功，但无法获取文件路径');
  }

  void cleanupOldExports(root, maxCount);

  return fileEntry.fullPath;
}

// 导出为 JSON 文件( app 端 )
export const exportToJsonApp = async (json: string): Promise<string> => {
  const fileName = `export_${formatExportedAt()}.json`;
  return exportJsonWithLimit(json, fileName);
};
