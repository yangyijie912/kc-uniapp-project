<template>
  <view class="page">
    <view class="hero-card">
      <view class="eyebrow">Category Editor</view>
      <view class="title">{{ categoryId ? '编辑分类' : '新增分类' }}</view>
      <view class="desc">先把分类名称和排序维护清楚，后面的卡片归类和列表展示会更稳定。</view>
    </view>

    <view class="form-card">
      <view class="form-header">
        <view class="form-title">基础信息</view>
        <view class="form-tip">名称用于展示，排序值越小越靠前</view>
      </view>

      <view class="form-group">
        <view class="form-label">名称</view>
        <input class="form-input" v-model="form.name" placeholder="例如：Vue" placeholder-class="input-placeholder" />
      </view>

      <view class="form-group">
        <view class="form-label">排序</view>
        <input
          class="form-input"
          type="digit"
          :value="form.sort"
          @input="onSortInput"
          placeholder="例如：1"
          placeholder-class="input-placeholder"
        />
      </view>

      <view class="form-actions">
        <view class="btn btn-secondary" @click="cancel">取消</view>
        <view class="btn btn-primary" @click="save">保存</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { addCategory, updateCategory, getCategoryById } from '@/services/categoryService';
import { onLoad } from '@dcloudio/uni-app';

const form = reactive({
  name: '',
  sort: '', // sort 先用字符串接收，方便输入和校验，避免输入过程中出现奇怪的浮点数
});

let categoryId: string | null = null;

onLoad((options) => {
  categoryId = options?.id || null;
  if (categoryId) {
    // 编辑模式，加载分类数据
    const res = getCategoryById(categoryId);
    if (res.success && res.data) {
      form.name = res.data.name;
      form.sort = String(res.data.sort);
    } else {
      uni.showToast({
        title: res.message || '分类加载失败',
        icon: 'none',
      });
    }
  }
});

// 监听排序输入，确保只接受数字
const onSortInput = (event: Event | { detail?: { value?: string } }) => {
  // 兼容不同平台的输入事件结构，一种是标准的 DOM 输入事件，另一种是部分平台（如微信小程序）的事件结构
  const detailValue = 'detail' in event ? event.detail?.value : undefined;
  const targetValue = 'target' in event && event.target instanceof HTMLInputElement ? event.target.value : undefined;
  form.sort = detailValue ?? targetValue ?? '';
};

// 保存分类
const save = () => {
  if (form.name.trim() === '') {
    uni.showToast({
      title: '名称不能为空',
      icon: 'none',
    });
    return;
  }

  // 将排序转换为数字，如果输入为空则默认为 0
  const sort = form.sort.trim() === '' ? 0 : Number(form.sort);

  if (Number.isNaN(sort)) {
    uni.showToast({
      title: '排序必须是数字',
      icon: 'none',
    });
    return;
  }

  // 调用添加或更新分类的服务
  let res;

  if (categoryId) {
    res = updateCategory({ id: categoryId, name: form.name.trim(), sort });
  } else {
    res = addCategory({ name: form.name.trim(), sort });
  }

  if (!res.success) {
    uni.showToast({
      title: res.message || '保存失败',
      icon: 'none',
    });
    return;
  }

  uni.navigateBack();
};

const cancel = () => {
  uni.navigateBack();
};
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx 28rpx 48rpx;
  box-sizing: border-box;
  background: linear-gradient(180deg, #f8f2e8 0%, #efe5d5 100%);
}

.hero-card,
.form-card {
  border-radius: 28rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 252, 247, 0.84);
  box-shadow: 0 16rpx 40rpx rgba(80, 55, 25, 0.06);
}

.hero-card {
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

.form-card {
  margin-top: 20rpx;
  padding: 28rpx;
}

.form-header {
  padding-bottom: 22rpx;
  border-bottom: 1rpx solid rgba(61, 43, 24, 0.08);
}

.form-title {
  color: #1e1c18;
  font-size: 30rpx;
  font-weight: 700;
}

.form-tip {
  margin-top: 8rpx;
  color: #6c645a;
  font-size: 24rpx;
  line-height: 1.7;
}

.form-group {
  margin-top: 24rpx;
}

.form-label {
  color: #3c342c;
  font-size: 26rpx;
  font-weight: 600;
}

.form-input {
  margin-top: 12rpx;
  height: 92rpx;
  padding: 0 24rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.8);
  border: 1rpx solid rgba(61, 43, 24, 0.08);
  color: #1e1c18;
  font-size: 28rpx;
  box-sizing: border-box;
}

.input-placeholder {
  color: #9d9487;
  font-size: 28rpx;
}

.form-actions {
  margin-top: 32rpx;
  display: flex;
  gap: 16rpx;
}

.btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.btn-primary {
  background: linear-gradient(135deg, #1f5eff, #3b82ff);
  color: #fff;
  box-shadow: 0 14rpx 28rpx rgba(31, 94, 255, 0.2);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.72);
  color: #6c645a;
  border: 1rpx solid rgba(61, 43, 24, 0.08);
}

@media (max-width: 320px) {
  .form-actions {
    flex-direction: column-reverse;
  }
}
</style>
