<template>
  <view class="page">
    <view class="detail-card">
      <view class="detail-head">
        <view class="detail-tag">{{ categoryName }}</view>
        <view class="icon-btn edit-btn" @click="goToEdit">
          <text class="icon-mark">✎</text>
        </view>
      </view>
      <view class="detail-title">{{ cardData?.question }}</view>
      <!-- <view class="detail-summary">{{ cardData?.summary }}</view> -->
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
      categoryName.value = '未分类';
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

.detail-tag {
  color: #127a72;
  font-size: 22rpx;
}

.icon-btn {
  width: 72rpx;
  height: 72rpx;
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
  color: #6c645a;
  font-size: 26rpx;
  line-height: 1.7;
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
