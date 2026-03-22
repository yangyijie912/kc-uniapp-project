export type quizQuery = {
  categoryId: string;
  mode: 'review' | 'unknown' | 'all';
  type: 'today' | 'freedom';
  limit: number;
};
