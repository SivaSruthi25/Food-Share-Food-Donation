const fs = require('node:fs');
const path = require('node:path');

const output = path.join(__dirname, 'dist');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const file of ['index.html', 'style.css', 'script.js']) {
  fs.copyFileSync(path.join(__dirname, file), path.join(output, file));
}

const apiUrl = process.env.FOODSHARE_API_URL || '';
const config = 'window.FOODSHARE_API_URL = ' + JSON.stringify(apiUrl) + ';' + String.fromCharCode(10);
fs.writeFileSync(path.join(output, 'config.js'), config, 'utf8');
