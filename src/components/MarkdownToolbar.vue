<template>
  <view class="content-toolbar">
    <view class="content-toolbar-head">
      <view class="content-toolbar-title">Markdown 工具</view>
      <view class="content-toolbar-hint">常用格式快捷插入</view>
    </view>
    <view class="content-actions">
      <view class="content-action action-code" @click="insertCodeBlock('示例代码')">
        <view class="content-action-icon">&lt;/&gt;</view>
        <view class="content-action-text">代码块</view>
      </view>
      <view class="content-action action-list" @click="openContentDialog('插入列表', 'list')">
        <view class="content-action-icon">•</view>
        <view class="content-action-text">列表</view>
      </view>
      <view class="content-action action-table" @click="openContentDialog('插入表格', 'table')">
        <view class="content-action-icon">TBL</view>
        <view class="content-action-text">表格</view>
      </view>
      <view class="content-action action-divider" @click="insertDivider()">
        <view class="content-action-icon">---</view>
        <view class="content-action-text">分割线</view>
      </view>
      <view v-show="!isMore" class="content-toggle" @click="isMore = !isMore">
        <view class="content-toggle-icon">+</view>
      </view>

      <view
        v-show="isMore"
        class="content-action action-heading"
        @click="openContentDialog('插入标题', 'title')"
      >
        <view class="content-action-icon">H</view>
        <view class="content-action-text">标题</view>
      </view>
      <view v-show="isMore" class="content-action action-strong" @click="insertBold()">
        <view class="content-action-icon">B</view>
        <view class="content-action-text">加粗</view>
      </view>
      <view v-show="isMore" class="content-action action-quote" @click="insertQuote()">
        <view class="content-action-icon">“</view>
        <view class="content-action-text">引用</view>
      </view>
      <view v-show="isMore" class="content-action action-link" @click="insertLink()">
        <view class="content-action-icon">@</view>
        <view class="content-action-text">链接</view>
      </view>
      <view v-show="isMore" class="content-action action-image" @click="insertImageTemplate()">
        <view class="content-action-icon">IMG</view>
        <view class="content-action-text">图片</view>
      </view>
      <view v-show="isMore" class="content-toggle content-toggle-close" @click="isMore = !isMore">
        <view class="content-toggle-icon">−</view>
      </view>
    </view>
    <textarea
      :value="localContent"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      class="form-textarea form-textarea-content"
      placeholder="补充更完整的解释、例子或笔记内容。"
      placeholder-class="input-placeholder"
      maxlength="-1"
      auto-height
    />
  </view>

  <BaseDialog
    :open="dialogState.visible"
    :title="dialogState.title"
    @confirm="onContentConfirm"
    @close="closeContentDialog"
  >
    <view class="dialog-config">
      <view v-if="dialogState.type === 'table'" class="dialog-section">
        <view class="dialog-section-tip">设置表格的行列数，确认后会自动插入模板。</view>
        <view class="dialog-field-row">
          <view class="dialog-field">
            <view class="dialog-field-label">行数</view>
            <input
              class="dialog-field-input"
              type="number"
              :value="tableRows"
              placeholder="默认 3 行"
              placeholder-class="dialog-input-placeholder"
              @input="onTableRowsInput"
            />
          </view>
          <view class="dialog-field">
            <view class="dialog-field-label">列数</view>
            <input
              class="dialog-field-input"
              type="number"
              :value="tableColumns"
              placeholder="默认 3 列"
              placeholder-class="dialog-input-placeholder"
              @input="onTableColumnsInput"
            />
          </view>
        </view>
      </view>

      <view v-if="dialogState.type === 'title'" class="dialog-section">
        <view class="dialog-section-tip">选择标题级别后，确认会插入对应层级的 Markdown 标题。</view>
        <view class="chip-grid chip-grid-title">
          <view
            v-for="level in titleLevels"
            :key="level.value"
            class="dialog-chip"
            :class="{ active: titleLevel === level.value }"
            @click="titleLevel = level.value"
          >
            {{ level.label }}
          </view>
        </view>
      </view>

      <view v-if="dialogState.type === 'list'" class="dialog-section">
        <view class="dialog-section-tip">选择列表类型后，确认将快速插入对应列表模板。</view>
        <view class="chip-grid chip-grid-list">
          <view
            class="dialog-chip"
            :class="{ active: listType === 'unordered' }"
            @click="listType = 'unordered'"
          >
            无序列表
          </view>
          <view
            class="dialog-chip"
            :class="{ active: listType === 'ordered' }"
            @click="listType = 'ordered'"
          >
            有序列表
          </view>
        </view>
      </view>
    </view>
  </BaseDialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import BaseDialog from './BaseDialog.vue';

type DialogType = 'table' | 'title' | 'list' | null;
type ListType = 'ordered' | 'unordered';

const titleLevels = [
  { label: '一级标题', value: 1 },
  { label: '二级标题', value: 2 },
  { label: '三级标题', value: 3 },
  { label: '四级标题', value: 4 },
  { label: '五级标题', value: 5 },
  { label: '六级标题', value: 6 },
] as const;

const isMore = ref(false);

const tableRows = ref<number>(3);
const tableColumns = ref<number>(3);
const titleLevel = ref<number>(1);
const listType = ref<ListType>('unordered');

const dialogState = reactive<{
  visible: boolean;
  title: string;
  type: DialogType;
}>({
  visible: false,
  title: '标题',
  type: null,
});

// 维护光标位置，确保插入内容后光标能正确定位
const cursorPosition = ref(0);
const lockInsertPosition = ref(false);

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

type InputLikeEvent =
  | Event
  | {
      detail?: { value?: string; cursor?: number };
      target?: { value?: string; selectionStart?: number };
    };

function readInputValue(event: InputLikeEvent) {
  const eventDetail = 'detail' in event ? event.detail : undefined;
  const eventTarget = ('target' in event ? event.target : undefined) as
    | { value?: string; selectionStart?: number }
    | undefined;

  return {
    value: eventDetail?.value ?? eventTarget?.value ?? '',
    cursor: eventDetail?.cursor ?? eventTarget?.selectionStart,
  };
}

// 维护本地内容状态，实时反映输入框内容，不直接更改外部 modelValue
const localContent = ref(props.modelValue || '');

// 监听外部 modelValue 变化，更新本地内容
watch(
  () => props.modelValue,
  (newVal) => {
    localContent.value = newVal || '';
  },
);

const onInput = (event: InputLikeEvent) => {
  const { value, cursor } = readInputValue(event);

  // 更新光标位置
  const pos = cursor ?? value.length;
  cursorPosition.value = pos;
  lockInsertPosition.value = false;

  localContent.value = value;
  emit('update:modelValue', value);
};

const onFocus = () => {
  lockInsertPosition.value = false;
};

// 失去焦点时确保更新光标
const onBlur = (event: InputLikeEvent) => {
  if (lockInsertPosition.value) {
    return;
  }

  const { value, cursor } = readInputValue(event);
  const pos = cursor ?? value.length;
  cursorPosition.value = pos;
};

// 插入内容
function appendContent(text: string) {
  const pos = cursorPosition.value;
  const blockText = `\n\n${text}\n\n`;
  const newValue = localContent.value.slice(0, pos) + blockText + localContent.value.slice(pos);
  localContent.value = newValue;
  // 更新光标位置到插入内容后
  cursorPosition.value = pos + blockText.length;
  lockInsertPosition.value = true;
  emit('update:modelValue', newValue);
}

// 插入标题
function insertHeading(level = 1, text = '默认标题') {
  appendContent(`${'#'.repeat(level)} ${text}`);
}

// 插入加粗文本
function insertBold(text = '重点内容') {
  appendContent(`**${text}**`);
}

// 插入引用
function insertQuote(text = '在这里写引用内容') {
  appendContent(`> ${text}`);
}

// 插入列表
function insertList(type: ListType = 'unordered') {
  if (type === 'ordered') {
    appendContent('1. 第一项\n2. 第二项\n3. 第三项');
    return;
  }
  appendContent('- 第一项\n- 第二项\n- 第三项');
}

// 插入链接
function insertLink(text = '链接文字', url = 'https://example.com') {
  appendContent(`[${text}](${url})`);
}

// 插入代码
function insertCodeBlock(code: string, language = 'ts') {
  const codeBlock = `\`\`\`${language}\n${code}\n\`\`\``;
  appendContent(codeBlock);
}

// 插入表格
function insertTable(rows: number = 3, columns: number = 3) {
  if (rows <= 0 || columns <= 0) {
    uni.showToast({
      title: '行列数必须大于0',
      icon: 'none',
    });
    return;
  }

  let table = '|';
  for (let c = 0; c < columns; c++) {
    table += ` Header ${c + 1} |`;
  }
  table += '\n|';
  for (let c = 0; c < columns; c++) {
    table += ' --- |';
  }
  for (let r = 0; r < rows; r++) {
    table += '\n|';
    for (let c = 0; c < columns; c++) {
      table += ` Cell ${r + 1}-${c + 1} |`;
    }
  }
  appendContent(table);
}

// 插入分割线
function insertDivider() {
  appendContent('---');
}

// 插入图片模板
function insertImageTemplate() {
  appendContent('![图片描述](https://example.com/image.jpg)');
}

// 打开内容编辑对话框
function openContentDialog(title: string, type: DialogType = null) {
  dialogState.title = title;
  dialogState.type = type;

  // 每次打开都回到默认值
  if (type === 'table') {
    tableRows.value = 3;
    tableColumns.value = 3;
  } else if (type === 'title') {
    titleLevel.value = 1;
  } else if (type === 'list') {
    listType.value = 'unordered';
  }

  dialogState.visible = true;
}

// 关闭内容编辑对话框
function closeContentDialog() {
  dialogState.visible = false;
}

// 根据对话框类型确认插入内容
function onContentConfirm() {
  switch (dialogState.type) {
    case 'table':
      insertTable(tableRows.value, tableColumns.value);
      break;
    case 'title':
      insertHeading(
        titleLevel.value,
        titleLevels.find((l) => l.value === titleLevel.value)?.label ?? '默认标题',
      );
      break;
    case 'list':
      insertList(listType.value);
      break;
    default:
      break;
  }
  closeContentDialog();
}

const onTableRowsInput = (
  event: Event | { detail?: { value?: string }; target?: { value?: string } },
) => {
  const detailValue = 'detail' in event ? event.detail?.value : undefined;
  const targetValue = ('target' in event ? event.target : undefined) as
    | { value?: string }
    | undefined;
  const numericValue = Number.parseInt(detailValue ?? targetValue?.value ?? '', 10);
  tableRows.value = Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 3;
};

const onTableColumnsInput = (
  event: Event | { detail?: { value?: string }; target?: { value?: string } },
) => {
  const detailValue = 'detail' in event ? event.detail?.value : undefined;
  const targetValue = ('target' in event ? event.target : undefined) as
    | { value?: string }
    | undefined;
  const numericValue = Number.parseInt(detailValue ?? targetValue?.value ?? '', 10);
  tableColumns.value = Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 3;
};
</script>
<style lang="css" scoped>
.content-toolbar {
  margin-top: 8rpx;
  padding: 14rpx;
  border-radius: 18rpx;
  background:
    radial-gradient(circle at top left, rgba(18, 122, 114, 0.1), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(247, 244, 239, 0.94));
  border: 1rpx solid rgba(61, 43, 24, 0.08);
  box-shadow: inset 0 1rpx 0 rgba(255, 255, 255, 0.72);
}

.content-toolbar-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10rpx;
  flex-wrap: wrap;
}

.content-toolbar-title {
  color: #1e1c18;
  font-size: 22rpx;
  font-weight: 700;
}

.content-toolbar-hint {
  color: #6f6a62;
  font-size: 18rpx;
  line-height: 1.4;
}

.content-actions {
  margin: 10rpx 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6rpx;
}

.content-action {
  min-width: 82rpx;
  min-height: 50rpx;
  padding: 0 10rpx;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  border-radius: 14rpx;
  border: 1rpx solid transparent;
  box-sizing: border-box;
  font-weight: 600;
  box-shadow: 0 4rpx 12rpx rgba(80, 55, 25, 0.04);
}

.content-action-icon {
  min-width: 24rpx;
  height: 20rpx;
  font-size: 14rpx;
  padding: 0 6rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.72);
  letter-spacing: 0.2rpx;
  line-height: 1;
}

.content-action-text {
  font-size: 18rpx;
  line-height: 1;
}

.content-toggle {
  min-width: 50rpx;
  min-height: 50rpx;
  padding: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border-radius: 14rpx;
  border: 1rpx dashed rgba(61, 43, 24, 0.14);
  background: rgba(255, 255, 255, 0.58);
  color: #6c645a;
  box-sizing: border-box;
}

.content-toggle-icon {
  min-width: 24rpx;
  height: 20rpx;
  font-size: 14rpx;
  padding: 0 6rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: rgba(61, 43, 24, 0.06);
  color: #3c342c;
  line-height: 1;
}

.content-toggle-close {
  background: rgba(61, 43, 24, 0.04);
}

.action-heading {
  background: rgba(31, 94, 255, 0.08);
  border-color: rgba(31, 94, 255, 0.12);
  color: #1f5eff;
}

.action-quote {
  background: rgba(115, 92, 74, 0.1);
  border-color: rgba(115, 92, 74, 0.14);
  color: #735c4a;
}

.action-strong {
  background: rgba(158, 91, 40, 0.1);
  border-color: rgba(158, 91, 40, 0.14);
  color: #9e5b28;
}

.action-list {
  background: rgba(127, 103, 78, 0.1);
  border-color: rgba(127, 103, 78, 0.14);
  color: #7f674e;
}

.action-link {
  background: rgba(84, 89, 214, 0.1);
  border-color: rgba(84, 89, 214, 0.14);
  color: #5459d6;
}

.action-image {
  background: rgba(18, 122, 114, 0.12);
  border-color: rgba(18, 122, 114, 0.16);
  color: #127a72;
}

.action-code {
  background: rgba(31, 94, 255, 0.1);
  border-color: rgba(31, 94, 255, 0.14);
  color: #1f5eff;
}

.action-table {
  background: rgba(239, 125, 66, 0.12);
  border-color: rgba(239, 125, 66, 0.16);
  color: #c76530;
}

.action-divider {
  background: rgba(92, 104, 118, 0.1);
  border-color: rgba(92, 104, 118, 0.14);
  color: #5c6876;
}

.form-textarea {
  margin-top: 12rpx;
  width: 100%;
  min-height: 180rpx;
  padding: 22rpx 24rpx;
  border-radius: 22rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.08);
  background: rgba(255, 255, 255, 0.88);
  color: #1e1c18;
  font-size: 28rpx;
  line-height: 1.7;
  box-sizing: border-box;
}

.form-textarea-content {
  min-height: 280rpx;
}

.input-placeholder {
  color: #9d9487;
  font-size: 28rpx;
}

.dialog-config {
  display: flex;
  flex-direction: column;
  gap: 22rpx;
}

.dialog-section {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.dialog-section-tip {
  color: #6c645a;
  font-size: 24rpx;
  line-height: 1.7;
}

.dialog-field-row {
  display: flex;
  gap: 16rpx;
}

.dialog-field {
  flex: 1;
}

.dialog-field-label {
  margin-bottom: 10rpx;
  color: #3c342c;
  font-size: 24rpx;
  font-weight: 600;
}

.dialog-field-input {
  width: 100%;
  height: 84rpx;
  padding: 0 20rpx;
  border-radius: 18rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.1);
  background: rgba(255, 255, 255, 0.86);
  color: #1e1c18;
  font-size: 28rpx;
  box-sizing: border-box;
}

.dialog-input-placeholder {
  color: #9d9487;
  font-size: 26rpx;
}

.chip-grid {
  display: grid;
  flex-wrap: wrap;
  gap: 10rpx;
}

.chip-grid-title {
  grid-template-columns: repeat(3, 1fr);
}

.chip-grid-list {
  grid-template-columns: repeat(1, 1fr);
}

.dialog-chip {
  min-height: 70rpx;
  padding: 0 18rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 18rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  background: rgba(255, 255, 255, 0.72);
  color: #6c645a;
  font-size: 24rpx;
  font-weight: 600;
  box-sizing: border-box;
}

.dialog-chip.active {
  border-color: rgba(31, 94, 255, 0.18);
  background: linear-gradient(135deg, rgba(18, 122, 114, 0.12), rgba(31, 94, 255, 0.12));
  color: #1f5eff;
}

.dialog-chip:active {
  transform: scale(0.98);
  opacity: 0.92;
}

@media (max-width: 360px) {
  .dialog-field-row {
    flex-direction: column;
  }

  .content-action {
    min-width: 74rpx;
  }
}
</style>
