<template>
  <view class="page">
    <view class="hero-card">
      <view class="eyebrow">Card Editor</view>
      <view class="title">{{ cardId ? '编辑卡片' : '新增卡片' }}</view>
      <view class="desc">先把题目、答案和标签整理清楚，后面再把保存、删除和跳转行为补齐。</view>
    </view>

    <view class="form-card">
      <view class="form-header">
        <view class="form-title">基础信息</view>
        <view class="form-tip">卡片先维护分类、题目和答案，状态继续交给测验页处理。</view>
      </view>

      <view class="form-group">
        <view class="form-label">分类</view>
        <picker :range="categoryOptions" range-key="name" :value="pickerIndex" @change="onCategoryChange">
          <view class="picker-input" :class="{ 'picker-placeholder': !selectedCategoryName }">
            {{ selectedCategoryName || '请选择分类' }}
          </view>
        </picker>
      </view>

      <view class="form-group">
        <view class="form-label">问题</view>
        <textarea
          v-model="form.question"
          class="form-textarea form-textarea-title"
          placeholder="例如：Vue 的 computed 和 watch 有什么区别？"
          placeholder-class="input-placeholder"
          auto-height
        />
      </view>

      <view class="form-group">
        <view class="form-label">答案</view>
        <textarea
          v-model="form.answer"
          class="form-textarea"
          placeholder="先写一个简短、能直接展示的答案。"
          placeholder-class="input-placeholder"
          auto-height
        />
      </view>

      <view class="form-group">
        <view class="form-label">正文内容</view>
        <textarea
          v-model="form.content"
          class="form-textarea form-textarea-content"
          placeholder="补充更完整的解释、例子或笔记内容。"
          placeholder-class="input-placeholder"
          auto-height
        />
      </view>

      <view class="form-group">
        <view class="form-label">标签</view>
        <input
          v-model="form.tagsText"
          class="form-input"
          placeholder="例如：响应式、生命周期、组件通信"
          placeholder-class="input-placeholder"
        />
        <view class="field-tip">先用中文顿号或逗号分隔，后面再统一清洗成 tags。</view>
      </view>

      <view v-if="cardId" class="danger-card">
        <view>
          <view class="danger-title">危险操作</view>
          <view class="danger-desc">删除卡片会从本地题库中移除，建议等 CRUD 接好后再放开。</view>
        </view>
        <view class="danger-btn" @click="deleteCard">删除卡片</view>
      </view>

      <view class="form-actions">
        <view class="btn btn-secondary" @click="cancel">取消</view>
        <view class="btn btn-primary" @click="save">保存</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getCategories } from '@/services/categoryService';
import { getCardById } from '@/services/cardService';
import type { Category } from '@/types/card';

const cardId = ref<string | null>(null);
const categoryOptions = ref<Category[]>([]);

const form = reactive({
  categoryId: '',
  question: '',
  answer: '',
  content: '',
  tagsText: '',
});

// 计算当前选中分类在 picker 中的索引
const pickerIndex = computed(() => {
  const index = categoryOptions.value.findIndex((category) => category.id === form.categoryId);
  return index === -1 ? 0 : index;
});

// 计算当前选中分类的名称，用于展示在 picker 输入框中
const selectedCategoryName = computed(() => {
  return categoryOptions.value.find((category) => category.id === form.categoryId)?.name || '';
});

// 监听分类选择变化，更新 form.categoryId
function onCategoryChange(event: { detail: { value: string } }) {
  const index = Number(event.detail.value);
  const category = categoryOptions.value[index];

  if (category) {
    form.categoryId = category.id;
  }
}

// 加载分类列表，优先设置 form.categoryId 为第一个分类的 id，确保有默认值
function loadCategories() {
  const res = getCategories();

  if (res.success && res.data) {
    categoryOptions.value = res.data;
    console.log('Loaded categories:', categoryOptions.value);

    if (!form.categoryId && res.data.length > 0) {
      form.categoryId = res.data[0].id;
    }

    return;
  }

  categoryOptions.value = [];
  uni.showToast({
    title: res.message || '分类加载失败',
    icon: 'none',
  });
}

// 加载卡片数据
function loadCard(id: string) {
  const res = getCardById(id);

  if (res.success && res.data) {
    form.categoryId = res.data.categoryId;
    form.question = res.data.question;
    form.answer = res.data.answer;
    form.content = res.data.content || '';
    form.tagsText = res.data.tags?.join('、') || '';
    return;
  }

  uni.showToast({
    title: res.message || '卡片加载失败',
    icon: 'none',
  });
}

function cancel() {
  uni.navigateBack();
}

function save() {
  uni.showToast({
    title: '样式已就位，保存逻辑下一步接入',
    icon: 'none',
  });
}

function deleteCard() {
  uni.showToast({
    title: '删除逻辑下一步接入',
    icon: 'none',
  });
}

onLoad((options) => {
  loadCategories();

  cardId.value = options?.id || null;
  if (cardId.value) {
    loadCard(cardId.value);
    return;
  }

  if (options?.categoryId) {
    form.categoryId = options.categoryId;
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

.hero-card,
.form-card,
.danger-card {
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

.form-input,
.picker-input,
.form-textarea {
  margin-top: 12rpx;
  width: 100%;
  padding: 22rpx 24rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.8);
  border: 1rpx solid rgba(61, 43, 24, 0.08);
  color: #1e1c18;
  font-size: 28rpx;
  box-sizing: border-box;
}

.form-input,
.picker-input {
  min-height: 92rpx;
  display: flex;
  align-items: center;
}

.form-textarea {
  min-height: 180rpx;
  line-height: 1.7;
}

.form-textarea-title {
  min-height: 140rpx;
}

.form-textarea-content {
  min-height: 280rpx;
}

.picker-placeholder,
.input-placeholder {
  color: #9d9487;
  font-size: 28rpx;
}

.field-tip {
  margin-top: 10rpx;
  color: #8b8378;
  font-size: 22rpx;
  line-height: 1.6;
}

.danger-card {
  margin-top: 28rpx;
  padding: 24rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  background: rgba(255, 244, 238, 0.92);
  border-color: rgba(199, 101, 48, 0.16);
}

.danger-title {
  color: #8b3f18;
  font-size: 28rpx;
  font-weight: 700;
}

.danger-desc {
  margin-top: 8rpx;
  color: #9b6a50;
  font-size: 23rpx;
  line-height: 1.7;
}

.danger-btn {
  min-width: 160rpx;
  height: 76rpx;
  padding: 0 22rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: rgba(199, 101, 48, 0.12);
  color: #c76530;
  font-size: 24rpx;
  font-weight: 600;
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
  .danger-card,
  .form-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .danger-btn {
    width: 100%;
  }
}
</style>
