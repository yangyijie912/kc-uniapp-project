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

type ExportEntry = {
  fullPath?: string;
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

const EXPORT_BACKUP_SLOT_COUNT = 5;
const EXPORT_BACKUP_SLOT_KEY = 'knowledge-card.export-backup-slot';

// 读取 PUBLIC_DOCUMENTS 目录下的导出文件列表
function requestPublicDocumentsFS(): Promise<ExportFilesystem> {
  return new Promise((resolve, reject) => {
    plus.io.requestFileSystem(plus.io.PUBLIC_DOCUMENTS, resolve, reject);
  });
}

function getNextExportBackupSlot(): number {
  const storedValue =
    typeof uni !== 'undefined' ? Number(uni.getStorageSync(EXPORT_BACKUP_SLOT_KEY)) : NaN;
  const currentSlot = Number.isFinite(storedValue) ? storedValue : -1;
  const nextSlot = (currentSlot + 1) % EXPORT_BACKUP_SLOT_COUNT;

  if (typeof uni !== 'undefined') {
    uni.setStorageSync(EXPORT_BACKUP_SLOT_KEY, nextSlot);
  }

  return nextSlot;
}

function getExportBackupFileName(slotIndex: number): string {
  return `export_backup_${slotIndex + 1}.json`;
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
          let hasTruncated = false;

          writer.onwrite = () => {
            if (!hasTruncated) {
              hasTruncated = true;
              writer.write(content);
              return;
            }

            resolve(fileEntry);
          };

          writer.truncate(0);
        }, reject);
      },
      reject,
    );
  });
}

async function exportJsonWithLimit(json: string, fileName: string): Promise<string> {
  const fs = await requestPublicDocumentsFS();
  const root = fs.root;

  if (!root) {
    throw new Error('无法访问文件系统');
  }

  const fileEntry = await writeFile(root, fileName, json);

  if (!fileEntry.fullPath) {
    throw new Error('写入文件成功，但无法获取文件路径');
  }

  return fileEntry.fullPath;
}

// 导出为 JSON 文件( app 端 )
export const exportToJsonApp = async (json: string): Promise<string> => {
  const slotIndex = getNextExportBackupSlot();
  const fileName = getExportBackupFileName(slotIndex);
  return exportJsonWithLimit(json, fileName);
};
