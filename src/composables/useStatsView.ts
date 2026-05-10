import { ref } from 'vue';
import { getCardStats } from '@/services/cardService';
import type { StatsResult } from '@/types/common';

function createEmptyStats(): StatsResult {
  return {
    total: 0,
    mastered: 0,
    fuzzy: 0,
    unknown: 0,
    dailyQuizLimit: 0,
    dailyQuizCurrentIndex: 0,
    dailyStudied: 0,
    dailyMastered: 0,
    categoryStats: {},
    activityStats: {
      '7day': {
        added: 0,
        updated: 0,
        practice: 0,
        mastered: 0,
      },
      '30day': {
        added: 0,
        updated: 0,
        practice: 0,
        mastered: 0,
      },
    },
  };
}

export default function useStatsView() {
  const stats = ref<StatsResult>(createEmptyStats());

  function loadStats() {
    const res = getCardStats();
    if (res.success && res.data) {
      stats.value = res.data;
      return;
    }

    stats.value = createEmptyStats();
    uni.showToast({
      title: res.message || '加载统计失败',
      icon: 'none',
    });
  }

  return {
    stats,
    loadStats,
  };
}
