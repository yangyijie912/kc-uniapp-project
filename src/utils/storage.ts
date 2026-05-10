import { DAILY_QUIZ_SESSION_KEY } from '@/constants/storageKeys';
import type { DailyQuizSession } from '@/types/quiz';
import { getDateKey } from './date';

// 读取每日测验进度数据，如果不存在或解析失败则返回null
export function readDailyQuizSession(): DailyQuizSession | null {
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

// 统计页只需要读取当天已有进度，不应该因为查看统计而创建新的每日测验 session。
export function getStoredDailyQuizSession(): DailyQuizSession | null {
  const session = readDailyQuizSession();
  if (!session) {
    return null;
  }

  const todayKey = getDateKey(new Date());
  return session.dateKey === todayKey ? session : null;
}
