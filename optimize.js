const colors = require('colors');
const fs = require('fs');
const path = require('path');

console.log('Optimizing bundled source file: ' + colors.cyan.bold('dist/js/dashboard.js') + '...');

try {
  const dir = path.resolve(process.cwd(), './dist/js/dashboard.js');
  fs.writeFileSync(dir, fs.readFileSync(dir, { encoding: 'utf8' }).replace(/\\n[ ]+/g, '\\n '), { encoding: 'utf8' });
  console.log(colors.green('Optimized.'));
} catch (err) {
  console.log(colors.red(err));
}
