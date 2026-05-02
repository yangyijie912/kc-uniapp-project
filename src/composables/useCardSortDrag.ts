import {
  computed,
  getCurrentInstance,
  nextTick,
  ref,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue';
import { updateCardOrderInCategory } from '@/services/cardService';
import type { Card, CardSortConfig, Move } from '@/types/card';
import type { InteractionMode } from '@/types/card';

type SortOption = {
  label: string;
  value: CardSortConfig;
};

type DragTarget = {
  anchorId: string;
  position: 'before' | 'after';
};

type UseCardSortDragOptions = {
  cardList: Ref<Card[]>;
  interactionMode: Ref<InteractionMode>;
  setInteractionMode: (mode: InteractionMode) => void;
  categoryId: ComputedRef<string | undefined>;
  isSearchResultMode: Ref<boolean>;
  selectedSortIndex: Ref<number>;
  sortOptions: SortOption[];
  scrollTop: Ref<number>;
  loadCurrentPages: () => void;
  clearTouchState: () => void;
};

export default function useCardSortDrag(options: UseCardSortDragOptions) {
  const {
    cardList,
    interactionMode,
    setInteractionMode,
    categoryId,
    isSearchResultMode,
    selectedSortIndex,
    sortOptions,
    scrollTop,
    loadCurrentPages,
    clearTouchState,
  } = options;
  const instance = getCurrentInstance();

  // 当前被排序手柄激活的卡片，用来给拖拽态样式留一个稳定锚点。
  const activeSortCardId = ref('');
  const draggingCardId = ref('');
  // 拖拽过程中只保留“最新一次相对锚点的移动”，松手时再交给服务层按全量顺序回放。
  const currentMove = ref<Move | null>(null);
  const cardRects = ref<UniApp.NodeInfo[]>([]);
  const scrollViewportRect = ref<UniApp.NodeInfo | null>(null);
  // 每次自动滚动推进的像素值。值太小会显得拖不动，值太大又会导致命中区域跳得太快。
  const autoScrollStep = 36;
  // 手指进入视口上下边缘多少像素后开始自动滚动。
  // 这里故意放宽一点，避免必须贴到最边缘才触发，手感会太紧。
  const autoScrollEdgePadding = 88;
  // 两次程序自动滚动之间至少间隔多久，单位 ms。
  // 这是节流，不然 touchmove 高频触发时 scrollTop 会被连续推得过猛。
  const autoScrollCooldown = 96;
  // 原生滚动刚发生后的静默窗口，单位 ms。
  // 在这个窗口里禁止程序自动滚动，避免用户手势滚动和代码滚动互相抢控制权。
  const nativeScrollQuietWindow = 140;
  // 最近一次程序自动滚动发生的时间，用于 autoScrollCooldown 节流。
  const lastAutoScrollAt = ref(0);
  // 最近一次被判定为“原生滚动”的时间，用于 nativeScrollQuietWindow 静默判定。
  const lastNativeScrollAt = ref(0);
  // 程序主动改写 scrollTop 后，在这之前收到的 scroll 变化都视为“自己触发的后续回响”。
  // 只要还没过这个时间点，就不要把这次 scrollTop 变化误判成用户原生滚动。
  const programmaticScrollUntil = ref(0);

  // 拖拽结束、模式退出或分类上下文变化时，都要把这一轮拖拽会话的临时态一次性回收。
  const resetSortState = () => {
    activeSortCardId.value = '';
    draggingCardId.value = '';
    currentMove.value = null;
    cardRects.value = [];
    scrollViewportRect.value = null;
    lastAutoScrollAt.value = 0;
    lastNativeScrollAt.value = 0;
    programmaticScrollUntil.value = 0;
  };

  const isSortMode = computed(() => interactionMode.value === 'sort');
  const isSelectMode = computed(() => interactionMode.value === 'select');
  const canUseSortMode = computed(() => {
    return Boolean(categoryId.value) && !isSearchResultMode.value;
  });
  const isSortModeDisabled = computed(() => !canUseSortMode.value);
  const sortModeDisabledReason = computed(() => {
    if (!categoryId.value) {
      return '仅分类列表支持拖拽排序';
    }

    if (isSearchResultMode.value) {
      return '搜索结果里暂不支持拖拽排序';
    }

    return '';
  });
  const sortModeActionLabel = computed(() => {
    return isSortMode.value ? '退出拖拽' : '拖拽排序';
  });
  const currentModeTitle = computed(() => {
    if (isSortMode.value) {
      return '排序模式';
    }

    if (isSelectMode.value) {
      return '多选模式';
    }

    return '浏览模式';
  });
  const currentModeTag = computed(() => {
    if (isSortMode.value) {
      return '拖拽中';
    }

    if (isSelectMode.value) {
      return '多选中';
    }

    return '浏览中';
  });
  const currentModeDesc = computed(() => {
    if (isSortMode.value) {
      return '拖住卡片左侧手柄调整顺序，完成后可退出拖拽';
    }

    if (isSelectMode.value) {
      return '当前为多选模式，可批量转移分类或删除';
    }

    return '长按卡片进入多选模式，或点击拖拽排序';
  });

  // 排序模式只允许存在于“分类列表且不是搜索结果”这个上下文里。
  // 一旦页面上下文变了，就立即退回浏览模式，避免排序态残留到错误场景。
  watch([categoryId, isSearchResultMode], ([nextCategoryId, searchMode]) => {
    if ((nextCategoryId && !searchMode) || !isSortMode.value) {
      return;
    }

    setInteractionMode('browse');
    resetSortState();
  });

  watch(interactionMode, (nextMode, previousMode) => {
    if (previousMode === 'sort' && nextMode !== 'sort') {
      // 只要离开排序模式，就清掉拖拽态，避免下次进入时沿用旧的命中和滚动状态。
      resetSortState();
    }
  });

  // 拖拽期间只要 scrollTop 变化，卡片在屏幕里的实际位置就变了，必须重新采集 rect。
  // 这里顺手把滚动来源分成两类：
  // 1. 代码刚刚自己改过 scrollTop，这次变化只更新 rect，不记成“原生滚动”
  // 2. 超过 programmaticScrollUntil 之后发生的变化，才记成用户原生滚动
  // 这样 autoScrollIfNeeded 才知道现在该不该暂停程序滚动，让用户手势优先。
  watch(scrollTop, async (nextValue, previousValue) => {
    if (nextValue === previousValue || !draggingCardId.value) {
      return;
    }

    const now = Date.now();
    if (now > programmaticScrollUntil.value) {
      lastNativeScrollAt.value = now;
    }

    await refreshCardRects();
  });

  // 重新采集 scroll-view 视口和每张卡片的屏幕位置。
  // 这些 rect 只在“当前这一帧”可靠，所以开始拖拽、列表局部重排、发生滚动后都要重采一次。
  const refreshCardRects = async () => {
    if (!instance?.proxy) {
      cardRects.value = [];
      return;
    }

    await nextTick();

    const queryResult = await new Promise<[UniApp.NodeInfo | null, UniApp.NodeInfo[]]>(
      (resolve) => {
        uni
          .createSelectorQuery()
          .in(instance.proxy)
          .select('.page-scroll')
          .boundingClientRect()
          .selectAll('.card-item')
          .boundingClientRect()
          .exec((result) => {
            const viewportRect = (result?.[0] as UniApp.NodeInfo | undefined) ?? null;
            const itemRects = (result?.[1] as UniApp.NodeInfo[] | undefined) ?? [];
            resolve([viewportRect, itemRects]);
          });
      },
    );

    scrollViewportRect.value = queryResult[0];
    cardRects.value = queryResult[1];
  };

  // 只有拖拽中的手指进入视口上下边缘时，才尝试推进 scrollTop。
  // 这里有两层保护：
  // 1. autoScrollCooldown：防止一次 touchmove 链路里连推很多次 scrollTop
  // 2. nativeScrollQuietWindow：如果用户刚刚自己滚过，就短暂停掉程序自动滚动
  // 这样保留“手柄优先”的同时，不会把正常滚动手势完全抢死。
  const autoScrollIfNeeded = async (clientY: number) => {
    const viewportRect = scrollViewportRect.value;
    const now = Date.now();

    if (
      !viewportRect ||
      typeof viewportRect.top !== 'number' ||
      typeof viewportRect.height !== 'number'
    ) {
      return;
    }

    if (now - lastAutoScrollAt.value < autoScrollCooldown) {
      return;
    }

    if (now - lastNativeScrollAt.value < nativeScrollQuietWindow) {
      return;
    }

    const viewportTop = viewportRect.top;
    const viewportBottom = viewportRect.top + viewportRect.height;

    if (clientY <= viewportTop + autoScrollEdgePadding) {
      const nextScrollTop = Math.max(scrollTop.value - autoScrollStep, 0);
      if (nextScrollTop === scrollTop.value) {
        return;
      }

      lastAutoScrollAt.value = now;
      programmaticScrollUntil.value = now + autoScrollCooldown;
      scrollTop.value = nextScrollTop;
      await refreshCardRects();
      return;
    }

    if (clientY >= viewportBottom - autoScrollEdgePadding) {
      lastAutoScrollAt.value = now;
      programmaticScrollUntil.value = now + autoScrollCooldown;
      scrollTop.value += autoScrollStep;
      await refreshCardRects();
    }
  };

  // 根据手指当前的 y 坐标，算出“命中的锚点卡片”和“插入到它前/后”。
  // 上半区记为 before，下半区记为 after，这样一张卡片就能提供两个落点。
  const getDragTargetByTouchY = (clientY: number): DragTarget | null => {
    const rectIndex = cardRects.value.findIndex((rect) => {
      if (!rect || typeof rect.top !== 'number' || typeof rect.height !== 'number') {
        return false;
      }

      return clientY >= rect.top && clientY <= rect.top + rect.height;
    });

    if (rectIndex === -1) {
      return null;
    }

    const rect = cardRects.value[rectIndex];
    const anchorId = cardList.value[rectIndex]?.id || '';

    if (!rect || !anchorId || typeof rect.top !== 'number' || typeof rect.height !== 'number') {
      return null;
    }

    return {
      anchorId,
      position: clientY < rect.top + rect.height / 2 ? 'before' : 'after',
    };
  };

  // 本地重排只负责让界面马上跟手。
  // 这里不会直接写 storage，只更新页面里的 cardList 和 currentMove：
  // 1. cardList 负责即时反馈，让用户看到卡片已经挪过去了
  // 2. currentMove 负责记录“最后一次有效移动”，给 touchend 时持久化使用
  const moveCardLocally = async (
    movedId: string,
    anchorId: string,
    position: 'before' | 'after',
  ) => {
    const movedIndex = cardList.value.findIndex((card) => card.id === movedId);
    const anchorIndex = cardList.value.findIndex((card) => card.id === anchorId);

    if (movedIndex === -1 || anchorIndex === -1 || movedIndex === anchorIndex) {
      return;
    }

    if (position === 'before' && movedIndex < anchorIndex && movedIndex + 1 === anchorIndex) {
      return;
    }

    if (position === 'after' && movedIndex > anchorIndex && movedIndex === anchorIndex + 1) {
      return;
    }

    const nextList = [...cardList.value];
    const [movedCard] = nextList.splice(movedIndex, 1);
    const adjustedAnchorIndex = movedIndex < anchorIndex ? anchorIndex - 1 : anchorIndex;
    const insertIndex = position === 'before' ? adjustedAnchorIndex : adjustedAnchorIndex + 1;

    nextList.splice(insertIndex, 0, movedCard);
    cardList.value = nextList;
    currentMove.value = {
      movedId,
      anchorId,
      position,
    };
    await refreshCardRects();
  };

  // 手柄 touchstart 是一次拖拽会话的起点。
  // 这里会清空上一轮残留状态，并立即采集一次 rect，给后续命中计算做基线。
  const handleSortHandleTouchStart = async (id: string) => {
    activeSortCardId.value = id;
    draggingCardId.value = id;
    currentMove.value = null;
    lastAutoScrollAt.value = 0;
    lastNativeScrollAt.value = 0;
    programmaticScrollUntil.value = 0;
    await refreshCardRects();
  };

  // 每次 touchmove 都按“先滚，再算命中，再本地重排”的顺序走：
  // 1. 如果手指贴近边缘，先推动 scroll-view，避免算命中时还停留在旧视口
  // 2. 用最新 rect 计算当前命中的锚点
  // 3. 只有命中别的卡片时，才更新局部顺序
  const handleSortHandleTouchMove = async (event: TouchEvent) => {
    if (!draggingCardId.value || !categoryId.value) {
      return;
    }

    const touch = event.touches?.[0];
    if (!touch) {
      return;
    }

    await autoScrollIfNeeded(touch.clientY);

    const dragTarget = getDragTargetByTouchY(touch.clientY);
    if (!dragTarget || dragTarget.anchorId === draggingCardId.value) {
      return;
    }

    await moveCardLocally(draggingCardId.value, dragTarget.anchorId, dragTarget.position);
  };

  // touchend 只做两件事：
  // 1. 先把这次拖拽会话的临时状态全部清掉
  // 2. 如果这轮确实产生了有效移动，再把最后一次 move 交给服务层落库
  // 这里故意不直接拿当前 cardList 全量保存，因为页面里的列表只是已加载片段，不是分类全量。
  const handleSortHandleTouchEnd = () => {
    const currentCategoryId = categoryId.value;
    const move = currentMove.value;

    resetSortState();

    if (!currentCategoryId || !move) {
      return;
    }

    // 这里不直接保存局部列表顺序，而是把最新 move 交给服务层，
    // 让服务层基于当前分类的完整自定义排序顺序统一落库。
    const res = updateCardOrderInCategory(currentCategoryId, move);
    if (!res.success) {
      uni.showToast({ title: res.message || '排序保存失败', icon: 'none' });
      loadCurrentPages();
      return;
    }

    loadCurrentPages();
  };

  const isSortActive = (id: string) => {
    return activeSortCardId.value === id;
  };

  // 手柄点击本身不做业务，只用来吃掉 click，避免 touchend 后再冒出一次卡片点击。
  const handleSortHandleClick = () => {
    return;
  };

  // 进入排序模式时强制切到自定义排序，保证用户看到的顺序就是可拖拽的顺序；
  // 退出时只收起模式，不改回其他排序，避免用户刚排完序列表又跳动。
  const toggleSortMode = () => {
    if (isSortModeDisabled.value) {
      uni.showToast({ title: sortModeDisabledReason.value, icon: 'none' });
      return;
    }

    if (!isSortMode.value) {
      const customSortIndex = sortOptions.findIndex(
        (option) => option.value.sortBy === 'customSort',
      );

      if (customSortIndex >= 0) {
        selectedSortIndex.value = customSortIndex;
        loadCurrentPages();
      }
    }

    setInteractionMode(isSortMode.value ? 'browse' : 'sort');
    clearTouchState();
  };

  return {
    activeSortCardId,
    currentModeDesc,
    currentModeTag,
    currentModeTitle,
    isSortModeDisabled,
    isSortMode,
    isSortActive,
    sortModeActionLabel,
    handleSortHandleTouchStart,
    handleSortHandleTouchMove,
    handleSortHandleTouchEnd,
    handleSortHandleClick,
    toggleSortMode,
  };
}
