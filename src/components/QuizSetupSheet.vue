<template>
  <view v-if="props.open" class="quiz-setup-mask" @click="closeQuizSetup"></view>

  <view v-if="props.open" class="quiz-setup-sheet">
    <view class="quiz-setup-handle"></view>

    <view class="quiz-setup-head">
      <view>
        <view class="quiz-setup-title">开始测验</view>
        <view class="quiz-setup-subtitle"> 选择测验类型和练习模式，开启刷题之旅！ </view>
      </view>
      <view class="quiz-setup-close" @click="closeQuizSetup">×</view>
    </view>

    <view class="quiz-setup-section">
      <view class="quiz-setup-label">测验类型</view>
      <view class="quiz-option-row">
        <view
          class="quiz-option"
          :class="{ active: selectedQuizType === 'freedom' }"
          @click="selectedQuizType = 'freedom'"
        >
          <view class="quiz-option-title">自由测验</view>
          <view class="quiz-option-desc">每次进入都重新开始，适合随手练习。</view>
        </view>
        <view
          class="quiz-option"
          v-if="!props.categoryId"
          :class="{ active: selectedQuizType === 'today' }"
          @click="selectedQuizType = 'today'"
        >
          <view class="quiz-option-title">每日测验</view>
          <view class="quiz-option-desc">后续支持按天固定题集和中断恢复。</view>
        </view>
      </view>
    </view>

    <view class="quiz-setup-section" v-show="selectedQuizType !== 'today'">
      <view class="quiz-setup-label">练习模式</view>
      <view class="quiz-chip-row">
        <view
          class="quiz-chip"
          :class="{ active: selectedPracticeMode === 'review' }"
          @click="selectedPracticeMode = 'review'"
        >
          复习模式
        </view>
        <view
          class="quiz-chip"
          :class="{ active: selectedPracticeMode === 'unknown' }"
          @click="selectedPracticeMode = 'unknown'"
        >
          只测不会
        </view>
        <view
          class="quiz-chip"
          :class="{ active: selectedPracticeMode === 'all' }"
          @click="selectedPracticeMode = 'all'"
        >
          全部随机
        </view>
      </view>
    </view>

    <view class="quiz-setup-section" v-show="selectedQuizType !== 'today'">
      <view class="quiz-setup-label">练习数量</view>
      <view class="quiz-chip-row quiz-limit-row">
        <view class="quiz-chip quiz-limit-chip" :class="{ active: selectedLimit === 10 }" @click="onSelectLimit(10)"
          >10</view
        >
        <view class="quiz-chip quiz-limit-chip" :class="{ active: selectedLimit === 20 }" @click="onSelectLimit(20)"
          >20</view
        >
        <view class="quiz-chip quiz-limit-chip" :class="{ active: selectedLimit === 30 }" @click="onSelectLimit(30)"
          >30</view
        >
        <view class="quiz-limit-custom">
          <input
            class="quiz-limit-input"
            type="number"
            min="1"
            placeholder="自定义数量"
            :value="customLimit"
            @input="onCustomLimitInput"
          />
        </view>
      </view>
    </view>

    <view class="quiz-setup-note">
      <view class="quiz-setup-note-label">当前预览</view>
      <view class="quiz-setup-note-text"
        >当前选择：{{ selectedQuizType === 'today' ? '每日测验' : '自由测验' }}。
        {{ selectedQuizType !== 'today' ? practiceModeText + '，' : '' }}
        数量：{{ selectedQuizType !== 'today' ? selectedLimit : '固定' + dailyQuizLimit }}</view
      >
    </view>

    <view class="quiz-setup-actions">
      <view class="quiz-setup-btn quiz-setup-btn-secondary" @click="closeQuizSetup">稍后再说</view>
      <view class="quiz-setup-btn quiz-setup-btn-primary" @click="startQuizWithCurrentUI">按当前条件开始</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { quizQuery } from '@/types/quiz';
import { dailyQuizLimit } from '@/services/quizService';

const props = defineProps<{
  open: boolean;
  categoryId?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'start', query: quizQuery): void;
}>();

const selectedPracticeMode = ref<quizQuery['mode']>('review');

const practiceModeText = computed(() => {
  if (selectedPracticeMode.value === 'unknown') {
    return '只测不会';
  }

  if (selectedPracticeMode.value === 'all') {
    return '全部随机';
  }

  return '复习模式';
});

const selectedQuizType = ref<'today' | 'freedom'>('freedom');
const selectedLimit = ref<number>(10);
const customLimit = ref<number | null>(null);

const closeQuizSetup = () => {
  emit('close');
};

const startQuizWithCurrentUI = () => {
  emit('start', {
    mode: selectedPracticeMode.value,
    type: selectedQuizType.value,
    limit: selectedLimit.value,
  } as quizQuery);
};

const onSelectLimit = (num?: number) => {
  selectedLimit.value = num || 10;
};

const onCustomLimitInput = (event: Event | { detail?: { value?: string; cursor?: number } }) => {
  const eventTarget = 'target' in event && event.target instanceof HTMLTextAreaElement ? event.target : undefined;
  const eventDetail = 'detail' in event ? event.detail : undefined;
  const value = eventDetail?.value ?? eventTarget?.value ?? '';
  const numericValue = parseInt(value, 10);
  if (!isNaN(numericValue) && numericValue > 0) {
    customLimit.value = numericValue;
    selectedLimit.value = numericValue;
  } else {
    customLimit.value = null;
  }
};
</script>

<style scoped>
.quiz-setup-mask,
.quiz-setup-sheet {
  --quiz-sheet-text-main: #1e1c18;
  --quiz-sheet-text-muted: #6c645a;
  --quiz-sheet-accent-teal: #127a72;
  --quiz-sheet-accent-blue: #1f5eff;
  --quiz-sheet-surface: rgba(255, 252, 247, 0.84);
  --quiz-sheet-surface-strong: rgba(255, 255, 255, 0.78);
  --quiz-sheet-line-soft: rgba(61, 43, 24, 0.12);
}

.quiz-setup-mask {
  position: fixed;
  inset: 0;
  background: rgba(30, 28, 24, 0.3);
  backdrop-filter: blur(8rpx);
  z-index: 20;
}

.quiz-setup-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 18rpx 28rpx 36rpx;
  border-radius: 36rpx 36rpx 0 0;
  background:
    radial-gradient(circle at top right, rgba(31, 94, 255, 0.12), transparent 30%),
    linear-gradient(180deg, rgba(255, 252, 247, 0.98), rgba(248, 242, 232, 0.98));
  box-shadow: 0 -18rpx 48rpx rgba(80, 55, 25, 0.12);
  box-sizing: border-box;
  z-index: 21;
}

.quiz-setup-handle {
  width: 96rpx;
  height: 8rpx;
  margin: 0 auto 18rpx;
  border-radius: 999rpx;
  background: rgba(61, 43, 24, 0.12);
}

.quiz-setup-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
}

.quiz-setup-title {
  color: var(--quiz-sheet-text-main);
  font-size: 36rpx;
  font-weight: 700;
}

.quiz-setup-subtitle {
  margin-top: 10rpx;
  color: var(--quiz-sheet-text-muted);
  font-size: 24rpx;
  line-height: 1.7;
}

.quiz-setup-close {
  width: 56rpx;
  height: 56rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.84);
  color: var(--quiz-sheet-text-muted);
  font-size: 36rpx;
  line-height: 1;
}

.quiz-setup-section {
  margin-top: 24rpx;
}

.quiz-setup-label {
  color: var(--quiz-sheet-text-main);
  font-size: 26rpx;
  font-weight: 700;
}

.quiz-option-row {
  margin-top: 16rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.quiz-option {
  min-height: 154rpx;
  padding: 24rpx 22rpx;
  border-radius: 24rpx;
  border: 1rpx solid rgba(31, 94, 255, 0.14);
  background: rgba(255, 255, 255, 0.78);
  box-sizing: border-box;
}

.quiz-option.active {
  background: linear-gradient(135deg, rgba(31, 94, 255, 0.12), rgba(255, 255, 255, 0.82));
  box-shadow: 0 12rpx 28rpx rgba(31, 94, 255, 0.1);
}
/* 
.quiz-option-disabled {
  border-color: rgba(61, 43, 24, 0.08);
  background: rgba(244, 239, 231, 0.88);
  opacity: 0.76;
} */

.quiz-option-title {
  color: var(--quiz-sheet-text-main);
  font-size: 28rpx;
  font-weight: 700;
}

.quiz-option-desc {
  margin-top: 12rpx;
  color: var(--quiz-sheet-text-muted);
  font-size: 22rpx;
  line-height: 1.7;
}

.quiz-chip-row {
  margin-top: 16rpx;
  display: flex;
  gap: 14rpx;
  flex-wrap: wrap;
}

.quiz-chip {
  min-width: 164rpx;
  height: 72rpx;
  padding: 0 24rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.08);
  background: var(--quiz-sheet-surface-strong);
  color: var(--quiz-sheet-text-muted);
  font-size: 24rpx;
  font-weight: 600;
  box-sizing: border-box;
}

.quiz-chip.active {
  border-color: rgba(31, 94, 255, 0.16);
  background: rgba(31, 94, 255, 0.12);
  color: var(--quiz-sheet-accent-blue);
}

.quiz-limit-row {
  gap: 12rpx;
}

.quiz-limit-chip {
  min-width: 108rpx;
  padding: 0 28rpx;
}

.quiz-limit-custom {
  flex: 1;
  min-width: 0;
  height: 72rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  border-radius: 999rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.08);
  background: var(--quiz-sheet-surface-strong);
  box-sizing: border-box;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.quiz-limit-custom:focus-within {
  border-color: rgba(31, 94, 255, 0.55);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 0 0 6rpx rgba(31, 94, 255, 0.12);
}

.quiz-limit-input {
  width: 100%;
  height: 100%;
  color: var(--quiz-sheet-text-main);
  font-size: 24rpx;
  caret-color: var(--quiz-sheet-accent-blue);
}

.quiz-limit-input:focus {
  outline: none;
}

.quiz-setup-note {
  margin-top: 22rpx;
  padding: 22rpx 24rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.7);
  border: 1rpx dashed var(--quiz-sheet-line-soft);
}

.quiz-setup-note-label {
  color: var(--quiz-sheet-accent-teal);
  font-size: 22rpx;
  font-weight: 700;
}

.quiz-setup-note-text {
  margin-top: 10rpx;
  color: var(--quiz-sheet-text-muted);
  font-size: 24rpx;
  line-height: 1.7;
}

.quiz-setup-actions {
  margin-top: 24rpx;
  display: flex;
  gap: 16rpx;
}

.quiz-setup-btn {
  flex: 1;
  height: 84rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 600;
}

.quiz-setup-btn-secondary {
  background: var(--quiz-sheet-surface-strong);
  color: var(--quiz-sheet-text-muted);
}

.quiz-setup-btn-primary {
  background: linear-gradient(135deg, #1f5eff, #3b82ff);
  color: #fff;
  box-shadow: 0 16rpx 32rpx rgba(31, 94, 255, 0.22);
}

@media (max-width: 320px) {
  .quiz-option-row {
    grid-template-columns: 1fr;
  }
  .quiz-setup-actions {
    flex-direction: column;
  }
}
</style>
