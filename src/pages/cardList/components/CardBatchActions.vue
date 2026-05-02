<template>
  <view class="batch-bar">
    <view class="batch-summary">
      <view class="batch-title">已选 {{ selectedCount }} 张</view>
      <view class="batch-desc">长按继续选择，完成后可批量转移分类或删除</view>
    </view>
    <view class="batch-actions">
      <view class="batch-btn batch-btn-secondary" @click="emit('cancel')">取消</view>
      <view class="batch-btn batch-btn-ghost" @click="emit('transfer')">转移分类</view>
      <view class="batch-btn batch-btn-danger" @click="emit('delete')">删除</view>
    </view>
  </view>
</template>

<script setup lang="ts">
type Props = {
  selectedCount: number;
};

defineProps<Props>();

const emit = defineEmits<{
  (event: 'cancel'): void;
  (event: 'transfer'): void;
  (event: 'delete'): void;
}>();
</script>

<style scoped>
.batch-bar {
  position: fixed;
  left: 28rpx;
  right: 28rpx;
  bottom: calc(20rpx + env(safe-area-inset-bottom));
  z-index: 5;
  padding: 20rpx 20rpx 18rpx;
  border-radius: 30rpx;
  background: rgba(255, 252, 247, 0.96);
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  box-shadow: 0 18rpx 42rpx rgba(80, 55, 25, 0.12);
  backdrop-filter: blur(12px);
  box-sizing: border-box;
}

.batch-summary {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.batch-title {
  color: #1e1c18;
  font-size: 28rpx;
  font-weight: 700;
}

.batch-desc {
  color: #6c645a;
  font-size: 22rpx;
  line-height: 1.5;
}

.batch-actions {
  margin-top: 16rpx;
  display: flex;
  gap: 12rpx;
}

.batch-btn {
  flex: 1;
  height: 76rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
}

.batch-btn-secondary {
  background: rgba(255, 255, 255, 0.8);
  color: #6c645a;
  border: 1rpx solid rgba(61, 43, 24, 0.08);
}

.batch-btn-ghost {
  background: rgba(31, 94, 255, 0.1);
  color: #1f5eff;
}

.batch-btn-danger {
  background: rgba(239, 125, 66, 0.12);
  color: #c76530;
}
</style>
