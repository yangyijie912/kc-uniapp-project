import { CARD_STORAGE_KEY, DAILY_QUIZ_SESSION_KEY } from '@/constants/storageKeys';
import type { ServiceResult } from '@/types/service';
import { success, fail } from './serviceHelper';
import { shuffle } from '@/utils/arrayUtils';
import type { Card, CardView } from '@/types/card';
import type { DailyQuizSession, quizQuery, QuizResultSummary } from '@/types/quiz';
import { getCategories } from './categoryService';
import { toCardViews } from '@/utils/cardView';

// 获取当天的日期键，用于存储和比较每日测验数据
export function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateKey = `${year}-${month}-${day}`;
  return dateKey;
}

// 从本地存储加载卡片列表
function loadCardList(): Card[] {
  return JSON.parse(uni.getStorageSync(CARD_STORAGE_KEY) || '[]') as Card[];
}

// 获取分类列表
function getCategoryList() {
  const categoryRes = getCategories();
  return categoryRes.success && categoryRes.data ? categoryRes.data : [];
}

// 将测验选项中的 limit 参数规范化为一个有效的正整数，如果无效则使用默认值
function normalizeLimit(limit?: number, fallback = 10): number {
  if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
    return Math.floor(limit);
  }
  return fallback;
}

// 根据测验选项过滤卡片列表
function filterQuizCards(cardList: Card[], quizOptions: Partial<quizQuery>, ignoreMode = false): Card[] {
  let list = [...cardList];

  if (!ignoreMode && quizOptions.categoryId) {
    list = list.filter((card) => card.categoryId === quizOptions.categoryId);
  }

  if (ignoreMode) {
    return list;
  }
  if (quizOptions.mode === 'review') {
    return list.filter((card) => card.status === 'unknown' || card.status === 'fuzzy');
  }
  if (quizOptions.mode === 'unknown') {
    return list.filter((card) => card.status === 'unknown');
  }
  return list;
}

// 构建测验题目队列，先根据测验选项过滤卡片列表，然后随机打乱并限制数量，最后转换为卡片视图
function buildQueue(quizOptions: Partial<quizQuery>, ignoreMode = false): CardView[] {
  const filteredList = filterQuizCards(loadCardList(), quizOptions, ignoreMode);
  const limit = normalizeLimit(quizOptions.limit);
  return toCardViews(shuffle(filteredList).slice(0, limit), getCategoryList());
}

// 创建一个空的测验结果统计对象，初始值为0
function createEmptyQuizResult(total = 0): QuizResultSummary {
  return {
    total,
    unknown: 0,
    fuzzy: 0,
    mastered: 0,
  };
}

// 读取每日测验进度数据，如果不存在或解析失败则返回null
function readDailyQuizSession(): DailyQuizSession | null {
  const stored = uni.getStorageSync(DAILY_QUIZ_SESSION_KEY);
  if (!stored) {
    return null;
  }
  try {
    return JSON.parse(stored) as DailyQuizSession;
  } catch {
    return null;
  }
}

// 保存每日测验进度数据到本地存储
function saveDailyQuizSession(session: DailyQuizSession) {
  uni.setStorageSync(DAILY_QUIZ_SESSION_KEY, JSON.stringify(session));
}

// 判断是否可以重用现有的每日测验进度数据，条件是日期键和题目数量都匹配
function shouldReuseDailySession(session: DailyQuizSession, quizOptions: Partial<quizQuery>, dateKey: string): boolean {
  return session.dateKey === dateKey && session.limit === normalizeLimit(quizOptions.limit);
}

// 获取每日测验进度数据
export function getDailyQuizSession(quizOptions: Partial<quizQuery>): ServiceResult<DailyQuizSession> {
  const todayKey = getDateKey(new Date());
  const storedSession = readDailyQuizSession();
  // 如果现有数据符合条件则重用，否则创建新的测验进度数据并保存到本地存储
  if (storedSession && shouldReuseDailySession(storedSession, quizOptions, todayKey)) {
    return success(storedSession);
  }
  const queue = buildQueue(quizOptions, true);
  if (queue.length === 0) {
    return fail('没有符合条件的题目');
  }
  const session: DailyQuizSession = {
    dateKey: todayKey,
    limit: normalizeLimit(quizOptions.limit),
    queue,
    currentIndex: 0,
    result: createEmptyQuizResult(queue.length),
    finished: false,
    lastAnsweredAt: Date.now(),
  };
  saveDailyQuizSession(session);
  return success(session);
}

// 更新每日测验进度数据
export function updateDailyQuizSessionProgress(
  progress: Pick<DailyQuizSession, 'currentIndex' | 'result' | 'finished'>,
) {
  const session = readDailyQuizSession();
  if (!session) {
    return fail('每日测验进度不存在');
  }
  // 只更新进度相关的字段，保持其他字段不变
  const nextSession: DailyQuizSession = {
    ...session,
    currentIndex: progress.currentIndex,
    result: {
      ...progress.result,
      total: session.queue.length,
    },
    finished: progress.finished,
    lastAnsweredAt: Date.now(),
  };
  saveDailyQuizSession(nextSession);
  return success(nextSession);
}

// 获取每日测验题目列表
export function getDailyQuizQuestions(quizOptions: Partial<quizQuery>): ServiceResult<CardView[]> {
  const res = getDailyQuizSession(quizOptions);
  if (!res.success || !res.data) {
    return fail(res.message || '没有符合条件的题目');
  }
  return success(res.data.queue);
}

// 获取自由测验题目列表
export function getFreedomQuizQuestions(quizOptions: Partial<quizQuery>): ServiceResult<CardView[]> {
  const quiz = buildQueue(quizOptions);
  if (quiz.length === 0) {
    return fail('没有符合条件的题目');
  }
  return success(quiz);
}
