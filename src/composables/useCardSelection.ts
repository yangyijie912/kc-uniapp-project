import { computed, ref, type Ref } from 'vue';
import type { InteractionMode } from '@/types/card';

type CardTouchEvent = Pick<TouchEvent, 'touches' | 'changedTouches'>;

type UseCardSelectionOptions = {
  interactionMode: Ref<InteractionMode>;
  setInteractionMode: (mode: InteractionMode) => void;
  isSearchResultMode: Ref<boolean>;
};

export default function useCardSelection(options: UseCardSelectionOptions) {
  const longPressDuration = 500;
  const longPressMoveThreshold = 12;

  // 选择态需要记住当前触摸会话、长按是否触发，以及是否已经因为滑动被取消。
  const selectedCards = ref<string[]>([]);
  const longPressTimer = ref<ReturnType<typeof setTimeout> | null>(null);
  const touchedCardId = ref('');
  const longPressTriggered = ref(false);
  const touchStartPoint = ref<{ x: number; y: number } | null>(null);
  const touchMoveCanceled = ref(false);

  const isSelectMode = computed(() => options.interactionMode.value === 'select');

  const clearLongPressState = () => {
    if (longPressTimer.value) {
      clearTimeout(longPressTimer.value);
      longPressTimer.value = null;
    }
  };

  const clearTouchState = () => {
    clearLongPressState();
    touchedCardId.value = '';
    longPressTriggered.value = false;
    touchMoveCanceled.value = false;
    touchStartPoint.value = null;
  };

  // 退出多选时只清理选择相关状态，不在这里偷偷切换页面模式。
  const resetSelectionState = () => {
    selectedCards.value = [];
    clearTouchState();
  };

  const enterSelectMode = (id: string) => {
    if (options.isSearchResultMode.value) return;

    options.setInteractionMode('select');
    if (!selectedCards.value.includes(id)) {
      selectedCards.value.push(id);
    }
  };

  const exitSelectMode = () => {
    resetSelectionState();
  };

  const getTouchPoint = (event: CardTouchEvent) => {
    return event.touches?.[0] || event.changedTouches?.[0] || null;
  };

  const handleCardClick = (id: string) => {
    if (options.interactionMode.value === 'sort') {
      return;
    }

    if (longPressTriggered.value && touchedCardId.value === id) {
      longPressTriggered.value = false;
      touchedCardId.value = '';
      touchStartPoint.value = null;
      touchMoveCanceled.value = false;
      return;
    }

    if (touchMoveCanceled.value && touchedCardId.value === id) {
      touchedCardId.value = '';
      touchMoveCanceled.value = false;
      touchStartPoint.value = null;
      return;
    }

    if (isSelectMode.value) {
      if (selectedCards.value.includes(id)) {
        selectedCards.value = selectedCards.value.filter((cardId) => cardId !== id);
      } else {
        selectedCards.value.push(id);
      }
      return;
    }

    uni.navigateTo({
      url: `/pages/cardDetail/index?id=${id}`,
    });
  };

  const handleCardTouchStart = (id: string, event: CardTouchEvent) => {
    if (
      options.isSearchResultMode.value ||
      options.interactionMode.value === 'sort' ||
      isSelectMode.value
    ) {
      return;
    }

    clearLongPressState();
    touchedCardId.value = id;
    longPressTriggered.value = false;
    touchMoveCanceled.value = false;

    const point = getTouchPoint(event);
    touchStartPoint.value = point ? { x: point.clientX, y: point.clientY } : null;
    longPressTimer.value = setTimeout(() => {
      longPressTriggered.value = true;
      enterSelectMode(id);
    }, longPressDuration);
  };

  const handleCardTouchEnd = () => {
    clearLongPressState();
  };

  const handleCardTouchMove = (event: CardTouchEvent) => {
    if (options.interactionMode.value === 'sort' || isSelectMode.value || !touchStartPoint.value) {
      return;
    }

    const point = getTouchPoint(event);
    if (!point) {
      return;
    }

    const deltaX = Math.abs(point.clientX - touchStartPoint.value.x);
    const deltaY = Math.abs(point.clientY - touchStartPoint.value.y);

    if (Math.max(deltaX, deltaY) < longPressMoveThreshold) {
      return;
    }

    // 移动超过阈值后，说明用户是在滚动而不是准备长按，取消这次选择会话。
    touchMoveCanceled.value = true;
    clearLongPressState();
  };

  return {
    selectedCards,
    isSelectMode,
    enterSelectMode,
    exitSelectMode,
    resetSelectionState,
    handleCardClick,
    handleCardTouchStart,
    handleCardTouchEnd,
    handleCardTouchMove,
  };
}
