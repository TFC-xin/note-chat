// 写文件 - 通过 stdin 读 base64 内容
// 用法: echo "BASE64" | node write-b64.js <target>
const fs = require('fs');
const target = process.argv[2];
if (!target) { console.error('need path'); process.exit(1); }
const chunks = [];
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  try {
    const b64 = chunks.join('').replace(/\s/g, '');
    const buf = Buffer.from(b64, 'base64');
    fs.writeFileSync(target, buf);
    console.log('Wrote ' + buf.length + ' bytes to ' + target);
  } catch (e) {
    console.error('FAIL: ' + e.message);
    process.exit(1);
  }
});
