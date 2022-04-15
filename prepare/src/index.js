#!/usr/bin/env node
import chalk from 'chalk';
import cp from 'child_process';
import commander from 'commander';
import fse from 'fs-extra';
import path from 'path';
import semver from 'semver';
import template from './template.js';
import { fileURLToPath } from 'url';
import { normalizeName, promptToggle, promptInput, promptNumeral, runTask } from './utils.js';
import { promisify } from 'util';

// Load version from Package JSON
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const program = new commander.Command();

program
  .name('prepare')
  .version(version)
  .argument('<dir>', 'directory to initialize the component/package project')
  .addOption(new commander.Option('-d, --default <type>', 'initialize with no configuration').choices(['component', 'package']).default(false))
  .option('-s, --skip-install', 'do not install the packages to node_modules', false)
  .action(async (dir, options) => {
    try {
      await prepare(dir, options);
    } catch (err) {
      console.log(chalk.red(err));
    }
  });

program.parse();

async function prepare (dir, options) {
  // We first resolve full directory to our destination
  const workingDir = path.resolve(process.cwd(), dir);

  // Check if the directory is valid
  if (!fse.existsSync(workingDir)) {
    if (!options.default && await promptToggle(chalk.red('The given directory does not exist.') + ' Do you want it to be created?')) { fse.ensureDirSync(workingDir); } else { throw new Error('The given directory does not exist.'); }
  }
  if (!fse.lstatSync(workingDir).isDirectory()) { throw new Error('The given directory is not a valid one.'); }

  // Check if the directory is empty
  if (fse.readdirSync(workingDir).length) { throw new Error('The given directory is not empty. Cannot initialize new project in a non-empty directory.'); }

  // Prompt
  if (options.default === 'package') {
    await runPackage(workingDir, normalizeName(path.basename(workingDir)), '0.0.0', path.basename(workingDir), '', []);
  } else if (options.default === 'component') {
    await runComponent(workingDir, normalizeName(path.basename(workingDir)), version, path.basename(workingDir), '', 200, 200, [], [], 'Uncategorized', false, '0.0.0', options.skipInstall);
  } else {
    const type = await promptToggle('Type of project you are initializing', 'Package', 'Component', true);
    const id = normalizeName(await promptInput(`${type ? 'Package' : 'Component'} id`, normalizeName(path.basename(workingDir))));
    const version = await promptVersion(`${type ? 'Package' : 'Component'} version`);
    const name = await promptInput(`${type ? 'Package' : 'Component'} name`, path.basename(workingDir));
    const description = await promptInput(`${type ? 'Package' : 'Component'} description`);

    if (type) {
      await runPackage(workingDir, id, version, name, description, []);
    } else {
      const defaultHeight = await promptNumeral('Default (minimum) height', 200);
      const defaultWidth = await promptNumeral('Default (minimum) width', 200);
      const category = await promptInput('Component category', 'Uncategorized');
      const minimized = await promptToggle('Should the component start minimized');
      const compatibleUntil = await promptVersion('Earliest version that is still supported');

      await runComponent(workingDir, id, version, name, description, defaultHeight, defaultWidth, [], [], category, minimized, compatibleUntil);
    }
  }
}

function promptVersion (message) {
  return promptInput(
    message,
    '0.0.0',
    (value) => {
      if (!semver.valid(value)) { return chalk.red('Must be a valid semver value!'); }
      return true;
    }
  );
}

async function runComponent (workingDir, id, version, name, description, defaultHeight, defaultWidth, input, output, category, minimized, compatibleUntil, skipInstall) {
  const install = skipInstall
    ? []
    : [
        {
          title: 'Run npm install',
          task: () =>
            promisify(cp.exec)('npm install', {
              cwd: workingDir,
              stdio: 'ignore',
              windowsHide: true
            })
        }
      ];

  await runTask([
    {
      title: 'Copy helper build',
      task: () =>
        promisify(fse.copyFile)(
          path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../helper.tar.gz'),
          path.join(workingDir, 'helper.tar.gz')
        )
    },
    {
      title: 'Prepare component.cam.json',
      task: () =>
        promisify(fse.writeFile)(
          path.join(workingDir, 'component.cam.json'),
          JSON.stringify({
            type: 'component',
            id,
            version,
            name,
            description,
            defaultHeight,
            defaultWidth,
            input,
            output,
            category,
            minimized,
            files: ['dist/*'],
            indexFile: 'dist/index.html',
            compatibleUntil
          }, null, 2)
        )
    },
    {
      title: 'Prepare package.json',
      task: () =>
        promisify(fse.writeFile)(
          path.join(workingDir, 'package.json'),
          JSON.stringify({
            ...template['package.json'],
            name: id,
            version,
            description
          }, null, 2)
        )
    },
    {
      title: 'Prepare src/index.js',
      task: () =>
        promisify(fse.ensureDir)(path.join(workingDir, 'src')).then(
          () => promisify(fse.writeFile)(
            path.join(workingDir, 'src', 'index.js'),
            template['src/index.js']
          )
        )
    },
    {
      title: 'Prepare template/index.html',
      task: () =>
        promisify(fse.ensureDir)(path.join(workingDir, 'template')).then(
          () => promisify(fse.writeFile)(
            path.join(workingDir, 'template', 'index.html'),
            template['template/index.html']
          )
        )
    },
    {
      title: 'Prepare .gitignore',
      task: () =>
        promisify(fse.writeFile)(
          path.join(workingDir, '.gitignore'),
          template['.gitignore']
        )
    },
    {
      title: 'Prepare webpack.config.js',
      task: () =>
        promisify(fse.writeFile)(
          path.join(workingDir, 'webpack.config.js'),
          template['webpack.config.js']
        )
    },
    {
      title: 'Prepare README.md',
      task: () =>
        promisify(fse.writeFile)(
          path.join(workingDir, 'README.md'),
          template['README.md'].replace(/\{type\}/, 'Component').replace(/\{id\}/, id)
        )
    },
    ...install
  ]);

  console.log(chalk.green('Initialized the component ' + chalk.bold.cyanBright(id) + ' with no input and output.'));
}

async function runPackage (workingDir, id, version, name, description, includes) {
  await runTask([
    {
      title: 'Prepare package.cam.json',
      task: () =>
        promisify(fse.writeFile)(
          path.join(workingDir, 'package.cam.json'),
          JSON.stringify({
            type: 'package',
            id,
            version,
            name,
            description,
            includes
          }, null, 2)
        )
    },
    {
      title: 'Prepare README.md',
      task: () =>
        promisify(fse.writeFile)(
          path.join(workingDir, 'README.md'),
          template['README.md'].replace(/\{type\}/, 'Package').replace(/\{id\}/, id)
        )
    }
  ]);

  console.log(chalk.green('Initialized the package ' + chalk.bold.cyanBright(id) + ' with no components.'));
}
