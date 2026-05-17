<template>
  <view class="page">
    <view class="hero-card">
      <view class="eyebrow">Category Admin</view>
      <view class="title">分类管理</view>
      <view class="desc">管理分类结构，方便卡片的新增、筛选和跳转。</view>
    </view>

    <view class="toolbar-card">
      <view class="toolbar-title">全部分类</view>
      <view class="toolbar-action" @click="addCategory">新增分类</view>
    </view>

    <view class="list-card">
      <view v-for="category in categoryViewList" :key="category.id" class="category-row">
        <view class="category-info">
          <view class="category-name">{{ category.name }}</view>
          <view class="category-count">{{ category.cardCount }} 张卡片</view>
        </view>
        <view class="row-actions">
          <view
            class="row-icon"
            @click="category.canMoveUp && moveUp(category.id)"
            :class="{ disabled: !category.canMoveUp }"
          >
            <image
              class="row-icon-image"
              :src="
                category.canMoveUp
                  ? '/static/actions/shangjiantou.svg'
                  : '/static/actions/shangjiantou-disabled.svg'
              "
              mode="aspectFit"
            />
          </view>

          <view
            class="row-icon"
            @click="category.canMoveDown && moveDown(category.id)"
            :class="{ disabled: !category.canMoveDown }"
          >
            <image
              class="row-icon-image"
              :src="
                category.canMoveDown
                  ? '/static/actions/xiajiantou.svg'
                  : '/static/actions/xiajiantou-disabled.svg'
              "
              mode="aspectFit"
            />
          </view>

          <view class="row-icon" @click="goToEdit(category.id)" v-if="category.canEdit">
            <image class="row-icon-image" src="/static/actions/bianji.svg" mode="aspectFit" />
          </view>

          <view
            class="row-icon row-icon-danger"
            @click="removeCategory(category.id)"
            v-if="category.canDelete"
          >
            <image class="row-icon-image" src="/static/actions/shanchu.svg" mode="aspectFit" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { deleteCategory, moveCategoryUp, moveCategoryDown } from '@/services/categoryService';
import { onShow } from '@dcloudio/uni-app';
import useCategoryView from '@/composables/useCategoryView';
const { categoryViewList, loadAllData } = useCategoryView();

// 删除分类
const removeCategory = (id: string) => {
  uni.showModal({
    title: '确认删除',
    content: '删除分类会将该分类的卡片全部移入未分类，请谨慎操作。',
    confirmText: '删除',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        performDelete(id);
      }
    },
  });
};

const performDelete = (id: string) => {
  const res = deleteCategory(id);

  if (res.success) {
    loadAllData(); // 刷新分类视图，确保未分类被正确更新
  }

  uni.showToast({
    title: res.success ? '分类删除成功' : res.message || '分类删除失败',
    icon: res.success ? 'success' : 'none',
  });
};

// 向上移动分类
const moveUp = (id: string) => {
  const res = moveCategoryUp(id);
  if (res.success) {
    loadAllData();
  } else {
    uni.showToast({
      title: res.message || '移动失败',
      icon: 'none',
    });
  }
};

// 向下移动分类
const moveDown = (id: string) => {
  const res = moveCategoryDown(id);
  if (res.success) {
    loadAllData();
  } else {
    uni.showToast({
      title: res.message || '移动失败',
      icon: 'none',
    });
  }
};

// 进入分类编辑页
const goToEdit = (id: string) => {
  uni.navigateTo({
    url: `/pages/categoryEdit/index?id=${id}`,
  });
};

// 新增分类
const addCategory = () => {
  uni.navigateTo({
    url: '/pages/categoryEdit/index',
  });
};

onShow(() => {
  // 每次进入页面都刷新分类数据，确保和编辑页修改后保持同步
  loadAllData();
});
</script>

<style scoped>
.page {
  padding: 24rpx 28rpx max(12rpx, env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: linear-gradient(180deg, #f8f2e8 0%, #efe5d5 100%);
}

.hero-card,
.toolbar-card,
.list-card {
  border-radius: 28rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 252, 247, 0.84);
  box-shadow: 0 16rpx 40rpx rgba(80, 55, 25, 0.06);
}

.hero-card,
.toolbar-card {
  padding: 28rpx;
}

.eyebrow {
  color: #127a72;
  font-size: 22rpx;
}

.title {
  margin-top: 12rpx;
  color: #1e1c18;
  font-size: 44rpx;
  font-weight: 700;
}

.desc {
  margin-top: 14rpx;
  color: #6c645a;
  font-size: 26rpx;
  line-height: 1.7;
}

.toolbar-card {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.toolbar-title {
  color: #1e1c18;
  font-size: 30rpx;
  font-weight: 700;
}

.toolbar-action {
  min-width: 160rpx;
  height: 76rpx;
  padding: 0 24rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: rgba(31, 94, 255, 0.1);
  color: #1f5eff;
  font-size: 26rpx;
  font-weight: 600;
}

.list-card {
  margin-top: 20rpx;
  padding: 12rpx 20rpx;
}

.category-row {
  padding: 24rpx 8rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* gap: 16rpx; */
  border-bottom: 1rpx solid rgba(61, 43, 24, 0.08);
}

.category-info {
  min-width: 0;
  flex: 1;
  padding-right: 16rpx;
}

.category-row:last-child {
  border-bottom: none;
}

.category-name {
  color: #1e1c18;
  font-size: 30rpx;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-count {
  margin-top: 6rpx;
  color: #6c645a;
}

.row-actions {
  display: flex;
  gap: 14rpx;
}

.row-btn {
  min-width: 104rpx;
  height: 64rpx;
  padding: 0 18rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.8);
  color: #6c645a;
  font-size: 24rpx;
}

.row-btn-danger {
  background: rgba(239, 125, 66, 0.12);
  color: #c76530;
}

.row-icon {
  width: 64rpx;
  height: 64rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10rpx;
  background: #ffffff; /* white square */
  border: 1rpx solid rgba(61, 43, 24, 0.04);
  box-sizing: border-box;
}

.row-icon.selected {
  border: 2rpx solid #2f6fa8; /* blue selected border */
}

.row-icon.disabled {
  background: #f3f4f6; /* disabled grey square */
  pointer-events: none;
  opacity: 1;
}

.row-icon-danger {
  background: rgba(215, 75, 63, 0.12);
}

.row-icon-image {
  width: 32rpx;
  height: 32rpx;
  display: block;
}

@media (max-width: 320px) {
  .toolbar-card,
  .category-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .row-actions {
    width: 100%;
  }
}
</style>
