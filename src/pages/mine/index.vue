<template>
  <view class="page">
    <view class="panel">
      <view class="panel-title">我的</view>
      <view class="panel-subtitle">数据维护入口统一放在这里</view>

      <view class="action-grid">
        <view class="action-card action-card-import" @click="importData">
          <view class="action-title">数据导入</view>
          <view class="action-desc">支持从 JSON 文件恢复卡片与分类（开发中）</view>
        </view>

        <view class="action-card action-card-export" @click="exportData">
          <view class="action-title">数据导出</view>
          <view class="action-desc">导出当前卡片与分类到 JSON 文件</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { buildExportJson, exportToJsonApp, exportToJsonH5 } from '@/services/exportService';

const importData = () => {
  uni.showToast({
    title: '导入功能开发中',
    icon: 'none',
  });
};

const exportData = async () => {
  const json = await buildExportJson();

  // #ifdef H5
  exportToJsonH5();
  // #endif

  // #ifdef APP-PLUS
  exportToJsonApp(json);
  // #endif

  // #ifndef H5 || APP-PLUS
  uni.showToast({
    title: '当前平台暂不支持导出',
    icon: 'none',
  });
  // #endif
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
