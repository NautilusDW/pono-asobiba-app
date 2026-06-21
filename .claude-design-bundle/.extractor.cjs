const fs = require('fs');
const path = require('path');

const src = 'C:/Users/surfe/AppData/Local/Temp/claude/d--AppDevelopment-pono-asobiba-app/98706302-b5b2-405d-b749-dd676243d69a/tasks/w0dh0p2aw.output';
const raw = fs.readFileSync(src, 'utf8');
const data = JSON.parse(raw);
const bundle = 'd:/AppDevelopment/pono-asobiba-app/.claude-design-bundle';

function unwrapIfDouble(content) {
  const trimmed = content.trimStart();
  if (trimmed.startsWith('{') && trimmed.includes('"content"')) {
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed.content === 'string') {
        return { unwrapped: true, content: parsed.content };
      }
    } catch (e) { /* not JSON */ }
  }
  return { unwrapped: false, content };
}

const closingHtml = '</' + 'html>';
const closingHtmlRe = new RegExp(closingHtml.replace('/', '\\/') + '\\s*$');

const report = [];
for (const f of data.result.files) {
  let result = unwrapIfDouble(f.content);
  let content = result.content;
  // Normalize line endings to LF
  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Strip BOM if present
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

  // Validate
  const issues = [];
  const isMd = f.path.endsWith('.md');
  const isHtml = f.path.endsWith('.html');
  if (isHtml) {
    if (!content.startsWith('<!-- @dsCard group=')) issues.push('missing dsCard marker at start');
    if (!content.includes('<!DOCTYPE html>')) issues.push('missing DOCTYPE');
    if (!closingHtmlRe.test(content)) issues.push('does not end with </html>');
  }
  if (isMd) {
    if (!/^#\s/m.test(content)) issues.push('no markdown # heading found');
  }

  const outPath = path.join(bundle, f.path);
  const dir = path.dirname(outPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, content, { encoding: 'utf8' });

  report.push({ path: f.path, unwrapped: result.unwrapped, issues, len: content.length, outPath });
}
console.log(JSON.stringify(report, null, 2));
