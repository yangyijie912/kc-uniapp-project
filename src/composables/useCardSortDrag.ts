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

type DragTouchEvent = Pick<TouchEvent, 'touches' | 'changedTouches'>;

type CardRect = UniApp.NodeInfo & {
  cardId?: string;
  dataset?: {
    cardId?: string;
    cardid?: string;
  };
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
  scrollTopTarget: Ref<number>;
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
    scrollTopTarget,
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
  const sortDragEdgeScrollTimerId = ref<ReturnType<typeof setTimeout> | null>(null);
  // 拖拽过程中只保留“最新一次相对锚点的移动”，松手时再交给服务层按全量顺序回放。
  const currentMove = ref<Move | null>(null);
  // 给列表占位用的“当前预览移动”。它会在命中当帧就更新，不等本地重排完成。
  const sortDragPreviewMove = ref<Move | null>(null);
  const sortInsertIndex = ref(-1);
  const sortDragDebugText = ref('拖拽调试：空闲');
  const cardRects = ref<CardRect[]>([]);
  const scrollViewportRect = ref<UniApp.NodeInfo | null>(null);
  // 手指进入视口上下边缘多少像素后开始自动滚动。
  // 下边缘热区不能太大，否则只是稍微往下拖就会误触发快速滚动。
  const autoScrollTopEdgePadding = 110;
  const autoScrollBottomEdgePadding = 190;
  // 两次程序自动滚动之间至少间隔多久，单位 ms。
  // 这是节流，不然 touchmove 高频触发时 scrollTop 会被连续推得过猛。
  const autoScrollCooldown = 52;
  const programmaticScrollQuietWindow = 320;
  const autoScrollMaxStep = 66;
  const autoScrollMinStep = 14;
  // 最近一次程序自动滚动发生的时间，用于 autoScrollCooldown 节流。
  const lastAutoScrollAt = ref(0);
  // 程序主动改写 scrollTop 后，在这之前收到的 scroll 变化都视为“自己触发的后续回响”。
  // 只要还没过这个时间点，就不要把这次 scrollTop 变化误判成用户原生滚动。
  const programmaticScrollUntil = ref(0);

  const getTouchPoint = (event: DragTouchEvent) => {
    return event.touches?.[0] || event.changedTouches?.[0] || null;
  };

  const getTouchY = (event: DragTouchEvent) => {
    const touch = getTouchPoint(event);

    if (!touch) {
      return null;
    }

    const rawY = touch.clientY ?? touch.pageY ?? touch.screenY;

    return typeof rawY === 'number' && Number.isFinite(rawY) ? rawY : null;
  };

  const formatDebugNumber = (value: unknown) => {
    return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : '-';
  };

  const writeSortDragDebug = (label: string, extra: Record<string, unknown> = {}) => {
    const viewportRect = scrollViewportRect.value;
    const touchY = sortDragLastTouchY.value;
    const viewportTop = viewportRect?.top;
    const viewportBottom =
      typeof viewportRect?.top === 'number' && typeof viewportRect?.height === 'number'
        ? viewportRect.top + viewportRect.height
        : undefined;
    const touchLabel =
      touchY === null
        ? '手指=-'
        : `手指=${formatDebugNumber(touchY)} 上边缘=${formatDebugNumber(
            (viewportTop ?? 0) + autoScrollTopEdgePadding,
          )} 下边缘=${formatDebugNumber((viewportBottom ?? 0) - autoScrollBottomEdgePadding)}`;

    sortDragDebugText.value = [
      label,
      touchLabel,
      `视口=${formatDebugNumber(viewportTop)}-${formatDebugNumber(viewportBottom)}`,
      `滚动=${formatDebugNumber(scrollTop.value)} 目标=${formatDebugNumber(scrollTopTarget.value)}`,
      `节点=${cardRects.value.length}`,
      ...Object.entries(extra).map(([key, value]) => `${key}=${String(value)}`),
    ].join(' | ');
  };

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

  const getCardIdFromRect = (rect: CardRect) => {
    const datasetId = rect.dataset?.cardId || rect.dataset?.cardid || rect.cardId || '';
    if (datasetId) {
      return datasetId;
    }

    const rectId = (rect as UniApp.NodeInfo & { id?: string }).id || '';
    return rectId.startsWith('sort-card-') ? rectId.replace(/^sort-card-/, '') : '';
  };

  const getSortInsertIndexByMove = (move: Move | null) => {
    if (!move) {
      return -1;
    }

    const visibleCardList = cardList.value.filter((card) => card.id !== activeSortCardId.value);
    const anchorIndex = visibleCardList.findIndex((card) => card.id === move.anchorId);

    if (anchorIndex === -1) {
      return -1;
    }

    return move.position === 'before' ? anchorIndex : anchorIndex + 1;
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
    if (sortDragEdgeScrollTimerId.value !== null) {
      clearTimeout(sortDragEdgeScrollTimerId.value);
      sortDragEdgeScrollTimerId.value = null;
    }
    sortDragMoveInFlight.value = false;
    currentMove.value = null;
    sortDragPreviewMove.value = null;
    sortInsertIndex.value = -1;
    cardRects.value = [];
    scrollViewportRect.value = null;
    lastAutoScrollAt.value = 0;
    programmaticScrollUntil.value = 0;
    sortDragDebugText.value = '拖拽调试：已重置';
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

  const getDragHitY = (touchY: number) => {
    if (sortDragGrabOffsetY.value === null || sortDragProxyHeight.value <= 0) {
      return touchY;
    }

    const proxyTop = touchY - sortDragGrabOffsetY.value;
    const hitRatio =
      sortDragLastTouchDeltaY.value > 0 ? 0.78 : sortDragLastTouchDeltaY.value < 0 ? 0.28 : 0.5;

    return proxyTop + sortDragProxyHeight.value * hitRatio;
  };

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

  const forceRefreshCardRects = async () => {
    if (sortDragRectRefreshFrameId.value !== null) {
      cancelAnimationFrame(sortDragRectRefreshFrameId.value);
      sortDragRectRefreshFrameId.value = null;
    }

    await refreshCardRects();

    if (sortDragLastTouchY.value !== null) {
      updateSortDragPreviewByTouchY(sortDragLastTouchY.value);
      sortDragPendingTouchY.value = sortDragLastTouchY.value;
    }
  };

  watch(
    cardList,
    async (nextList, previousList) => {
      if (!draggingCardId.value || nextList.length === previousList.length) {
        return;
      }

      writeSortDragDebug('拖拽中列表变化', {
        旧数量: previousList.length,
        新数量: nextList.length,
      });
      await forceRefreshCardRects();
    },
    { flush: 'post' },
  );

  // 拖拽期间只要 scrollTop 变化，卡片在屏幕里的实际位置就变了。
  // 这里先用滚动差值平移缓存 rect，让命中计算马上跟上视口；真正的 rect 重采由后续帧补齐。
  watch(scrollTop, async (nextValue, previousValue) => {
    if (nextValue === previousValue || !draggingCardId.value) {
      return;
    }

    shiftCachedCardRectsByScrollDelta(nextValue - previousValue);

    if (sortDragLastTouchY.value !== null) {
      updateSortDragPreviewByTouchY(sortDragLastTouchY.value);
    }

    scheduleRefreshCardRects();
  });

  // 重新采集 scroll-view 视口和每张卡片的屏幕位置。
  // 这些 rect 只在“当前这一帧”可靠，所以开始拖拽、列表局部重排、发生滚动后都要重采一次。
  const refreshCardRects = async () => {
    if (!instance?.proxy) {
      cardRects.value = [];
      return;
    }

    await nextTick();

    const queryResult = await new Promise<[UniApp.NodeInfo | null, CardRect[]]>((resolve) => {
      uni
        .createSelectorQuery()
        .in(instance.proxy)
        .select('.page-scroll')
        .boundingClientRect()
        .selectAll('.card-list .card-item-sort-source')
        .fields({ id: true, dataset: true, rect: true, size: true }, () => {})
        .exec((result) => {
          const viewportRect = (result?.[0] as UniApp.NodeInfo | undefined) ?? null;
          const itemRects = (result?.[1] as CardRect[] | undefined) ?? [];
          resolve([viewportRect, itemRects]);
        });
    });

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

  // 只有拖拽中的手指进入视口上下边缘时，才由程序推进 scrollTopTarget。
  // 排序拖拽优先吃住手势，边缘滚动只作为拖拽会话的一部分发生，避免和原生滑动互相抢控制权。
  const getAutoScrollDelta = (clientY: number) => {
    const viewportRect = scrollViewportRect.value;

    if (
      !viewportRect ||
      typeof viewportRect.top !== 'number' ||
      typeof viewportRect.height !== 'number'
    ) {
      return 0;
    }

    const viewportTop = viewportRect.top;
    const viewportBottom = viewportRect.top + viewportRect.height;

    if (clientY <= viewportTop + autoScrollTopEdgePadding) {
      const edgeRatio = Math.min(
        Math.max((viewportTop + autoScrollTopEdgePadding - clientY) / autoScrollTopEdgePadding, 0),
        1,
      );
      const step = autoScrollMinStep + (autoScrollMaxStep - autoScrollMinStep) * edgeRatio;
      return -Math.max(autoScrollMinStep, Math.round(step));
    }

    if (clientY >= viewportBottom - autoScrollBottomEdgePadding) {
      const edgeRatio = Math.min(
        Math.max(
          (clientY - (viewportBottom - autoScrollBottomEdgePadding)) / autoScrollBottomEdgePadding,
          0,
        ),
        1,
      );
      const step = autoScrollMinStep + (autoScrollMaxStep - autoScrollMinStep) * edgeRatio;
      return Math.max(autoScrollMinStep, Math.round(step));
    }

    return 0;
  };

  const setProgrammaticScrollTop = (nextScrollTop: number) => {
    const normalizedScrollTop = Math.max(Math.round(nextScrollTop), 0);
    if (!Number.isFinite(normalizedScrollTop)) {
      return false;
    }

    if (
      normalizedScrollTop === Math.round(scrollTopTarget.value) &&
      normalizedScrollTop === Math.round(scrollTop.value)
    ) {
      writeSortDragDebug('滚动目标未变化', { 下一个: normalizedScrollTop });
      return false;
    }

    const now = Date.now();
    lastAutoScrollAt.value = now;
    programmaticScrollUntil.value = now + programmaticScrollQuietWindow;
    // scrollTop 由 @scroll 记录真实位置，scrollTopTarget 专门作为 scroll-view 的程序滚动目标。
    // APP 端这两个值如果混用，@scroll 回写很容易吞掉拖拽边缘滚动的目标值。
    scrollTopTarget.value = normalizedScrollTop;
    writeSortDragDebug('设置滚动目标', { 下一个: normalizedScrollTop });
    return true;
  };

  const autoScrollIfNeeded = (clientY: number) => {
    const now = Date.now();
    if (now - lastAutoScrollAt.value < autoScrollCooldown) {
      writeSortDragDebug('自动滚动冷却中', {
        等待: autoScrollCooldown - (now - lastAutoScrollAt.value),
      });
      return false;
    }

    const scrollDelta = getAutoScrollDelta(clientY);
    if (!scrollDelta) {
      writeSortDragDebug('未进入边缘滚动区');
      return false;
    }

    const targetGap = Math.abs(scrollTopTarget.value - scrollTop.value);
    const canTrustPendingTarget = targetGap < 900;
    const scrollBase = canTrustPendingTarget
      ? scrollDelta > 0
        ? Math.max(scrollTop.value, scrollTopTarget.value)
        : Math.min(scrollTop.value, scrollTopTarget.value)
      : scrollTop.value;
    const nextScrollTop = Math.max(Math.round(scrollBase + scrollDelta), 0);

    if (nextScrollTop === 0 && Math.round(scrollTop.value) === 0 && scrollDelta < 0) {
      writeSortDragDebug('已到顶部', { 距离: scrollDelta });
      return false;
    }

    const didSetScrollTop = setProgrammaticScrollTop(nextScrollTop);
    writeSortDragDebug('触发自动滚动', {
      距离: scrollDelta,
      基准: Math.round(scrollBase),
      已设置: didSetScrollTop,
    });

    return didSetScrollTop;
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
      clientY <= viewportTop + autoScrollTopEdgePadding ||
      clientY >= viewportBottom - autoScrollBottomEdgePadding
    );
  };

  const runAutoScrollFrame = () => {
    if (sortDragEdgeScrollTimerId.value !== null) {
      return;
    }

    sortDragEdgeScrollTimerId.value = setTimeout(() => {
      sortDragEdgeScrollTimerId.value = null;

      if (!draggingCardId.value) {
        return;
      }

      const touchY = sortDragLastTouchY.value;
      if (touchY === null || !isTouchNearAutoScrollEdge(touchY)) {
        writeSortDragDebug('自动滚动循环停止');
        if (sortDragEdgeScrollTimerId.value !== null) {
          clearTimeout(sortDragEdgeScrollTimerId.value);
          sortDragEdgeScrollTimerId.value = null;
        }
        return;
      }

      const scrollDelta = getAutoScrollDelta(touchY);
      const canKeepAutoScrolling = scrollDelta > 0 || scrollTop.value > 0;

      const didAutoScroll = autoScrollIfNeeded(touchY);
      updateSortDragPreviewByTouchY(touchY);

      if (
        canKeepAutoScrolling &&
        sortDragEdgeScrollTimerId.value === null &&
        draggingCardId.value
      ) {
        runAutoScrollFrame();
      }
    }, autoScrollCooldown);
  };

  // 根据拖拽命中点的 y 坐标，算出“命中的锚点卡片”和“插入到它前/后”。
  // 上半区记为 before，下半区记为 after，这样一张卡片就能提供两个落点。
  // 这里必须从 rect 自己的 DOM id 反推卡片 id，不能用 cardRects[index] 对齐 cardList[index]：
  // 拖拽时 cardList 会本地重排，APP 端还会保留透明源节点并插入占位卡，数组下标很容易错位。
  const getDragTargetByTouchY = (clientY: number): DragTarget | null => {
    const validRects = cardRects.value
      .filter((rect) => {
        return (
          rect &&
          getCardIdFromRect(rect) &&
          typeof rect.top === 'number' &&
          typeof rect.height === 'number'
        );
      })
      .sort((a, b) => (a.top ?? 0) - (b.top ?? 0));

    if (validRects.length === 0) {
      return null;
    }

    const loadedCardsWithoutSource = cardList.value.filter(
      (card) => card.id !== draggingCardId.value,
    );
    const loadedTailCard = loadedCardsWithoutSource[loadedCardsWithoutSource.length - 1];
    const visibleTailRect = validRects[validRects.length - 1];

    // 尾部是特殊落点：底部有固定操作栏，手指和代理卡常常无法真正越过最后一张卡的底边。
    // 所以下拖时只要命中点进入最后一个可见锚点的下半区，就直接视为“插到已加载列表尾部”。
    if (
      sortDragLastTouchDeltaY.value > 0 &&
      loadedTailCard &&
      visibleTailRect &&
      typeof visibleTailRect.top === 'number' &&
      typeof visibleTailRect.height === 'number' &&
      clientY >= visibleTailRect.top + visibleTailRect.height * 0.45
    ) {
      return {
        anchorId: loadedTailCard.id,
        position: 'after',
      };
    }

    for (const rect of validRects) {
      const anchorId = getCardIdFromRect(rect);

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

    if (!loadedTailCard) {
      return null;
    }

    return {
      anchorId: loadedTailCard.id,
      position: 'after',
    };
  };

  const applySortDragTarget = (
    dragTarget: DragTarget | null,
    clientY: number,
    label = '更新占位',
  ) => {
    if (!dragTarget || !draggingCardId.value || dragTarget.anchorId === draggingCardId.value) {
      return false;
    }

    const nextMove = {
      movedId: draggingCardId.value,
      anchorId: dragTarget.anchorId,
      position: dragTarget.position,
    };
    const nextInsertIndex = getSortInsertIndexByMove(nextMove);
    if (nextInsertIndex < 0) {
      writeSortDragDebug('占位锚点未加载', {
        anchorId: dragTarget.anchorId,
        position: dragTarget.position,
        命中Y: Math.round(getDragHitY(clientY)),
      });
      return false;
    }

    sortDragPreviewMove.value = nextMove;
    sortInsertIndex.value = nextInsertIndex;
    writeSortDragDebug(label, {
      anchorId: dragTarget.anchorId,
      position: dragTarget.position,
      下标: nextInsertIndex,
      命中Y: Math.round(getDragHitY(clientY)),
    });
    return true;
  };

  const updateSortDragPreviewByTouchY = (clientY: number) => {
    if (!draggingCardId.value) {
      return;
    }

    const dragTarget = getDragTargetByTouchY(getDragHitY(clientY));
    applySortDragTarget(dragTarget, clientY);
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

    const dragTarget = getDragTargetByTouchY(getDragHitY(touchY));
    if (applySortDragTarget(dragTarget, touchY, '帧内更新占位') && dragTarget) {
      // 先更新预览，再做本地重排：前者负责占位卡“马上亮出来”，后者负责把列表真的挪过去。
      // 两步都做，是为了避免用户只看到代理卡在动，却看不到列表真正跟手。
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
    const touchY = getTouchY(event);

    currentMove.value = null;
    lastAutoScrollAt.value = 0;
    programmaticScrollUntil.value = 0;
    scrollTopTarget.value = scrollTop.value;
    sortDragLastTouchY.value = null;

    activeSortCardId.value = id;
    draggingCardId.value = id;
    await refreshCardRects();
    writeSortDragDebug('开始触摸', { id });

    if (touchY === null) {
      sortDragGrabOffsetY.value = null;
      return;
    }

    const activeRect = cardRects.value.find((rect) => getCardIdFromRect(rect) === id);

    if (!activeRect || typeof activeRect.top !== 'number') {
      sortDragGrabOffsetY.value = null;
      return;
    }

    sortDragProxyLeft.value = typeof activeRect.left === 'number' ? activeRect.left : 0;
    sortDragProxyTop.value = activeRect.top;
    sortDragProxyWidth.value = typeof activeRect.width === 'number' ? activeRect.width : 0;
    sortDragProxyHeight.value = typeof activeRect.height === 'number' ? activeRect.height : 0;
    sortDragGrabOffsetY.value = touchY - activeRect.top;

    writeSortDragDebug('拖拽准备完成', {
      id,
      代理顶部: Math.round(sortDragProxyTop.value),
      手指偏移: Math.round(sortDragGrabOffsetY.value),
    });
    updateSortDragPreviewByTouchY(touchY);
  };

  // 每次 touchmove 都按“先滚，再算命中，再本地重排”的顺序走：
  // 1. 如果手指贴近边缘，先推动 scroll-view，避免算命中时还停留在旧视口
  // 2. 用最新 rect 计算当前命中的锚点
  // 3. 只有命中别的卡片时，才更新局部顺序
  const handleSortHandleTouchMove = async (event: TouchEvent) => {
    if (!draggingCardId.value || !categoryId.value) {
      return;
    }

    const touchY = getTouchY(event);
    if (touchY === null) {
      return;
    }

    if (sortDragGrabOffsetY.value === null) {
      return;
    }

    const previousTouchY = sortDragLastTouchY.value;
    sortDragProxyTop.value = touchY - sortDragGrabOffsetY.value;
    sortDragPendingTouchY.value = touchY;
    sortDragLastTouchDeltaY.value = previousTouchY === null ? 0 : touchY - previousTouchY;
    sortDragLastTouchY.value = touchY;
    updateSortDragPreviewByTouchY(touchY);
    const didAutoScrollNow = autoScrollIfNeeded(touchY);
    if (isTouchNearAutoScrollEdge(touchY)) {
      runAutoScrollFrame();
    }
    writeSortDragDebug('触摸移动', {
      位移: Math.round(sortDragLastTouchDeltaY.value),
      命中Y: Math.round(getDragHitY(touchY)),
      自动距离: getAutoScrollDelta(touchY),
      靠近边缘: isTouchNearAutoScrollEdge(touchY),
      本次滚动: didAutoScrollNow,
    });

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
    const lastTouchY = sortDragLastTouchY.value;
    const finalTarget = lastTouchY === null ? null : getDragTargetByTouchY(getDragHitY(lastTouchY));
    const finalMove =
      finalTarget && draggingCardId.value && finalTarget.anchorId !== draggingCardId.value
        ? {
            movedId: draggingCardId.value,
            anchorId: finalTarget.anchorId,
            position: finalTarget.position,
          }
        : null;
    // 松手时优先保存“最后一次视觉落点”。APP 边缘滚动后，本地重排帧可能还没来得及
    // 把 preview 写入 currentMove；如果只保存 currentMove，就会出现看着拖到了但顺序没落库。
    const move = finalMove ?? sortDragPreviewMove.value ?? currentMove.value;

    writeSortDragDebug('松手保存', {
      movedId: move?.movedId || '-',
      anchorId: move?.anchorId || '-',
      position: move?.position || '-',
    });

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
    sortDragDebugText,
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
