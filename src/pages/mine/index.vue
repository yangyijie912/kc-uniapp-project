<template>
  <view class="page">
    <view class="panel">
      <view class="panel-title">我的</view>
      <view class="panel-subtitle">数据统计和维护入口</view>

      <view class="action-grid">
        <view class="action-card action-card-stats" @click="goToStats">
          <view class="action-title">学习统计</view>
          <view class="action-desc">查看总量、今日进度、活跃度和分类表现</view>
        </view>

        <view class="action-card action-card-import" @click="importData">
          <view class="action-title">数据导入</view>
          <view class="action-desc"
            >支持从 JSON 文件恢复卡片与分类；学习统计仅在覆盖导入时恢复</view
          >
        </view>

        <view class="action-card action-card-export" @click="exportData">
          <view class="action-title">数据导出</view>
          <view class="action-desc"
            >导出格式为 JSON，包含卡片、分类和学习统计，最多保留5个备份并自动轮转覆盖最旧文件</view
          >
        </view>
      </view>
    </view>

    <BaseDialog
      :open="exportDialogVisible"
      title="导出文件名"
      cancelText="取消"
      confirmText="导出"
      @close="closeExportDialog"
      @confirm="confirmExport"
    >
      <view class="export-dialog">
        <view class="export-dialog-tip">请输入文件名，留空则使用默认命名规则。</view>
        <input
          v-model="exportFileName"
          class="export-input"
          :maxlength="MAX_EXPORT_FILE_NAME_LENGTH"
          :placeholder="`不超过 ${MAX_EXPORT_FILE_NAME_LENGTH} 个字`"
          placeholder-class="export-input-placeholder"
        />
      </view>
    </BaseDialog>

    <BaseDialog
      :open="importDialogVisible"
      title="导入设置"
      cancelText="取消"
      :confirmText="pendingImport ? '导入中' : '开始导入'"
      @close="closeImportDialog"
      @confirm="confirmImport"
    >
      <view class="import-dialog">
        <view class="import-section">
          <view class="import-section-title">导入模式</view>
          <view class="import-option-row">
            <view
              class="import-option-chip"
              :class="{ active: importMode === 'merge' }"
              @click="importMode = 'merge'"
            >
              合并导入
            </view>
            <view
              class="import-option-chip"
              :class="{ active: importMode === 'overwrite' }"
              @click="importMode = 'overwrite'"
            >
              覆盖导入
            </view>
          </view>
          <view class="import-section-tip">
            {{
              importMode === 'merge'
                ? '保留当前数据，并按规则处理冲突卡片；学习统计会跳过，继续以本地记录为准。'
                : '用导入文件整体替换当前分类和卡片，并恢复导入文件里的学习统计。'
            }}
          </view>
        </view>

        <view v-if="importMode === 'merge'" class="import-section">
          <view class="import-section-title">冲突卡片</view>
          <view class="import-option-column">
            <view
              class="import-choice-card"
              :class="{ active: importConfig.conflictStrategy === 'skip' }"
              @click="importConfig.conflictStrategy = 'skip'"
            >
              <view class="import-choice-title">跳过冲突</view>
            </view>
            <view
              class="import-choice-card"
              :class="{ active: importConfig.conflictStrategy === 'overwrite' }"
              @click="importConfig.conflictStrategy = 'overwrite'"
            >
              <view class="import-choice-title">直接覆盖</view>
            </view>
          </view>
          <view class="import-choice-desc">
            {{
              importConfig.conflictStrategy === 'skip'
                ? '同 ID 卡片保留本地数据，不做覆盖。'
                : '同 ID 卡片以新导入的数据为准。'
            }}
          </view>
        </view>

        <view v-if="importMode === 'merge'" class="import-section">
          <view class="import-section-title">导入状态</view>
          <view class="import-option-column">
            <view
              class="import-choice-card"
              :class="{ active: importConfig.statusStrategy === 'imported' }"
              @click="importConfig.statusStrategy = 'imported'"
            >
              <view class="import-choice-title">保留导入状态</view>
            </view>
            <view
              class="import-choice-card"
              :class="{ active: importConfig.statusStrategy === 'clear' }"
              @click="importConfig.statusStrategy = 'clear'"
            >
              <view class="import-choice-title">清空导入状态</view>
            </view>
          </view>
          <view class="import-choice-desc">
            {{
              importConfig.statusStrategy === 'imported'
                ? '适合导入自己另一套题库，保留卡片状态。'
                : '适合别人的题库，只导入题目内容，不带学习状态。'
            }}
          </view>
        </view>

        <view class="import-dialog-note" v-if="importMode !== 'merge'">
          <view class="import-dialog-note-title"> 覆盖导入提醒 </view>
          <view class="import-dialog-note-text">
            覆盖导入会整体替换当前分类和卡片，导入文件里的内容、状态和学习统计都会直接生效。
          </view>
        </view>

        <view class="import-dialog-note" v-else>
          <view class="import-dialog-note-title"> 合并导入提醒 </view>
          <view class="import-dialog-note-text">
            合并导入只处理分类、卡片和状态策略，不导入学习统计，避免覆盖当前设备上的练习记录。
          </view>
        </view>
      </view>
    </BaseDialog>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import BaseDialog from '@/components/BaseDialog.vue';
import { buildExportJson, exportToJsonApp, exportToJsonH5 } from '@/services/exportService';
import { pickImportDataApp, pickImportDataH5, importFromJsonFile } from '@/services/importService';
import type { ImportMode, MergeConfig } from '@/types/migration';

const exportDialogVisible = ref(false);
const exportFileName = ref('');
const pendingExport = ref(false);
const importDialogVisible = ref(false);
const pendingImport = ref(false);
const importMode = ref<ImportMode>('merge');
const importConfig = ref<MergeConfig>({
  statusStrategy: 'imported',
  conflictStrategy: 'skip',
});
const MAX_EXPORT_FILE_NAME_LENGTH = 20; // 最大文件名长度（不包含扩展名）

function showImportResult(
  result: Awaited<ReturnType<typeof importFromJsonFile>>,
  mode: ImportMode,
) {
  if (result.success && result.data) {
    const content =
      mode === 'overwrite'
        ? [
            `覆盖后当前分类 ${result.data.categoryViewCount} 个，卡片 ${result.data.cardCount} 张`,
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

const openExportDialog = () => {
  exportFileName.value = '';
  exportDialogVisible.value = true;
};

const openImportDialog = () => {
  importMode.value = 'merge';
  importConfig.value = {
    statusStrategy: 'imported',
    conflictStrategy: 'skip',
  };
  importDialogVisible.value = true;
};

const closeExportDialog = () => {
  if (pendingExport.value) {
    return;
  }

  exportDialogVisible.value = false;
  exportFileName.value = '';
};

const closeImportDialog = () => {
  if (pendingImport.value) {
    return;
  }

  importDialogVisible.value = false;
};

const confirmExport = async () => {
  const fileName = exportFileName.value.trim();

  if (fileName.length > MAX_EXPORT_FILE_NAME_LENGTH) {
    uni.showToast({
      title: `文件名不能超过${MAX_EXPORT_FILE_NAME_LENGTH}个字`,
      icon: 'none',
    });
    return;
  }

  try {
    pendingExport.value = true;
    uni.showLoading({ title: '导出中' });

    const json = await buildExportJson();
    const fullPath = await exportToJsonApp(json, fileName || undefined);

    exportDialogVisible.value = false;
    exportFileName.value = '';

    uni.showModal({
      title: '导出成功',
      content: `已保存到：\n${fullPath}`,
      showCancel: false,
      confirmText: '知道了',
    });
  } catch (e) {
    uni.showModal({
      title: '导出失败',
      content: e instanceof Error ? e.message : '导出失败',
      showCancel: false,
      confirmText: '知道了',
    });
  } finally {
    pendingExport.value = false;
    uni.hideLoading();
  }
};

const confirmImport = async () => {
  try {
    pendingImport.value = true;
    importDialogVisible.value = false;

    const mergeConfig = importMode.value === 'merge' ? importConfig.value : undefined;

    // #ifdef H5
    {
      const jsonStrH5 = await pickImportDataH5();
      const importResultH5 = await importFromJsonFile(jsonStrH5, importMode.value, mergeConfig);
      showImportResult(importResultH5, importMode.value);
    }
    // #endif

    // #ifdef APP-PLUS
    {
      uni.showLoading({ title: '导入中' });
      const jsonStrApp = await pickImportDataApp();
      const importResultApp = await importFromJsonFile(jsonStrApp, importMode.value, mergeConfig);
      showImportResult(importResultApp, importMode.value);
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
  } finally {
    pendingImport.value = false;
  }
};

const importData = () => {
  openImportDialog();
};

const exportData = async () => {
  try {
    // #ifdef APP-PLUS
    {
      openExportDialog();
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

const goToStats = () => {
  uni.navigateTo({
    url: '/pages/stats/index',
  });
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

.action-card-stats {
  border: 1rpx solid rgba(239, 125, 66, 0.14);
  background: linear-gradient(135deg, rgba(239, 125, 66, 0.12), rgba(255, 255, 255, 0.72));
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

.export-dialog {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.import-dialog {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.import-section {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.import-section-title {
  color: #1e1c18;
  font-size: 28rpx;
  font-weight: 700;
}

.import-section-tip {
  color: #8f877b;
  font-size: 22rpx;
  line-height: 1.6;
}

.import-option-row {
  display: flex;
  gap: 12rpx;
}

.import-option-column {
  display: flex;
  gap: 12rpx;
}

.import-option-chip {
  min-width: 140rpx;
  padding: 12rpx 20rpx;
  border-radius: 999rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 255, 255, 0.72);
  color: #6c645a;
  font-size: 24rpx;
  line-height: 1.3;
  text-align: center;
  font-weight: 600;
  box-sizing: border-box;
}

.import-option-chip.active {
  border-color: rgba(31, 94, 255, 0.18);
  background: rgba(31, 94, 255, 0.12);
  color: #1f5eff;
}

.import-choice-card {
  padding: 12rpx 16rpx;
  border-radius: 22rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 255, 255, 0.72);
  width: 50%;
  text-align: center;
}

.import-choice-card.active {
  border-color: rgba(18, 122, 114, 0.18);
  background: linear-gradient(135deg, rgba(52, 194, 187, 0.2), rgba(255, 255, 255, 0.8));
}

.import-choice-title {
  color: #1e1c18;
  font-size: 26rpx;
  font-weight: 500;
}

.import-choice-desc {
  margin-top: 8rpx;
  color: #6c645a;
  font-size: 22rpx;
  line-height: 1.6;
}

.import-dialog-note {
  padding: 18rpx 20rpx;
  border-radius: 22rpx;
  border: 1rpx solid rgba(239, 125, 66, 0.18);
  background: linear-gradient(135deg, rgba(239, 125, 66, 0.12), rgba(255, 255, 255, 0.82));
}

.import-dialog-note-title {
  color: #1e1c18;
  font-size: 24rpx;
  line-height: 1.5;
  font-weight: 700;
}

.import-dialog-note-text {
  margin-top: 8rpx;
  color: #7b5d35;
  font-size: 22rpx;
  line-height: 1.7;
}

.export-dialog-tip {
  color: #6c645a;
  font-size: 24rpx;
  line-height: 1.6;
}

.export-input {
  height: 84rpx;
  padding: 0 22rpx;
  box-sizing: border-box;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.76);
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  color: #1e1c18;
  font-size: 28rpx;
}

.export-input-placeholder {
  color: #9d9487;
}
</style>
