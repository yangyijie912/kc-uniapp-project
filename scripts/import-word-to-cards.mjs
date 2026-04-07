import fs from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';

const workspaceRoot = process.cwd();
const inputArg = process.argv[2];

if (!inputArg) {
  console.error('Usage: npm run import:word -- <path-to-docx-or-directory>');
  process.exit(1);
}

const inputPath = path.resolve(workspaceRoot, inputArg);
const outputPath = path.resolve(workspaceRoot, 'src/data/cards.json');

const LABELS = {
  category: ['分类', 'category'],
  question: ['问题', '题目', 'question'],
  answer: ['答案', 'answer'],
  content: ['补充', '补充笔记', '笔记', '内容', 'content'],
  tags: ['标签', 'tags'],
};

function normalizeLabel(value) {
  return value
    .trim()
    .replace(/[:：]\s*$/, '')
    .toLowerCase();
}

function resolveField(label) {
  const normalized = normalizeLabel(label);

  return Object.entries(LABELS).find(([, aliases]) => aliases.includes(normalized))?.[0] ?? null;
}

function toPlainText(rawText) {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function parseCards(text, fallbackCategory) {
  if (isLabeledCardText(text)) {
    return parseLabeledCards(text);
  }

  return parseNoteStyleCards(text, fallbackCategory);
}

function isLabeledCardText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);

  const labeledLines = lines.filter((line) =>
    /^(分类|子分类|问题|题目|答案|补充|内容|标签)\s*[:：]/.test(line),
  );

  return labeledLines.length >= 3;
}

async function collectInputFiles(targetPath) {
  const stats = await fs.stat(targetPath);

  if (stats.isFile()) {
    return [targetPath];
  }

  if (!stats.isDirectory()) {
    throw new Error(`Unsupported input path: ${targetPath}`);
  }

  const entries = await fs.readdir(targetPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.docx')
    .map((entry) => path.join(targetPath, entry.name))
    .sort((left, right) => left.localeCompare(right, 'zh-CN'));
}

function parseLabeledCards(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const cards = [];
  let current = null;
  let currentField = null;

  const pushCurrent = () => {
    if (!current) {
      return;
    }

    if (!current.category || !current.question || !current.answer) {
      throw new Error(`Card is missing required fields: ${JSON.stringify(current, null, 2)}`);
    }

    cards.push({
      id: String(cards.length + 1),
      category: current.category,
      question: current.question,
      answer: current.answer,
      ...(current.content ? { content: current.content } : {}),
      ...(current.tags?.length ? { tags: current.tags } : {}),
    });
  };

  for (const line of lines) {
    if (/^---+$/.test(line)) {
      pushCurrent();
      current = null;
      currentField = null;
      continue;
    }

    const match = line.match(/^([^:：]+)[:：]\s*(.*)$/);

    if (match) {
      const [, rawLabel, rawValue] = match;
      const field = resolveField(rawLabel);

      if (field) {
        if (!current) {
          current = {};
        }

        currentField = field;

        if (field === 'tags') {
          current.tags = rawValue
            .split(/[，,]/)
            .map((tag) => tag.trim())
            .filter(Boolean);
        } else {
          current[field] = rawValue.trim();
        }
        continue;
      }
    }

    if (!current || !currentField) {
      continue;
    }

    if (currentField === 'tags') {
      current.tags = [
        ...(current.tags ?? []),
        ...line
          .split(/[，,]/)
          .map((tag) => tag.trim())
          .filter(Boolean),
      ];
    } else {
      current[currentField] = current[currentField] ? `${current[currentField]}\n${line}` : line;
    }
  }

  pushCurrent();

  return cards;
}

function cleanHeading(line, fallbackCategory) {
  let cleaned = line.replace(/^[a-z0-9]{2,}\s*/i, '').trim();

  if (cleaned.startsWith(fallbackCategory)) {
    cleaned = cleaned.slice(fallbackCategory.length).trim();
  }

  return cleaned || fallbackCategory;
}

function isLikelyHeading(line) {
  return (
    line.length <= 20 &&
    !/[？?：:]/.test(line) &&
    !/^(第?\d+|[（(]?\d+[)）]|[-*•])/.test(line) &&
    !/[<>/=+]/.test(line)
  );
}

function isLikelyQuestion(line) {
  return (
    /[？?]$/.test(line) ||
    (line.length <= 40 &&
      /(是什么|区别|作用|原理|实现|为什么|怎么|有哪些|执行顺序|说说|区别都|分别是什么)/.test(line))
  );
}

function buildCardFromNote(cards, currentCard, bodyLines) {
  if (!currentCard || !currentCard.question) {
    return;
  }

  const contentLines = bodyLines.filter(Boolean);
  const content = contentLines.join('\n').trim();

  cards.push({
    id: String(cards.length + 1),
    category: currentCard.category,
    question: currentCard.question,
    answer: '待补充',
    ...(content ? { content } : {}),
  });
}

function parseNoteStyleCards(text, fallbackCategory) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const cards = [];
  let currentCard = null;
  let bodyLines = [];

  lines.forEach((line, index) => {
    if (index === 0) {
      return;
    }

    if (isLikelyHeading(line)) {
      buildCardFromNote(cards, currentCard, bodyLines);
      currentCard = null;
      bodyLines = [];
      return;
    }

    if (isLikelyQuestion(line)) {
      buildCardFromNote(cards, currentCard, bodyLines);
      currentCard = {
        category: fallbackCategory,
        question: line,
      };
      bodyLines = [];
      return;
    }

    if (currentCard) {
      bodyLines.push(line);
    }
  });

  buildCardFromNote(cards, currentCard, bodyLines);

  return cards;
}

const inputFiles = await collectInputFiles(inputPath);

if (inputFiles.length === 0) {
  throw new Error(`No .docx files found in ${inputPath}`);
}

const cards = [];

for (const filePath of inputFiles) {
  const { value: rawText } = await mammoth.extractRawText({ path: filePath });
  const text = toPlainText(rawText);
  const fallbackCategory = path.basename(filePath, path.extname(filePath));
  const parsedCards = parseCards(text, fallbackCategory);
  cards.push(...parsedCards);
}

const normalizedCards = cards.map((card, index) => ({
  ...card,
  id: String(index + 1),
}));

await fs.writeFile(outputPath, `${JSON.stringify(normalizedCards, null, 2)}\n`, 'utf8');

console.log(`Imported ${normalizedCards.length} cards to ${outputPath}`);
console.log('Expected DOCX format:');
console.log('分类: React');
console.log('子分类: Hooks');
console.log('问题: 为什么 useEffect 不能 async？');
console.log('答案: 因为 useEffect 期望返回 cleanup 函数。');
console.log('补充: 这里可以写多行内容。');
console.log('标签: React, Hooks');
console.log('---');
