<template>
  <view class="content-toolbar">
    <view class="content-toolbar-head">
      <view class="content-toolbar-title">Markdown 工具</view>
      <view class="content-toolbar-hint">常用格式快捷插入</view>
    </view>
    <view class="content-actions">
      <view class="content-action action-heading" @click="insertHeading()">
        <view class="content-action-icon">H</view>
        <view class="content-action-text">标题</view>
      </view>
      <view class="content-action action-strong" @click="insertBold()">
        <view class="content-action-icon">B</view>
        <view class="content-action-text">加粗</view>
      </view>
      <view class="content-action action-quote" @click="insertQuote()">
        <view class="content-action-icon">“</view>
        <view class="content-action-text">引用</view>
      </view>
      <view class="content-action action-list" @click="insertList()">
        <view class="content-action-icon">•</view>
        <view class="content-action-text">列表</view>
      </view>
      <view class="content-action action-link" @click="insertLink()">
        <view class="content-action-icon">@</view>
        <view class="content-action-text">链接</view>
      </view>
      <view class="content-action action-image" @click="insertImageTemplate()">
        <view class="content-action-icon">IMG</view>
        <view class="content-action-text">图片</view>
      </view>
      <view class="content-action action-code" @click="insertCodeBlock('示例代码')">
        <view class="content-action-icon">&lt;/&gt;</view>
        <view class="content-action-text">代码块</view>
      </view>
      <view class="content-action action-table" @click="insertTable()">
        <view class="content-action-icon">TBL</view>
        <view class="content-action-text">表格</view>
      </view>
      <view class="content-action action-divider" @click="insertDivider()">
        <view class="content-action-icon">---</view>
        <view class="content-action-text">分割线</view>
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
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

// 维护光标位置，确保插入内容后光标能正确定位
const cursorPosition = ref(0);
const lockInsertPosition = ref(false);

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

// 维护本地内容状态，实时反映输入框内容，不直接更改外部 modelValue
const localContent = ref(props.modelValue || '');

// 监听外部 modelValue 变化，更新本地内容
watch(
  () => props.modelValue,
  (newVal) => {
    localContent.value = newVal || '';
  },
);

const onInput = (event: Event | { detail?: { value?: string; cursor?: number } }) => {
  const eventTarget = 'target' in event && event.target instanceof HTMLTextAreaElement ? event.target : undefined;
  const eventDetail = 'detail' in event ? event.detail : undefined;
  const value = eventDetail?.value ?? eventTarget?.value ?? '';

  // 更新光标位置
  const pos = eventDetail?.cursor ?? eventTarget?.selectionStart ?? value.length;
  cursorPosition.value = pos;
  lockInsertPosition.value = false;

  localContent.value = value;
  emit('update:modelValue', value);
};

const onFocus = () => {
  lockInsertPosition.value = false;
};

// 失去焦点时确保更新光标
const onBlur = (event: Event | { detail?: { value?: string; cursor?: number } }) => {
  if (lockInsertPosition.value) {
    return;
  }

  const eventTarget = 'target' in event && event.target instanceof HTMLTextAreaElement ? event.target : undefined;
  const eventDetail = 'detail' in event ? event.detail : undefined;
  const value = eventDetail?.value ?? eventTarget?.value ?? '';
  const pos = eventDetail?.cursor ?? eventTarget?.selectionStart ?? value.length;
  cursorPosition.value = pos;
};

// 插入内容
function appendContent(text: string) {
  const pos = cursorPosition.value;
  const newValue = localContent.value.slice(0, pos) + text + localContent.value.slice(pos);
  localContent.value = newValue;
  // 更新光标位置到插入内容后
  cursorPosition.value = pos + text.length;
  lockInsertPosition.value = true;
  emit('update:modelValue', newValue);
}

// 插入标题
function insertHeading(level = 1, text = '一级标题') {
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
function insertList() {
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
</script>
<style lang="css" scoped>
.content-toolbar {
  margin-top: 12rpx;
  padding: 16rpx;
  border-radius: 20rpx;
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
  gap: 16rpx;
  flex-wrap: wrap;
}

.content-toolbar-title {
  color: #1e1c18;
  font-size: 24rpx;
  font-weight: 700;
}

.content-toolbar-hint {
  color: #6f6a62;
  font-size: 20rpx;
  line-height: 1.6;
}

.content-actions {
  margin: 14rpx 0;
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 10rpx;
}

.content-action {
  min-height: 74rpx;
  padding: 10rpx 6rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  border-radius: 16rpx;
  border: 1rpx solid transparent;
  box-sizing: border-box;
  font-weight: 600;
}

.content-action-icon {
  min-width: 44rpx;
  height: 30rpx;
  padding: 0 8rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.72);
  font-size: 18rpx;
  letter-spacing: 0.2rpx;
  line-height: 1;
}

.content-action-text {
  font-size: 20rpx;
  line-height: 1;
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
</style>
