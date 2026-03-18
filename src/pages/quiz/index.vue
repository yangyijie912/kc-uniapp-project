<template>
  <view class="page">
    <view class="progress-card">
      <view class="progress-top">
        <view class="progress-label">今日测验</view>
        <view class="progress-count">{{ cardIndex + 1 }} / {{ cardQueue.length }}</view>
      </view>
      <view class="progress-track">
        <view class="progress-bar" :style="{ width: ((cardIndex + 1) / cardQueue.length) * 100 + '%' }"></view>
      </view>
    </view>

    <view class="question-card">
      <view class="question-top">
        <view class="question-category">
          {{ currentCard?.categoryName }}
        </view>

        <text class="question-tag">
          {{ Array.isArray(currentCard?.tags) && currentCard?.tags?.length > 0 ? '/ ' : '' }}
          {{ currentCard?.tags?.join('•') }}
        </text>
      </view>
      <view class="question-title">{{ currentCard?.question }}</view>
      <!-- <view class="question-desc">{{ currentCard?.description }}</view> -->
      <view class="reveal-btn" @click="toggleAnswer">
        {{ showAnswer ? '收起答案' : '展开查看答案' }}
      </view>
    </view>

    <view v-if="showAnswer" class="answer-panel">
      <view class="answer-label">参考答案</view>
      <view class="answer-text">{{ currentCard?.answer }}</view>
      <!-- <view class="answer-tip">记忆点：先想 useEffect 的返回值，再判断 async 会不会破坏这个约定。</view> -->

      <view class="content-block">
        <view class="content-label">补充笔记</view>
        <MarkdownContent :content="content" />
      </view>
    </view>

    <view class="bottom-row">
      <view class="status-btn status-unknown" @click="onQuiz(cardStatusTextMap.unknown)">不会</view>
      <view class="status-btn status-fuzzy" @click="onQuiz(cardStatusTextMap.fuzzy)">模糊</view>
      <view class="status-btn status-mastered" @click="onQuiz(cardStatusTextMap.mastered)">掌握</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import MarkdownContent from '@/components/MarkdownContent.vue';
import useCardListView from '@/composables/useCardListView';
import { onShow, onLoad } from '@dcloudio/uni-app';
import { cardStatusTextMap } from '@/constants/cardStatus';

const { cardViewList, loadAllData, setQueryParams } = useCardListView();

// 当前队列的卡片列表，后续再调整
const cardQueue = ref(cardViewList);
const cardIndex = ref(0); // 当前卡片索引，初始为0
const currentCard = computed(() => cardQueue.value[cardIndex.value] || null);

const showAnswer = ref(false);
const content = `# 一级标题

**重点内容**

---

> 在这里写引用内容

- 第一项
- 第二项
- 第三项

[链接文字](https://example.com)

![图片描述](https://example.com/image.jpg)

| Header 1 | Header 2 | Header 3 |
| --- | --- | --- |
| Cell 1-1 | Cell 1-2 | Cell 1-3 |
| Cell 2-1 | Cell 2-2 | Cell 2-3 |
| Cell 3-1 | Cell 3-2 | Cell 3-3 |

---`;

const toggleAnswer = () => {
  showAnswer.value = !showAnswer.value;
};

const changeStatus = (cardId: string | undefined, status: string) => {
  if (!cardId) return;

  // 后续处理状态更新的逻辑，比如调用接口更新状态等
  console.log(`卡片ID: ${cardId}, 新状态: ${status}`);
};

// 进入下一题
const nextQuestion = () => {
  if (cardIndex.value < cardQueue.value.length - 1) {
    cardIndex.value += 1;
    showAnswer.value = false; // 切换到下一题时默认隐藏答案
  } else {
    uni.showToast({
      title: '已经是最后一张了',
      icon: 'none',
    });
  }
};

// 选择状态后进入下一题
const onQuiz = (status: string) => {
  switch (status) {
    case cardStatusTextMap.unknown:
      changeStatus(currentCard.value?.id, 'unknown');
      nextQuestion();
      break;
    case cardStatusTextMap.fuzzy:
      changeStatus(currentCard.value?.id, 'fuzzy');
      nextQuestion();
      break;
    case cardStatusTextMap.mastered:
      changeStatus(currentCard.value?.id, 'mastered');
      nextQuestion();
      break;
  }
};

onLoad(() => {
  setQueryParams({
    categoryId: '2', // 默认先加载一个分类的卡片，后续再改
  });
});

onShow(() => {
  loadAllData();
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx 28rpx 48rpx;
  box-sizing: border-box;
  background: linear-gradient(180deg, #f8f2e8 0%, #efe5d5 100%);
}

.progress-card,
.question-card,
.answer-item {
  border-radius: 28rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 252, 247, 0.84);
  box-shadow: 0 16rpx 40rpx rgba(80, 55, 25, 0.06);
}

.progress-card,
.question-card {
  padding: 28rpx;
}

.progress-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-label,
.progress-count {
  font-size: 24rpx;
}

.progress-label {
  color: #127a72;
}

.question-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.question-category {
  color: #127a72;
  font-size: 22rpx;
}

.question-tag {
  color: #9d9487;
  font-size: 22rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.progress-count {
  color: #6c645a;
}

.progress-track {
  margin-top: 16rpx;
  height: 16rpx;
  border-radius: 999rpx;
  background: rgba(31, 94, 255, 0.08);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #1f5eff, #5e93ff);
}

.question-card {
  margin-top: 22rpx;
}

.question-title {
  margin-top: 12rpx;
  color: #1e1c18;
  font-size: 40rpx;
  line-height: 1.4;
  font-weight: 700;
}

/* .question-desc {
  margin-top: 14rpx;
  color: #6c645a;
  font-size: 26rpx;
} */

.reveal-btn {
  margin-top: 22rpx;
  height: 78rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: rgba(31, 94, 255, 0.1);
  color: #1f5eff;
  font-size: 26rpx;
  font-weight: 600;
}

.answer-panel {
  margin-top: 22rpx;
  padding: 28rpx;
  border-radius: 28rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 252, 247, 0.84);
  box-shadow: 0 16rpx 40rpx rgba(80, 55, 25, 0.06);
}

.answer-label {
  color: #127a72;
  font-size: 22rpx;
}

.answer-text {
  margin-top: 12rpx;
  color: #1e1c18;
  font-size: 30rpx;
  line-height: 1.7;
}

/* .answer-tip {
  margin-top: 14rpx;
  color: #6c645a;
  font-size: 24rpx;
  line-height: 1.7;
} */

.content-block {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid rgba(61, 43, 24, 0.08);
}

.content-label {
  color: #127a72;
  font-size: 22rpx;
}

.bottom-row {
  margin-top: 24rpx;
  display: flex;
  gap: 16rpx;
}

.status-btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.status-unknown {
  background: rgba(255, 255, 255, 0.72);
  color: #6c645a;
}

.status-fuzzy {
  background: rgba(239, 125, 66, 0.14);
  color: #c76530;
}

.status-mastered {
  background: #ef7d42;
  color: #fff7ed;
}
</style>
