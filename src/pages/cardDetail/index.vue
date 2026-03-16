<template>
  <view class="page">
    <view class="detail-card">
      <view class="detail-head">
        <view class="detail-category">{{ categoryName }}</view>
        <view class="icon-btn edit-btn" @click="goToEdit">
          <text class="icon-mark">✎</text>
        </view>
      </view>
      <view class="detail-title">{{ cardData?.question }}</view>
      <view class="detail-summary">
        <view class="detail-top">
          <view class="detail-status" :class="`status-${cardData?.status}`">{{ cardData?.status ?? '未知' }}</view>
          <view class="detail-tag">/ {{ cardData?.tags?.join('•') }}</view>
        </view>
      </view>
    </view>

    <view class="panel">
      <view class="panel-title">答案</view>
      <view class="panel-text">
        {{ cardData?.answer }}
      </view>
    </view>

    <view class="panel">
      <view class="panel-title">笔记</view>
      <view class="bullet">
        <rich-text :nodes="cardData?.content || ''"></rich-text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { getCardById } from '@/services/cardService';
import { getCategoryById } from '@/services/categoryService';
import type { Card } from '@/types/card';
import { UNCATEGORIZED_NAME } from '@/constants/category';

const cardId = ref<string | null>(null);
const cardData = ref<Card | null>(null);
const categoryName = ref('');

const loadCardData = (id: string) => {
  const res = getCardById(id);
  if (res.success && res.data) {
    cardData.value = res.data;

    const categoryRes = getCategoryById(res.data.categoryId);
    if (categoryRes.success && categoryRes.data) {
      categoryName.value = categoryRes.data.name;
    } else {
      categoryName.value = UNCATEGORIZED_NAME;
    }
  } else {
    cardData.value = null;
    categoryName.value = '';
    uni.showToast({
      title: res.message || '数据加载失败',
      icon: 'none',
    });
  }
};

const goToEdit = () => {
  if (!cardId.value) {
    return;
  }

  uni.navigateTo({
    url: `/pages/cardEdit/index?id=${cardId.value}`,
  });
};

onLoad((options) => {
  cardId.value = options?.id || null;
  if (cardId.value) {
    loadCardData(cardId.value);
  } else {
    uni.showToast({
      title: '未指定卡片 ID',
      icon: 'none',
    });
  }
});

onShow(() => {
  if (cardId.value) {
    loadCardData(cardId.value);
  }
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx 28rpx 48rpx;
  box-sizing: border-box;
  background: linear-gradient(180deg, #f8f2e8 0%, #efe5d5 100%);
}

.detail-card,
.panel {
  border-radius: 28rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 252, 247, 0.84);
  box-shadow: 0 16rpx 40rpx rgba(80, 55, 25, 0.06);
}

.detail-card {
  padding: 30rpx;
}

.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.detail-category {
  color: #127a72;
  font-size: 24rpx;
}

.icon-btn {
  width: 60rpx;
  height: 60rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1rpx solid rgba(61, 43, 24, 0.08);
  box-shadow: 0 12rpx 24rpx rgba(80, 55, 25, 0.08);
}

.icon-mark {
  font-size: 30rpx;
  line-height: 1;
  font-weight: 600;
}

.edit-btn {
  background: rgba(31, 94, 255, 0.1);
  color: #1f5eff;
}

.detail-title {
  margin-top: 12rpx;
  color: #1e1c18;
  font-size: 40rpx;
  line-height: 1.4;
  font-weight: 700;
}

.detail-summary {
  margin-top: 14rpx;
  color: #9d9487;
}

.detail-top {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.detail-tag {
  color: #9d9487;
  font-size: 22rpx;
  /* 溢出省略 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /* 不准挤别人 */
  min-width: 0;
}

.detail-status {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  /* 禁止被挤压 */
  flex-shrink: 0;
}

.status-fuzzy {
  background: rgba(239, 125, 66, 0.12);
  color: #c76530;
}

.status-mastered {
  background: rgba(18, 122, 114, 0.12);
  color: #127a72;
}

.status-unknown {
  background: rgba(255, 255, 255, 0.72);
  color: #6c645a;
}

.status-undefined {
  background: rgba(31, 94, 255, 0.1);
  color: #1f5eff;
}

.panel {
  margin-top: 22rpx;
  padding: 28rpx;
}

.panel-title {
  color: #1e1c18;
  font-size: 30rpx;
  font-weight: 700;
}

.panel-text,
.bullet {
  margin-top: 14rpx;
  color: #6c645a;
  font-size: 26rpx;
  line-height: 1.8;
}
</style>
