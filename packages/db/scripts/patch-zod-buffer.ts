import fs from 'fs';
import path from 'path';

const dir = path.resolve(__dirname, '../shared/schemas/objects');

fs.readdirSync(dir).forEach(file => {
  if (!file.endsWith('.schema.ts')) return;
  const full = path.join(dir, file);
  let content = fs.readFileSync(full, 'utf8');
  if (content.includes('z.instanceof(Buffer)') && !content.includes("import { Buffer")) {
    content = `import { Buffer } from 'buffer';\n` + content;
    fs.writeFileSync(full, content);
    console.log('Patched:', file);
  }
});
