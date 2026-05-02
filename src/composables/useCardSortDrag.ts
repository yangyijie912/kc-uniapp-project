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
import type { Card, CardSortConfig, InteractionMode, Move } from '@/types/card';

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
  const sortDragGrabOffsetY = ref<number | null>(null);
  const sortDragProxyLeft = ref(0);
  const sortDragProxyTop = ref(0);
  const sortDragProxyWidth = ref(0);
  const sortDragProxyHeight = ref(0);
  const sortDragPendingTouchY = ref<number | null>(null);
  const sortDragLastTouchY = ref<number | null>(null);
  // 记录相邻两次触点的 y 差值，用来判断当前是上拖还是下拖。
  // 命中阈值不能只看绝对位置，否则顶边自动滚动时很容易卡在同一条中线附近。
  const sortDragLastTouchDeltaY = ref(0);
  const sortDragMoveFrameId = ref<number | null>(null);
  const sortDragMoveInFlight = ref(false);
  const sortDragRectRefreshFrameId = ref<number | null>(null);
  const sortDragEdgeScrollFrameId = ref<number | null>(null);
  // 拖拽过程中只保留“最新一次相对锚点的移动”，松手时再交给服务层按全量顺序回放。
  const currentMove = ref<Move | null>(null);
  // 给列表占位用的“当前预览移动”。它会在命中当帧就更新，不等本地重排完成。
  const sortDragPreviewMove = ref<Move | null>(null);
  const cardRects = ref<UniApp.NodeInfo[]>([]);
  const scrollViewportRect = ref<UniApp.NodeInfo | null>(null);
  // 每次自动滚动推进的像素值。值太小会显得拖不动，值太大又会导致命中区域跳得太快。
  const autoScrollStep = 48;
  // 手指进入视口上下边缘多少像素后开始自动滚动。
  // 这里故意放宽一点，避免必须贴到最边缘才触发，手感会太紧。
  const autoScrollEdgePadding = 88;
  // 两次程序自动滚动之间至少间隔多久，单位 ms。
  // 这是节流，不然 touchmove 高频触发时 scrollTop 会被连续推得过猛。
  const autoScrollCooldown = 72;
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

  const shiftCachedCardRectsByScrollDelta = (scrollDelta: number) => {
    if (!scrollDelta || cardRects.value.length === 0) {
      return;
    }

    cardRects.value = cardRects.value.map((rect) => {
      if (!rect || typeof rect.top !== 'number') {
        return rect;
      }

      return {
        ...rect,
        top: rect.top - scrollDelta,
      };
    });
  };

  // 拖拽结束、模式退出或分类上下文变化时，都要把这一轮拖拽会话的临时态一次性回收。
  const resetSortState = () => {
    activeSortCardId.value = '';
    draggingCardId.value = '';
    sortDragGrabOffsetY.value = null;
    sortDragProxyLeft.value = 0;
    sortDragProxyTop.value = 0;
    sortDragProxyWidth.value = 0;
    sortDragProxyHeight.value = 0;
    sortDragPendingTouchY.value = null;
    sortDragLastTouchY.value = null;
    sortDragLastTouchDeltaY.value = 0;
    if (sortDragMoveFrameId.value !== null) {
      cancelAnimationFrame(sortDragMoveFrameId.value);
      sortDragMoveFrameId.value = null;
    }
    if (sortDragRectRefreshFrameId.value !== null) {
      cancelAnimationFrame(sortDragRectRefreshFrameId.value);
      sortDragRectRefreshFrameId.value = null;
    }
    if (sortDragEdgeScrollFrameId.value !== null) {
      cancelAnimationFrame(sortDragEdgeScrollFrameId.value);
      sortDragEdgeScrollFrameId.value = null;
    }
    sortDragMoveInFlight.value = false;
    currentMove.value = null;
    sortDragPreviewMove.value = null;
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

  const sortDragProxyStyle = computed<Record<string, string> | null>(() => {
    if (!activeSortCardId.value || !draggingCardId.value) {
      return null;
    }

    if (
      sortDragProxyWidth.value <= 0 ||
      sortDragProxyHeight.value <= 0 ||
      !Number.isFinite(sortDragProxyLeft.value) ||
      !Number.isFinite(sortDragProxyTop.value)
    ) {
      return null;
    }

    return {
      position: 'fixed',
      boxSizing: 'border-box',
      left: `${sortDragProxyLeft.value}px`,
      top: `${sortDragProxyTop.value}px`,
      width: `${sortDragProxyWidth.value}px`,
      height: `${sortDragProxyHeight.value}px`,
    };
  });

  const sortInsertIndex = computed(() => {
    const touchY = sortDragLastTouchY.value;

    if (!isSortMode.value || !activeSortCardId.value || touchY === null) {
      return -1;
    }

    // sortInsertIndex 直接驱动列表里的占位卡位置，决定用户看到的“卡片要插到哪”。
    // 这里不能简单等价于当前帧命中的 dragTarget：
    // - 自动滚动后，rect 可能会先进入一帧过渡状态；
    // - 这时如果立刻把占位清掉，视觉上会像拖拽断线；
    // - 所以在“暂时算不到新目标”时，沿用上一帧的有效 move，让占位继续站住。
    const dragTarget = getDragTargetByTouchY(touchY);
    if (!dragTarget) {
      const fallbackMove = currentMove.value;
      if (!fallbackMove) {
        return -1;
      }

      const visibleCardList = cardList.value.filter((card) => card.id !== activeSortCardId.value);
      const fallbackAnchorIndex = visibleCardList.findIndex(
        (card) => card.id === fallbackMove.anchorId,
      );

      if (fallbackAnchorIndex === -1) {
        return -1;
      }

      return fallbackMove.position === 'before' ? fallbackAnchorIndex : fallbackAnchorIndex + 1;
    }

    if (dragTarget.anchorId === activeSortCardId.value) {
      return -1;
    }

    const visibleCardList = cardList.value.filter((card) => card.id !== activeSortCardId.value);
    const anchorIndex = visibleCardList.findIndex((card) => card.id === dragTarget.anchorId);
    if (anchorIndex === -1) {
      return -1;
    }

    return dragTarget.position === 'before' ? anchorIndex : anchorIndex + 1;
  });

  const sortInsertGuideStyle = computed<Record<string, string> | null>(() => {
    const move = sortDragPreviewMove.value ?? currentMove.value;

    if (!isSortMode.value || !draggingCardId.value || !move || cardRects.value.length === 0) {
      return null;
    }

    const rectCards = draggingCardId.value
      ? cardList.value.filter((card) => card.id !== draggingCardId.value)
      : cardList.value;

    const anchorIndex = rectCards.findIndex((card) => card.id === move.anchorId);
    const targetRect = cardRects.value[anchorIndex];

    if (
      anchorIndex === -1 ||
      !targetRect ||
      typeof targetRect.top !== 'number' ||
      typeof targetRect.left !== 'number' ||
      typeof targetRect.width !== 'number' ||
      typeof targetRect.height !== 'number'
    ) {
      return null;
    }

    const guideHeight = 24;
    const guideTop =
      move.position === 'before'
        ? targetRect.top - guideHeight / 2
        : targetRect.top + targetRect.height - guideHeight / 2;

    return {
      position: 'fixed',
      boxSizing: 'border-box',
      pointerEvents: 'none',
      left: `${targetRect.left}px`,
      top: `${guideTop}px`,
      width: `${targetRect.width}px`,
      height: `${guideHeight}px`,
    };
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

  watch(cardList, (nextList, previousList) => {
    if (!draggingCardId.value || nextList.length === previousList.length) {
      return;
    }

    scheduleRefreshCardRects();

    if (sortDragLastTouchY.value !== null) {
      updateSortDragPreviewByTouchY(sortDragLastTouchY.value);
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

    shiftCachedCardRectsByScrollDelta(nextValue - previousValue);

    if (sortDragMoveInFlight.value) {
      return;
    }

    if (sortDragLastTouchY.value !== null) {
      updateSortDragPreviewByTouchY(sortDragLastTouchY.value);
    }
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
          .selectAll('.card-list .card-item-sort-source')
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

  const scheduleRefreshCardRects = () => {
    if (!draggingCardId.value) {
      return;
    }

    if (sortDragRectRefreshFrameId.value !== null) {
      return;
    }

    sortDragRectRefreshFrameId.value = requestAnimationFrame(() => {
      sortDragRectRefreshFrameId.value = null;
      void refreshCardRects().then(() => {
        if (sortDragLastTouchY.value !== null) {
          updateSortDragPreviewByTouchY(sortDragLastTouchY.value);
        }
      });
    });
  };

  // 只有拖拽中的手指进入视口上下边缘时，才尝试推进 scrollTop。
  // 这里有两层保护：
  // 1. autoScrollCooldown：防止一次 touchmove 链路里连推很多次 scrollTop
  // 2. nativeScrollQuietWindow：如果用户刚刚自己滚过，就短暂停掉程序自动滚动
  // 这样保留“手柄优先”的同时，不会把正常滚动手势完全抢死。
  const autoScrollIfNeeded = (clientY: number) => {
    const viewportRect = scrollViewportRect.value;
    const now = Date.now();

    if (
      !viewportRect ||
      typeof viewportRect.top !== 'number' ||
      typeof viewportRect.height !== 'number'
    ) {
      return false;
    }

    if (now - lastAutoScrollAt.value < autoScrollCooldown) {
      return false;
    }

    if (now - lastNativeScrollAt.value < nativeScrollQuietWindow) {
      return false;
    }

    const viewportTop = viewportRect.top;
    const viewportBottom = viewportRect.top + viewportRect.height;

    if (clientY <= viewportTop + autoScrollEdgePadding) {
      const nextScrollTop = Math.max(scrollTop.value - autoScrollStep, 0);
      if (nextScrollTop === scrollTop.value) {
        return false;
      }

      lastAutoScrollAt.value = now;
      programmaticScrollUntil.value = now + autoScrollCooldown;
      scrollTop.value = nextScrollTop;
      return true;
    }

    if (clientY >= viewportBottom - autoScrollEdgePadding) {
      const nextScrollTop = scrollTop.value + autoScrollStep;
      lastAutoScrollAt.value = now;
      programmaticScrollUntil.value = now + autoScrollCooldown;
      scrollTop.value = nextScrollTop;
      return true;
    }

    return false;
  };

  const isTouchNearAutoScrollEdge = (clientY: number) => {
    const viewportRect = scrollViewportRect.value;

    if (
      !viewportRect ||
      typeof viewportRect.top !== 'number' ||
      typeof viewportRect.height !== 'number'
    ) {
      return false;
    }

    const viewportTop = viewportRect.top;
    const viewportBottom = viewportRect.top + viewportRect.height;
    return (
      clientY <= viewportTop + autoScrollEdgePadding ||
      clientY >= viewportBottom - autoScrollEdgePadding
    );
  };

  const runAutoScrollFrame = () => {
    if (sortDragEdgeScrollFrameId.value !== null) {
      return;
    }

    sortDragEdgeScrollFrameId.value = requestAnimationFrame(() => {
      sortDragEdgeScrollFrameId.value = null;

      if (!draggingCardId.value) {
        return;
      }

      const touchY = sortDragLastTouchY.value;
      if (touchY === null || !isTouchNearAutoScrollEdge(touchY)) {
        if (sortDragEdgeScrollFrameId.value !== null) {
          cancelAnimationFrame(sortDragEdgeScrollFrameId.value);
          sortDragEdgeScrollFrameId.value = null;
        }
        return;
      }

      const viewportRect = scrollViewportRect.value;
      const canKeepAutoScrolling =
        !!viewportRect &&
        typeof viewportRect.top === 'number' &&
        (touchY >= viewportRect.top + autoScrollEdgePadding || scrollTop.value > 0);

      const didAutoScroll = autoScrollIfNeeded(touchY);

      if (
        canKeepAutoScrolling &&
        sortDragEdgeScrollFrameId.value === null &&
        draggingCardId.value
      ) {
        runAutoScrollFrame();
      }
    });
  };

  // 根据手指当前的 y 坐标，算出“命中的锚点卡片”和“插入到它前/后”。
  // 上半区记为 before，下半区记为 after，这样一张卡片就能提供两个落点。
  const getDragTargetByTouchY = (clientY: number): DragTarget | null => {
    const rectCards = draggingCardId.value
      ? cardList.value.filter((card) => card.id !== draggingCardId.value)
      : cardList.value;

    const firstValidIndex = cardRects.value.findIndex((rect) => {
      return rect && typeof rect.top === 'number' && typeof rect.height === 'number';
    });

    if (firstValidIndex === -1) {
      return null;
    }

    for (let index = firstValidIndex; index < cardRects.value.length; index += 1) {
      const rect = cardRects.value[index];
      const anchorId = rectCards[index]?.id || '';

      if (!rect || !anchorId || typeof rect.top !== 'number' || typeof rect.height !== 'number') {
        continue;
      }

      const rectTopY = rect.top;
      const rectBottomY = rect.top + rect.height;
      // 上拖和下拖不能共用同一条中线，否则边缘自动滚动时会出现“来回踩线”的抖动感。
      // 这里用方向感去偏置命中边界：
      // - 上拖时把边界提前到更靠上的位置，让它更早切到上一张卡；
      // - 下拖时把边界压后一点，避免刚碰到下一张卡上沿就频繁切换；
      // - 未知方向时回退到中线，保持初次拖动时的直观性。
      const rectBoundaryY =
        sortDragLastTouchDeltaY.value < 0
          ? rectTopY + rect.height * 0.3
          : sortDragLastTouchDeltaY.value > 0
            ? rectTopY + rect.height * 0.7
            : rectTopY + rect.height / 2;

      if (clientY < rectBoundaryY) {
        return {
          anchorId,
          position: 'before',
        };
      }

      if (clientY >= rectBottomY) {
        continue;
      }
    }

    const lastIndex = cardRects.value.length - 1;
    const lastAnchorId = rectCards[lastIndex]?.id || '';
    const lastRect = cardRects.value[lastIndex];

    if (
      !lastRect ||
      !lastAnchorId ||
      typeof lastRect.top !== 'number' ||
      typeof lastRect.height !== 'number'
    ) {
      return null;
    }

    return {
      anchorId: lastAnchorId,
      position: 'after',
    };
  };

  const updateSortDragPreviewByTouchY = (clientY: number) => {
    if (!draggingCardId.value) {
      return;
    }

    const dragTarget = getDragTargetByTouchY(clientY);
    if (dragTarget && dragTarget.anchorId !== draggingCardId.value) {
      sortDragPreviewMove.value = {
        movedId: draggingCardId.value,
        anchorId: dragTarget.anchorId,
        position: dragTarget.position,
      };
    }
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
    scheduleRefreshCardRects();
  };

  const runSortDragMoveFrame = async () => {
    if (sortDragMoveInFlight.value) {
      return;
    }

    const touchY = sortDragPendingTouchY.value;
    if (!draggingCardId.value || touchY === null) {
      return;
    }

    sortDragMoveInFlight.value = true;
    sortDragPendingTouchY.value = null;

    if (sortDragGrabOffsetY.value !== null) {
      sortDragProxyTop.value = touchY - sortDragGrabOffsetY.value;
    }

    const didAutoScroll = autoScrollIfNeeded(touchY);

    if (isTouchNearAutoScrollEdge(touchY)) {
      runAutoScrollFrame();
    }

    if (didAutoScroll) {
      // 自动滚动只负责推动视口，不应该把“这一帧还能不能继续算命中”也一起掐掉。
      // 这里保留 touchY，是为了让下一轮仍然围绕同一个手指位置继续命中、继续换位，
      // 而不是滚一下就停在旧列表状态里。
      sortDragPendingTouchY.value = touchY;
    }

    const dragTarget = getDragTargetByTouchY(touchY);
    if (dragTarget && dragTarget.anchorId !== draggingCardId.value) {
      // 先更新预览，再做本地重排：前者负责占位卡“马上亮出来”，后者负责把列表真的挪过去。
      // 两步都做，是为了避免用户只看到代理卡在动，却看不到列表真正跟手。
      sortDragPreviewMove.value = {
        movedId: draggingCardId.value,
        anchorId: dragTarget.anchorId,
        position: dragTarget.position,
      };
      await moveCardLocally(draggingCardId.value, dragTarget.anchorId, dragTarget.position);
    }

    sortDragMoveInFlight.value = false;

    if (sortDragPendingTouchY.value !== null && draggingCardId.value) {
      sortDragMoveFrameId.value = requestAnimationFrame(() => {
        sortDragMoveFrameId.value = null;
        void runSortDragMoveFrame();
      });
    }
  };

  // 手柄 touchstart 是一次拖拽会话的起点。
  // 这里会清空上一轮残留状态，并立即采集一次 rect，给后续命中计算做基线。
  const handleSortHandleTouchStart = async (id: string, event: TouchEvent) => {
    const touch = event.touches?.[0];

    currentMove.value = null;
    lastAutoScrollAt.value = 0;
    lastNativeScrollAt.value = 0;
    programmaticScrollUntil.value = 0;
    sortDragLastTouchY.value = null;
    await refreshCardRects();

    activeSortCardId.value = id;
    draggingCardId.value = id;

    if (!touch) {
      sortDragGrabOffsetY.value = null;
      return;
    }

    const activeIndex = cardList.value.findIndex((card) => card.id === id);
    const activeRect = cardRects.value[activeIndex];

    if (activeIndex === -1 || !activeRect || typeof activeRect.top !== 'number') {
      sortDragGrabOffsetY.value = null;
      return;
    }

    sortDragProxyLeft.value = typeof activeRect.left === 'number' ? activeRect.left : 0;
    sortDragProxyTop.value = activeRect.top;
    sortDragProxyWidth.value = typeof activeRect.width === 'number' ? activeRect.width : 0;
    sortDragProxyHeight.value = typeof activeRect.height === 'number' ? activeRect.height : 0;
    sortDragGrabOffsetY.value = touch.clientY - activeRect.top;
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

    if (sortDragGrabOffsetY.value === null) {
      return;
    }

    const previousTouchY = sortDragLastTouchY.value;
    sortDragPendingTouchY.value = touch.clientY;
    sortDragLastTouchDeltaY.value = previousTouchY === null ? 0 : touch.clientY - previousTouchY;
    sortDragLastTouchY.value = touch.clientY;
    updateSortDragPreviewByTouchY(touch.clientY);

    if (sortDragMoveFrameId.value === null) {
      sortDragMoveFrameId.value = requestAnimationFrame(() => {
        sortDragMoveFrameId.value = null;
        void runSortDragMoveFrame();
      });
    }
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
    sortDragProxyStyle,
    sortInsertGuideStyle,
    sortInsertIndex,
    sortDragProxyHeight,
    sortDragProxyLeft,
    sortDragProxyTop,
    sortDragProxyWidth,
    sortModeActionLabel,
    handleSortHandleTouchStart,
    handleSortHandleTouchMove,
    handleSortHandleTouchEnd,
    handleSortHandleClick,
    toggleSortMode,
  };
}
