const fs = require('fs');
const path = 'fossil/index.html';
const html = fs.readFileSync(path, 'utf8');
const scripts = [];
const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let m;
while ((m = re.exec(html)) !== null) { scripts.push(m[1]); }
const joined = scripts.join('\n;\n');
fs.writeFileSync('_tmp_fossil_js.js', joined);
console.log('extracted', scripts.length, 'scripts, total', joined.length, 'chars');
