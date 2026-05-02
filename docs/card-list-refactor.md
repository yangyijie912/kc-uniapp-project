# 卡片列表重构说明

## 背景

这轮重构不是为了“把文件切小”，而是为了把卡片列表页里已经打结的交互数据流重新理顺。

卡片列表页同时承担了这些职责：列表展示、多选、批量删除、批量转移、拖拽排序、搜索、状态筛选、分页刷新、排序参数保存。最开始的问题不是页面太长，而是状态来源太多：同一个动作经常要同步多个变量，结果就会变成一组隐式协议，而不是一条自然的数据流。

## 重构目标

1. 页面只保留一份交互模式源。
2. 选择逻辑和排序逻辑都只消费这份模式源。
3. 列表展示层只负责视觉和事件，不吞业务落库。
4. 批量操作区和分类弹窗要能独立看懂、独立维护。
5. 文档要能回溯“为什么这么拆”，而不只是记录“最后拆成了什么”。

## 先后经历

### 第一版尝试：把选择逻辑搬成 composable

一开始把多选相关状态抽到了 composable，但页面层仍然要传入大量 props，结果只是从“页面里一大坨”变成“组件间一大坨”。

这一版暴露的问题是：

- 参数仍然很多，阅读时需要来回跳转。
- 选择、排序、批量区之间的依赖关系没有真正变简单。
- 分类转移弹窗在拆分后曾经因为没把分类数据链路接回来而空掉。

### 第二版尝试：把多选 + 批量操作合成一个功能区

后来把“多选 + 批量操作”整体挪进功能区组件，思路是对的，但如果仍然通过 `provide / inject` 或大量 props 做同步，就还是会让人感觉在写协议，而不是在写组件。

这一步的结论是：

- 组件本身应该完整，但它不应该隐式吞掉页面状态。
- 只隔一层的父子关系，显式 props 和 composable 通常比 `provide / inject` 更直观。
- 多选退出如果顺手把模式切回浏览态，语义会混，后面很难复盘。

### 最终版：页面保留单一模式源，选择与排序分别消费

最后稳定下来的结构是：

- 页面层保留唯一的 `interactionMode`。
- `useCardSelection` 负责长按进入多选、选中切换、触摸阈值、多选态清理。
- `useCardSortDrag` 只负责排序拖拽，但共享同一个 `interactionMode`。
- 卡片列表只负责渲染。
- 批量操作栏和转移弹窗各自独立。

## 最终边界

- `src/pages/cardList/index.vue`：页面编排、查询条件、分页加载、批量落库、弹窗开关。
- `src/types/card.ts`：`InteractionMode` 类型定义的实际来源。
- `src/composables/useCardListInteraction.ts`：唯一的模式状态源。
- `src/composables/useCardSelection.ts`：多选交互逻辑。
- `src/composables/useCardSortDrag.ts`：拖拽排序逻辑。
- `src/pages/cardList/components/CardList.vue`：列表渲染、空态、footer、选择/拖拽视觉。
- `src/pages/cardList/components/CardBatchActions.vue`：批量操作栏。
- `src/pages/cardList/components/TransferCategoryDialog.vue`：转移分类弹窗。

## 数据流

```ts
const interaction = useCardListInteraction()
const selection = useCardSelection({
	interactionMode: interaction.interactionMode,
	setInteractionMode: interaction.setInteractionMode,
	isSearchResultMode,
})
const sortDrag = useCardSortDrag({
	interactionMode: interaction.interactionMode,
	setInteractionMode: interaction.setInteractionMode,
	...
})
```

这里的关键不是“拆成了几个文件”，而是“只有一份模式源”。

多选和排序都依赖同一个 `interactionMode`：浏览、选择、排序三种状态是互斥的，页面是唯一能决定切换时机的地方。选择 composable 不再偷偷把页面切回浏览态，退出多选只负责清理选择态；页面如果要回到浏览态，要显式写 `interaction.setInteractionMode('browse')`。

## 为什么没继续用 provide / inject

这次确实试过 `provide / inject`，但最后放弃了，原因很简单：

- 这里父子只隔一层，`provide / inject` 反而把依赖藏起来了。
- 依赖隐藏后，阅读组件时看不到“这个组件到底吃了哪些页面状态”。
- 为了减少 props 而引入隐式上下文，最后会变成更难排查的同步协议。

这类场景里，显式 props 或 composable 组合更适合。

## 这次实际踩过的坑

1. 多选退出和浏览态切换混在一起，导致语义不清。
2. 排序 composable 一开始还在定义 `InteractionMode`，概念上是反的，后来挪到了 `src/types/card.ts`。
3. 转移分类弹窗拆出去后，曾经出现过分类数据没接回去的问题，说明功能区拆分必须带着依赖一起移动，而不是只搬模板。
4. 选择区和排序区曾经各自维护状态，再通过事件和重置 key 同步，最后被确认成“同步协议”，因此改成了单一模式源。

## 如何复现当前设计意图

如果后续还要继续看这块代码，建议按这个顺序理解：

1. 先看 [src/pages/cardList/index.vue](src/pages/cardList/index.vue)，确认页面只做编排和落库。
2. 再看 [src/composables/useCardListInteraction.ts](src/composables/useCardListInteraction.ts)，确认模式只有一个来源。
3. 然后看 [src/composables/useCardSelection.ts](src/composables/useCardSelection.ts) 和 [src/composables/useCardSortDrag.ts](src/composables/useCardSortDrag.ts)，看两条交互怎么消费同一模式。
4. 最后看 [src/pages/cardList/components/CardList.vue](src/pages/cardList/components/CardList.vue)、[src/pages/cardList/components/CardBatchActions.vue](src/pages/cardList/components/CardBatchActions.vue)、[src/pages/cardList/components/TransferCategoryDialog.vue](src/pages/cardList/components/TransferCategoryDialog.vue)，确认 UI 拆分没有再把状态藏起来。

## 继续优化时的原则

- 页面层始终保留唯一模式源。
- 退出多选只做清理，不顺手切别的状态。
- 列表展示层只负责展示和事件。
- 批量操作可以独立成块，但不要重新把页面状态隐式化。
- 如果以后再拆，优先看“依赖是否一起移动”，不要只看“文件是不是更少”。
