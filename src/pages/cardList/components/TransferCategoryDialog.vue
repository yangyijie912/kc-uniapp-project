<template>
  <BaseDialog :open="open" title="选择分类" :showDefaultFooter="false" @close="emit('close')">
    <view class="category-dialog">
      <view class="category-dialog-tip">请选择要转移到的分类，确认后会批量更新已选卡片。</view>
      <picker
        :range="categoryOptions"
        range-key="name"
        :value="selectedTransferCategoryIndex"
        @change="handleTransferCategoryChange"
      >
        <view class="transfer-picker" :class="{ placeholder: !selectedTransferCategoryName }">
          {{ selectedTransferCategoryName || '请选择分类' }}
        </view>
      </picker>
      <view class="transfer-picker-hint">
        当前选择：{{ selectedTransferCategoryName || '未选择' }}
      </view>
    </view>

    <template #footer>
      <view class="dialog-footer-default">
        <view class="btn btn-cancel" @click="emit('close')">取消</view>
        <view class="btn btn-confirm" @click="emit('confirm')">转移分类</view>
      </view>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BaseDialog from '@/components/BaseDialog.vue';
import type { Category } from '@/types/card';

type Props = {
  open: boolean;
  categoryList: Category[];
  selectedCategoryId: string;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'confirm'): void;
  (event: 'update:selectedCategoryId', value: string): void;
}>();

const categoryOptions = computed(() =>
  props.categoryList.map((category) => ({
    id: category.id,
    name: category.name,
  })),
);

const selectedTransferCategoryIndex = computed(() => {
  const index = categoryOptions.value.findIndex(
    (category) => category.id === props.selectedCategoryId,
  );

  return index === -1 ? 0 : index;
});

const selectedTransferCategoryName = computed(() => {
  return (
    categoryOptions.value.find((category) => category.id === props.selectedCategoryId)?.name || ''
  );
});

const handleTransferCategoryChange = (event: { detail: { value: string } }) => {
  const index = Number(event.detail.value);
  const category = categoryOptions.value[index];

  if (category) {
    emit('update:selectedCategoryId', category.id);
  }
};
</script>

<style scoped>
.category-dialog {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.category-dialog-tip {
  color: #6c645a;
  font-size: 24rpx;
  line-height: 1.6;
}

.transfer-picker {
  height: 84rpx;
  padding: 0 22rpx;
  display: flex;
  align-items: center;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.76);
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  color: #1e1c18;
  font-size: 28rpx;
  box-sizing: border-box;
}

.transfer-picker.placeholder {
  color: #9d9487;
}

.transfer-picker-hint {
  color: #6c645a;
  font-size: 22rpx;
  line-height: 1.5;
}

.dialog-footer-default {
  display: flex;
  gap: 16rpx;
}

.btn {
  flex: 1;
  min-height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20rpx;
  font-size: 28rpx;
  font-weight: 700;
  box-sizing: border-box;
}

.btn-cancel {
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 255, 255, 0.78);
  color: #6c645a;
}

.btn-confirm {
  background: linear-gradient(135deg, #127a72, #1f5eff);
  color: #fff;
  box-shadow: 0 12rpx 24rpx rgba(31, 94, 255, 0.22);
}

.btn:active {
  transform: scale(0.98);
  opacity: 0.92;
}
</style>
