<template>
  <view class="page">
    <view class="panel">
      <view class="panel-title">我的</view>
      <view class="panel-subtitle">数据维护入口统一放在这里</view>

      <view class="action-grid">
        <view class="action-card action-card-import" @click="importData">
          <view class="action-title">数据导入</view>
          <view class="action-desc">支持从 JSON 文件恢复卡片与分类</view>
        </view>

        <view class="action-card action-card-export" @click="exportData">
          <view class="action-title">数据导出</view>
          <view class="action-desc">导出格式为 JSON，最多5个，超过覆盖最旧的</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { buildExportJson, exportToJsonApp, exportToJsonH5 } from '@/services/exportService';
import { pickImportDataApp, pickImportDataH5, importFromJsonFile } from '@/services/importService';

function showImportResult(result: Awaited<ReturnType<typeof importFromJsonFile>>) {
  if (result.success && result.data) {
    const {
      newCategoryCount,
      newCardCount,
      skippedCategoryCount,
      skippedCardCount,
      overwrittenCardCount,
    } = result.data;
    const content = [
      `新增 ${newCategoryCount} 个分类，${newCardCount} 张卡片`,
      `跳过 ${skippedCategoryCount} 个分类，${skippedCardCount} 张卡片`,
      `覆盖 ${overwrittenCardCount} 张卡片`,
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
    // #ifdef H5
    {
      const jsonStrH5 = await pickImportDataH5();
      const importResultH5 = await importFromJsonFile(jsonStrH5);
      showImportResult(importResultH5);
    }
    // #endif

    // #ifdef APP-PLUS
    {
      uni.showLoading({ title: '导入中' });
      const jsonStrApp = await pickImportDataApp();
      const importResultApp = await importFromJsonFile(jsonStrApp);
      showImportResult(importResultApp);
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
      const fullPath = await exportToJsonApp(json, (message) => {
        uni.showModal({
          title: '清理失败',
          content: message,
          showCancel: false,
          confirmText: '知道了',
        });
      });
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
