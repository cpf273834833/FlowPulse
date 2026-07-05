import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

const ignoredDirs = new Set([
  '.git',
  '.idea',
  'node_modules',
  'target',
  'build',
  'dist',
  'data',
  '_screens',
]);

const checkedExtensions = new Set([
  '.java',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.css',
  '.html',
  '.xml',
  '.yml',
  '.yaml',
  '.properties',
  '.md',
  '.json',
  '.sql',
  '.sh',
  '.ps1',
]);

const exactBadTokens = [
  '\u951f', // 锟
  '\ufffd', // replacement character
];

// Typical UTF-8 Chinese text decoded as GBK/CP936. Use Unicode escapes here so
// the checker itself cannot be corrupted by terminal or editor code pages.
const mojibakeFragments = [
  '\u935a', // 鍚
  '\u93b8', // 鎸
  '\u95b2', // 閲
  '\u95b0', // 閰
  '\u7487', // 璇
  '\u9422', // 鐢
  '\u7039', // 瀹
  '\u5f42', // 彂
  '\u59ab', // 妫
  '\u6d94', // 涔
  '\u721c', // 爜
  '\u6d93', // 涓
  '\u52ed', // 勭
  '\u59dd', // 姝
  '\u68ff', // 棿
  '\u5bee', // 寮
  '\u675e', // 杞
  '\u682b', // 栫
  '\u785c', // 硜/硅 family
  '\u7281', // 犁/犱 family
  '\u509b', // 傛
  '\u7198', // 熘/熻 family
  '\u55d8', // 嗘
  '\u7cba', // 粺
  '\u6783', // 枃
  '\u6d60', // 浠
  '\u6d63', // 浣
  '\u4f78', // 佸
  '\u53a4', // 厤
  '\u6769', // 杩
  '\u56ec', // 囬
  '\u93c1', // 鏁
  '\u5a34', // 娴
  '\u7470', // 瑰
  '\u796d', // 祴
  '\u9a9e', // 骞
  '\u9353', // 鍓
  '\ue06c', // private-use chars frequently present in mojibake output
];

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        files.push(...await collectFiles(absolute));
      }
      continue;
    }
    if (checkedExtensions.has(path.extname(entry.name))) {
      files.push(absolute);
    }
  }
  return files;
}

function lineColumn(content, index) {
  const before = content.slice(0, index);
  const lines = before.split(/\r\n|\r|\n/);
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

function findSuspiciousToken(content) {
  for (const token of exactBadTokens) {
    const index = content.indexOf(token);
    if (index >= 0) {
      return { token, index };
    }
  }
  for (const token of mojibakeFragments) {
    const index = content.indexOf(token);
    if (index >= 0) {
      return { token, index };
    }
  }
  return null;
}

const files = await collectFiles(rootDir);
const findings = [];

for (const file of files) {
  const content = await readFile(file, 'utf8');
  const finding = findSuspiciousToken(content);
  if (finding) {
    const position = lineColumn(content, finding.index);
    findings.push({
      file: path.relative(rootDir, file),
      token: finding.token,
      line: position.line,
      column: position.column,
    });
  }
}

if (findings.length > 0) {
  console.error('检测到疑似中文乱码或非法替换字符，请先修复再构建：');
  for (const finding of findings.slice(0, 120)) {
    console.error(`- ${finding.file}:${finding.line}:${finding.column} -> ${finding.token}`);
  }
  if (findings.length > 120) {
    console.error(`... 还有 ${findings.length - 120} 个文件未展示`);
  }
  process.exit(1);
}

console.log(`文本完整性检查通过，共检查 ${files.length} 个文本文件。`);
