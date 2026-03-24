// 测验页面查询参数类型定义
export type quizQuery = {
  categoryId: string;
  mode: 'review' | 'unknown' | 'all';
  type: 'today' | 'freedom';
  limit: number;
};

// 每日测验进度类型定义
export type DailyQuizProgress = {
  dateKey: string; // 测验日期键
  currentIndex: number; // 当前测验题目索引
  correctCount: number; // 已答对题目数量
  wrongCount: number; // 已答错题目数量
  finished: boolean; // 是否完成测验
  total: number; // 测验总题目数量
  lastAnsweredAt: number; // 上次答题时间
};
