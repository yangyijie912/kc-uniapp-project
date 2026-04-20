<template>
  <view class="page">
    <view class="panel">
      <view class="panel-title">我的</view>
      <view class="panel-subtitle">数据统计和维护入口</view>

      <view class="action-grid">
        <view class="action-card action-card-import" @click="importData">
          <view class="action-title">数据导入</view>
          <view class="action-desc">支持从 JSON 文件恢复卡片与分类</view>
        </view>

        <view class="action-card action-card-export" @click="exportData">
          <view class="action-title">数据导出</view>
          <view class="action-desc">导出格式为 JSON，固定保留5个备份槽位，自动轮转覆盖旧文件</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { buildExportJson, exportToJsonApp, exportToJsonH5 } from '@/services/exportService';
import { pickImportDataApp, pickImportDataH5, importFromJsonFile } from '@/services/importService';
import type { ImportMode } from '@/types/migration';

function chooseImportMode(): Promise<ImportMode | null> {
  return new Promise((resolve) => {
    uni.showActionSheet({
      itemList: ['合并导入', '覆盖导入'],
      success: (res) => {
        if (res.tapIndex === 0) {
          resolve('merge');
          return;
        }

        if (res.tapIndex === 1) {
          resolve('overwrite');
          return;
        }

        resolve(null);
      },
      fail: () => {
        resolve(null);
      },
    });
  });
}

function showImportResult(
  result: Awaited<ReturnType<typeof importFromJsonFile>>,
  mode: ImportMode,
) {
  if (result.success && result.data) {
    const content =
      mode === 'overwrite'
        ? [
            `覆盖成功，当前新增分类 ${result.data.categoryViewCount} 个，卡片 ${result.data.cardCount} 张`,
            `跳过 ${result.data.skippedCategoryCount} 个分类，${result.data.skippedCardCount} 张卡片`,
          ].join('\n')
        : [
            `新增 ${result.data.newCategoryCount} 个分类，${result.data.newCardCount} 张卡片`,
            `跳过 ${result.data.skippedCategoryCount} 个分类，${result.data.skippedCardCount} 张卡片`,
            `覆盖 ${result.data.overwrittenCardCount} 张卡片`,
          ].join('\n');
    uni.showModal({
      title: '导入成功',
      content,
      showCancel: false,
      confirmText: '知道了',
    });
    return;
  }

  uni.showToast({
    title: result.message || '导入失败',
    icon: 'none',
  });
}

const importData = async () => {
  try {
    const mode = await chooseImportMode();
    if (!mode) {
      return;
    }

    if (mode === 'overwrite') {
      const confirmOverwrite = await new Promise<boolean>((resolve) => {
        uni.showModal({
          title: '确认覆盖导入',
          content: '覆盖导入会先清空当前分类和卡片，再导入选中的文件，继续吗？',
          confirmText: '继续',
          cancelText: '取消',
          success: (res) => {
            resolve(Boolean(res.confirm));
          },
          fail: () => {
            resolve(false);
          },
        });
      });

      if (!confirmOverwrite) {
        return;
      }
    }

    // #ifdef H5
    {
      const jsonStrH5 = await pickImportDataH5();
      const importResultH5 = await importFromJsonFile(jsonStrH5, mode);
      showImportResult(importResultH5, mode);
    }
    // #endif

    // #ifdef APP-PLUS
    {
      uni.showLoading({ title: '导入中' });
      const jsonStrApp = await pickImportDataApp();
      const importResultApp = await importFromJsonFile(jsonStrApp, mode);
      showImportResult(importResultApp, mode);
      uni.hideLoading();
    }
    // #endif
  } catch (e) {
    uni.hideLoading();
    console.error('导入失败', e);
    uni.showToast({
      title: e instanceof Error ? e.message : '导入失败',
      icon: 'none',
    });
  }
};

const exportData = async () => {
  try {
    // #ifdef APP-PLUS
    {
      const json = await buildExportJson();
      const fullPath = await exportToJsonApp(json);
      uni.showModal({
        title: '导出成功',
        content: `已保存到：\n${fullPath}`,
        showCancel: false,
        confirmText: '知道了',
      });
    }
    // #endif

    // #ifdef H5
    {
      await exportToJsonH5();
      uni.showToast({
        title: '导出成功',
        icon: 'none',
      });
    }
    // #endif

    // #ifndef H5 || APP-PLUS
    uni.showToast({
      title: '当前平台暂不支持导出',
      icon: 'none',
    });
    // #endif
  } catch (e) {
    uni.showModal({
      title: '导出失败',
      content: e instanceof Error ? e.message : '导出失败',
      showCancel: false,
      confirmText: '知道了',
    });
  }
};
</script>

<style scoped>
.page {
  min-height: 100%;
  padding: 24rpx 28rpx 48rpx;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top left, rgba(239, 125, 66, 0.14), transparent 34%),
    radial-gradient(circle at top right, rgba(31, 94, 255, 0.12), transparent 30%),
    linear-gradient(180deg, #f8f2e8 0%, #efe5d5 100%);
}

.panel {
  border-radius: 32rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 252, 247, 0.84);
  box-shadow: 0 16rpx 40rpx rgba(80, 55, 25, 0.06);
  padding: 32rpx 28rpx;
}

.panel-title {
  color: #1e1c18;
  font-size: 40rpx;
  font-weight: 700;
}

.panel-subtitle {
  margin-top: 10rpx;
  color: #6c645a;
  font-size: 24rpx;
}

.action-grid {
  margin-top: 22rpx;
  display: grid;
  gap: 16rpx;
}

.action-card {
  min-height: 160rpx;
  border-radius: 26rpx;
  padding: 24rpx;
  box-sizing: border-box;
}

.action-card-import {
  border: 1rpx solid rgba(31, 94, 255, 0.12);
  background: linear-gradient(135deg, rgba(31, 94, 255, 0.09), rgba(255, 255, 255, 0.72));
}

.action-card-export {
  border: 1rpx solid rgba(18, 122, 114, 0.14);
  background: linear-gradient(135deg, rgba(18, 122, 114, 0.1), rgba(255, 255, 255, 0.72));
}

.action-title {
  color: #1e1c18;
  font-size: 30rpx;
  font-weight: 700;
}

.action-desc {
  margin-top: 12rpx;
  color: #6c645a;
  font-size: 24rpx;
  line-height: 1.7;
}
</style>
