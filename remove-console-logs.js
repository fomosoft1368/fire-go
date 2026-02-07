const fs = require('fs');

const filePath = 'd:\\fire-go\\backend\\src\\modules\\combined-trips\\services\\combined-trips.service.ts';

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace all lines containing console.log with empty string
  // This regex matches the entire line including whitespace and newline
  const originalLength = content.length;
  const newContent = content.replace(/^[ \t]*console\.log\([^)]*\);?[ \t]*[\r\n]*/gm, '');
  
  fs.writeFileSync(filePath, newContent, 'utf8');
  
  const removed = originalLength - newContent.length;
  console.log('✅ Successfully removed console.log statements');
  console.log('Characters removed:', removed);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
