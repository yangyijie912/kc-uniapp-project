<template>
  <view class="bullet markdown-body">
    <rich-text :nodes="renderMarkdownToRichText"></rich-text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import MarkdownIt from 'markdown-it';

const props = defineProps<{ content: string }>();

// 初始化 MarkdownIt 实例
const md = new MarkdownIt({
  html: false, // 禁止 HTML 标签，确保安全
  breaks: true, // 换行转换为 <br>
  linkify: true, // 自动识别链接
  typographer: true, // 启用一些语言替换 + 引号美化
});

// 只保留明确的链接识别，关闭容易误判的模糊链接规则
md.linkify.set({
  fuzzyLink: false,
  fuzzyEmail: false,
  fuzzyIP: false,
});

md.renderer.rules.table_open = () =>
  '<div class="markdown-table-scroll"><table class="markdown-table">';
md.renderer.rules.table_close = () => '</table></div>';

// 将 Markdown 转换为富文本格式
const renderMarkdownToRichText = computed(() => {
  if (!props?.content) {
    return '';
  }
  const html = md.render(props.content);
  return html;
});
</script>

<style lang="css" scoped>
.bullet {
  margin-top: 14rpx;
  color: #6c645a;
  font-size: 26rpx;
  line-height: 1.8;
}

.markdown-body {
  word-break: break-word;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin: 36rpx 0 18rpx;
  color: #1e1c18;
  line-height: 1.45;
  font-weight: 700;
}

.markdown-body :deep(h1) {
  font-size: 40rpx;
}

.markdown-body :deep(h2) {
  font-size: 35rpx;
}

.markdown-body :deep(h3) {
  font-size: 31rpx;
}

.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  font-size: 28rpx;
}

.markdown-body :deep(h1:first-child),
.markdown-body :deep(h2:first-child),
.markdown-body :deep(h3:first-child),
.markdown-body :deep(h4:first-child),
.markdown-body :deep(h5:first-child),
.markdown-body :deep(h6:first-child),
.markdown-body :deep(p:first-child),
.markdown-body :deep(pre:first-child),
.markdown-body :deep(blockquote:first-child),
.markdown-body :deep(ul:first-child),
.markdown-body :deep(ol:first-child) {
  margin-top: 0;
}

.markdown-body :deep(p) {
  margin: 18rpx 0;
  color: #5e564d;
}

.markdown-body :deep(strong) {
  color: #1e1c18;
  font-weight: 700;
}

.markdown-body :deep(em) {
  color: #725f4e;
}

.markdown-body :deep(a) {
  color: #1f5eff;
  text-decoration: underline;
  word-break: break-all;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 18rpx 0;
  padding-left: 34rpx;
}

.markdown-body :deep(li) {
  margin: 10rpx 0;
  color: #5e564d;
}

.markdown-body :deep(blockquote) {
  margin: 14rpx 0 26rpx;
  padding: 18rpx 22rpx;
  border-left: 8rpx solid rgba(18, 122, 114, 0.28);
  border-radius: 0 18rpx 18rpx 0;
  background: rgba(18, 122, 114, 0.06);
  color: #5d6c69;
}

.markdown-body :deep(blockquote p) {
  margin: 0;
}

.markdown-body :deep(blockquote p + p) {
  margin-top: 12rpx;
}

.markdown-body :deep(.markdown-table-scroll) {
  margin: 22rpx 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.72);
}

.markdown-body :deep(.markdown-table) {
  width: 100%;
  min-width: 100%;
  border-collapse: collapse;
  table-layout: auto;
}

.markdown-body :deep(.markdown-table th),
.markdown-body :deep(.markdown-table td) {
  min-width: 160rpx;
  padding: 16rpx 18rpx;
  border: 1rpx solid rgba(61, 43, 24, 0.12);
  color: #5e564d;
  line-height: 1.6;
  vertical-align: top;
  word-break: break-word;
}

.markdown-body :deep(.markdown-table th) {
  background: rgba(18, 122, 114, 0.08);
  color: #1e1c18;
  font-weight: 700;
}

.markdown-body :deep(.markdown-table tr:nth-child(even) td) {
  background: rgba(61, 43, 24, 0.03);
}

.markdown-body :deep(code) {
  padding: 4rpx 10rpx;
  border-radius: 10rpx;
  background: rgba(61, 43, 24, 0.08);
  color: #7c3f1c;
  font-size: 24rpx;
  font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
}

.markdown-body :deep(pre) {
  margin: 22rpx 0;
  padding: 22rpx 24rpx;
  border-radius: 20rpx;
  background: #2a2420;
  overflow: auto;
}

.markdown-body :deep(pre code) {
  display: block;
  padding: 0;
  background: transparent;
  color: #f7efe6;
  font-size: 24rpx;
  line-height: 1.8;
  white-space: pre;
}

.markdown-body :deep(img) {
  display: block;
  width: 100%;
  max-width: 100%;
  margin: 22rpx 0;
  border-radius: 20rpx;
}

.markdown-body :deep(hr) {
  margin: 28rpx 0;
  border: none;
  border-top: 1rpx solid rgba(61, 43, 24, 0.12);
}
</style>
