import { computed, ref } from 'vue';
import type { InteractionMode } from '@/types/card';

export default function useCardListInteraction() {
  const interactionMode = ref<InteractionMode>('browse');

  const isBrowseMode = computed(() => interactionMode.value === 'browse');
  const isSelectMode = computed(() => interactionMode.value === 'select');
  const isSortMode = computed(() => interactionMode.value === 'sort');

  const setInteractionMode = (mode: InteractionMode) => {
    interactionMode.value = mode;
  };

  return {
    interactionMode,
    isBrowseMode,
    isSelectMode,
    isSortMode,
    setInteractionMode,
  };
}
