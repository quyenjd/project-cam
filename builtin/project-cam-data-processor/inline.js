const { inlineSource } = require('inline-source');
const fs = require('fs');
const path = require('path');
const htmlpath = path.resolve(__dirname, './dist/index.html');

inlineSource(htmlpath, {
  attribute: false,
  compress: true
}).then((html) => {
  fs.writeFileSync(htmlpath, html, { encoding: 'utf8' });
}).catch((err) => {
  console.log(err);
});
