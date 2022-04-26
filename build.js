const colors = require('colors');
const cp = require('child_process');
const fs = require('fs');
const glob = require('glob');
const path = require('path');
const hasFlag = require('has-flag');

const buildScripts = ['npm run build'];
const buildProdScripts = ['npm run build:prod', ...buildScripts];

const built = [];
const failed = [];

const pattern = `{${process.argv
  .slice(2)
  .filter((value) => value.length && value[0] !== '-')
  .map((value) => value.replace(/(\/)*$/, ''))
  .join(',') || '**'},}/package.json`;

console.log(colors.magenta('Using pattern: ' + colors.bold(pattern)));

// Run `npm ci` (and `npm install` in case of failure) then build all found Node projects
glob.sync(pattern, {
  cwd: __dirname,
  ignore: '{package.json,**/node_modules/**,prepare/package.json}',
  realpath: true
}).forEach((absolutePath) => {
  console.log(colors.bold.white('\nFound Node project: ' + path.relative(__dirname, absolutePath)));
  const projectDir = path.dirname(absolutePath);

  try {
    console.log(colors.bold.cyan('Cleaning node_modules...'));
    fs.rmSync(path.join(projectDir, 'node_modules'), { recursive: true, force: true });
  } catch (err) {
    console.log(colors.red('Cleaning failed, skipping'));
  }

  try {
    console.log(colors.bold.cyan('Running npm ci...'));
    cp.execSync('npm ci', {
      cwd: projectDir,
      stdio: 'ignore',
      windowsHide: true
    });
  } catch (err) {
    console.log(colors.red('npm ci failed with status ' + err.status + ', trying another script'));

    try {
      console.log(colors.bold.cyan('Running npm install...'));
      cp.execSync('npm install', {
        cwd: projectDir,
        stdio: 'ignore',
        windowsHide: true
      });
    } catch (err) {
      console.log(colors.red('npm ci failed with status ' + err.status + ', skipping'));
      failed.push(projectDir);
      return;
    }
  }

  const scripts = hasFlag('p') || hasFlag('production') ? buildProdScripts : buildScripts;
  let ok = false;
  for (const script of scripts) {
    try {
      console.log(colors.bold.cyan('Running ' + script + '...'));
      cp.execSync(script, {
        cwd: projectDir,
        stdio: 'ignore',
        windowsHide: true
      });
      ok = true;
      break;
    } catch (err) {
      console.log(colors.red(script + ' failed with status ' + err.status + ', we\'ll try other ways'));
    }
  }

  if (ok) {
    built.push(projectDir);
  } else {
    console.log(colors.red('\nAll build scripts failed, skipping'));
    failed.push(projectDir);
  }
});

console.log(
  colors.green(colors.bold('\nBuilt:\n') + (built.map((dir) => '  ' + dir).join('\n') || '  None\n')) +
  colors.red(colors.bold('\nFailed:\n') + (failed.map((dir) => '  ' + dir).join('\n') || '  None\n'))
);
