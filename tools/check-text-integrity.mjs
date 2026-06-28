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
]);

const mojibakePattern = /�|脳|鈥|鈹|鍙|鐜|璇|绠|骞|閰|鎵|鏁|鍖|浣|绉|鐞|惧|槸/g;

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

const files = await collectFiles(rootDir);
const findings = [];

for (const file of files) {
  const content = await readFile(file, 'utf8');
  mojibakePattern.lastIndex = 0;
  let match;
  while ((match = mojibakePattern.exec(content)) !== null) {
    const position = lineColumn(content, match.index);
    findings.push({
      file: path.relative(rootDir, file),
      token: match[0],
      line: position.line,
      column: position.column,
    });
  }
}

if (findings.length > 0) {
  console.error('检测到疑似中文乱码或非法替换字符，请先修复再构建：');
  for (const finding of findings.slice(0, 80)) {
    console.error(`- ${finding.file}:${finding.line}:${finding.column} -> ${finding.token}`);
  }
  if (findings.length > 80) {
    console.error(`... 还有 ${findings.length - 80} 处未展示`);
  }
  process.exit(1);
}

console.log(`文本完整性检查通过，共检查 ${files.length} 个文本文件。`);
