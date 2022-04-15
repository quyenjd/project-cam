const fse = require('fs-extra');
const path = require('path');
const log = require('single-line-log').stderr;
const Gitignore = require('gitignore-fs').default;
const replace = require('replace-in-file');
const ignore = new Gitignore();

const mirrorPath = path.resolve(__dirname, '../Mirror/project-cam');

(async () => {
  log('Preparing...');

  for (const file of
    require('glob').sync('**/*', {
      cwd: mirrorPath,
      dot: true,
      realpath: true
    })
  ) {
    if (!file.split(path.sep).includes('.git')) {
      await fse.remove(file);
    }
  }

  let copied = 0;
  for (const file of
    require('glob').sync('**/*', {
      cwd: __dirname,
      dot: true,
      nodir: true,
      realpath: true
    }).filter(
      (file) => !ignore.ignoresSync(file)
    ).map(
      (file) => path.relative(__dirname, file)
    )
  ) {
    log(`Copying ${file}...`);

    const fullPath = path.resolve(
      mirrorPath,
      file
    );

    try {
      await fse.ensureDir(
        path.dirname(fullPath)
      );
      await fse.copyFile(
        file,
        fullPath
      );
      ++copied;
    } catch (err) { }
  }

  log('Finalizing...');
  await replace({
    files: '../Mirror/project-cam/**/*.md',
    from: [/#markdown-header-/g, /(\|[^|\u0060]*\u0060[^|\u0060]*(\\\\)*)(?<!\\)\|([^|\u0060]*\u0060[^|\u0060]*\|)/g],
    to: ['#', '$1\\|$3']
  });

  log(`Copied ${copied} file${copied > 1 ? 's' : ''}.`);
})();
