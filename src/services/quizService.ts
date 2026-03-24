import { CARD_STORAGE_KEY, DAILY_QUIZ_DATE_KEY, DAILY_QUIZ_STORAGE_KEY } from '@/constants/storageKeys';
import type { ServiceResult } from '@/types/service';
import { success, fail } from './serviceHelper';
import { shuffle } from '@/utils/arrayUtils';
import type { Card } from '@/types/card';
import type { quizQuery } from '@/types/quiz';

// 获取当天的日期键，用于存储和比较每日测验数据
export function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateKey = `${year}-${month}-${day}`;
  return dateKey;
}

export function buildQueue(): Card[] {
  // 先拿到所有卡片
  const cardList = JSON.parse(uni.getStorageSync(CARD_STORAGE_KEY) || '[]') as Card[];
  // 从所有卡片中筛选出当天的测验题目，这里先完全随机抽取10道题目
  const shuffled = shuffle(cardList);
  const dailyQuiz = shuffled.slice(0, 10);
  return dailyQuiz.map((card) => card);
}

// 获取每日测验题目列表
export function getDailyQuizQuestions(): ServiceResult<Card[]> {
  let queue = [] as Card[];
  // 每次进入测验页都检查是否需要更新今日测验题目
  const todayKey = getDateKey(new Date());
  const storedKey = uni.getStorageSync(DAILY_QUIZ_DATE_KEY);
  if (storedKey !== todayKey) {
    // 日期不匹配，说明需要更新今日测验题目
    uni.setStorageSync(DAILY_QUIZ_DATE_KEY, todayKey);
    queue = buildQueue();
    uni.setStorageSync(DAILY_QUIZ_STORAGE_KEY, JSON.stringify(queue));
  } else {
    // 日期匹配，说明可以继续使用之前的题目
    const storedQuiz = uni.getStorageSync(DAILY_QUIZ_STORAGE_KEY);
    if (storedQuiz) {
      queue = JSON.parse(storedQuiz);
    } else {
      queue = buildQueue();
      uni.setStorageSync(DAILY_QUIZ_STORAGE_KEY, JSON.stringify(queue));
    }
  }
  if (queue.length === 0) {
    return fail('没有符合条件的题目');
  }
  return success(queue);
}

// 获取自由测验题目列表
export function getFreedomQuizQuestions(quizOptions: Partial<quizQuery>): ServiceResult<Card[]> {
  let list = JSON.parse(uni.getStorageSync(CARD_STORAGE_KEY) || '[]') as Card[];
  if (quizOptions.categoryId) {
    list = list.filter((card) => card.categoryId === quizOptions.categoryId);
  }
  if (quizOptions.mode === 'review') {
    list = list.filter((card) => card.status === 'unknown' || card.status === 'fuzzy');
  } else if (quizOptions.mode === 'unknown') {
    list = list.filter((card) => card.status === 'unknown');
  }
  if (list.length === 0) {
    return fail('没有符合条件的题目');
  }
  const quiz = shuffle(list).slice(0, quizOptions.limit);
  if (quiz.length === 0) {
    return fail('没有符合条件的题目');
  }
  return success(quiz);
}
