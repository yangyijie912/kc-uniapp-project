import { getCategories } from './categoryService';
import { getCards } from './cardService';
import type { ExportData } from '@/types/exports';

// 导出的数据结构
export const buildExportData = async (): Promise<ExportData> => {
  const categoriesRes = await getCategories();
  const cardsRes = await getCards();

  const categories = categoriesRes.data || [];
  const cards = cardsRes.data || [];

  return {
    categories,
    cards,
    version: '1.0',
    exportedAt: Date.now(),
  };
};

// 转成 JSON 字符串
export const buildExportJson = async () => {
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

// 导出为 JSON 文件(H5 端)
export const exportToJsonH5 = async () => {
  const jsonStr = await buildExportJson();
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `quiz_export_${new Date()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 导出为 JSON 文件( app 端 )
export const exportToJsonApp = async (json: string) => {
  const fileName = `quiz_export_${new Date()}.json`;

  plus.io.requestFileSystem(plus.io.PUBLIC_DOCUMENTS, (fs) => {
    if (!fs.root) {
      console.error('Failed to access file system');
      plus.nativeUI.toast('导出失败');
      return;
    } else {
      fs.root.getFile(fileName, { create: true }, (fileEntry) => {
        fileEntry.createWriter((writer) => {
          writer.write(json);
          writer.onwriteend = () => {
            plus.nativeUI.toast('导出成功');
            // 打开文件所在目录
            plus.runtime.openFile(fileEntry.toLocalURL());
          };
        });
      });
    }
  });
};
