/**
 * @type {import('@project-cam/helper').default}
 */
const helper = window.Helper;

/**
 * @type {HTMLButtonElement}
 */
const importButton = document.getElementById('import');

/**
 * @type {HTMLButtonElement}
 */
const exportButton = document.getElementById('export');

/**
 * @type {HTMLInputElement}
 */
const wrapCheckbox = document.getElementById('wrap');

/**
 * @type {HTMLButtonElement}
 */
const runButton = document.getElementById('run');

/**
 * @type {HTMLSpanElement}
 */
const statusText = document.getElementById('status');

/**
 * @type {HTMLTextAreaElement}
 */
const logTextArea = document.getElementById('log');

const acorn = require('acorn');

// Initialize code editor
const cm = CodeMirror.fromTextArea(document.getElementById('code'), {
  autocapitalize: false,
  autoCloseBrackets: true,
  autocorrect: false,
  autoRefresh: true,
  continueComments: true,
  indentUnit: 2,
  indentWithTabs: false,
  lineNumbers: true,
  lineWrapping: true,
  lint: { esversion: 6 },
  matchBrackets: true,
  mode: 'javascript',
  showCursorWhenSelecting: true,
  smartIndent: true,
  spellcheck: false,
  styleActiveLine: { nonEmpty: true },
  theme: 'idea'
});
cm.setValue(`// The code will be run in a Web Worker.
// To listen to input changes, use \`onmessage\` handler.
onmessage = function (e) {
  const input = e.data; // this is an array of strings
}

// To push new output to the application, use \`postMessage\` method.
postMessage('This is new output');`);

// In case helper callback is not called
window.importCode = window.exportCode = window.runCode = function () { };

// Toggle checkbox to turn on/off code wrapping
wrapCheckbox.addEventListener('change', function () {
  cm.setOption('lineWrapping', this.checked);
});

helper((event, api, destroy) => {
  let input;
  let worker;
  event.bind('newinput', (newInput) => {
    try {
      input = newInput.data.map((item) => item.value);
    } catch (err) {
      input = [];
    }
    if (worker) {
      worker.postMessage(input);
      statusText.textContent = 'New input sent.';
    }
  });

  // Support backup/restore
  event.bind('backup', () => cm.getValue());
  event.bind('restore', (data) => {
    cm.setValue(data);
  });

  // Terminate the worker before the component is destroyed
  event.bind('willremove', () => {
    if (worker) {
      worker.terminate();
      worker = null;
    }
  });

  window.importCode = function () {
    importButton.disabled = true;
    api.call('readfilefrom', false, 'utf8', 'Import Code From...').then((value) => {
      const print = (file) => '// ' + file.fullPath + '\n' + file.data + '\n';

      let flag = false;
      if (value) {
        if (Array.isArray(value)) {
          if (value.length) {
            flag = true;
            value = value.reduce((prev, curr) => prev + print(curr), '');
          }
        } else {
          flag = true;
          value = print(value);
        }
      }
      if (!flag) return;

      cm.setValue(value);
    }).finally(() => {
      importButton.disabled = false;
    });
  };

  window.exportCode = function () {
    exportButton.disabled = true;
    api.call('savefileas', cm.getValue(), 'utf8', 'Export Code To...').finally(() => {
      exportButton.disabled = false;
    });
  };

  window.runCode = function () {
    runButton.disabled = true;
    statusText.textContent = 'Preparing...';

    // Get the JS code
    const code = cm.getValue();

    // Parse the code
    try {
      acorn.parse(code, { ecmaVersion: 6 });
    } catch (err) {
      runButton.disabled = false;
      statusText.textContent = 'Parsing failed.';
      logTextArea.value = err;
      return;
    }

    // Run the code
    if (worker) {
      statusText.textContent = 'Terminating old one...';
      worker.terminate();
      worker = null;
    }
    statusText.textContent = 'Initiating...';
    try {
      worker = new window.Worker('data:application/javascript,' + encodeURIComponent(code));
      worker.onmessage = function (e) {
        statusText.textContent = 'New output received.';
        api.call('newoutput', { data: e.data });
        updateTextAreaValue(e.data);
      };
      statusText.textContent = 'Initiated.';
      worker.postMessage(input);
    } catch (err) {
      worker = null;
      console.error(err);
      statusText.textContent = 'Initiation failed.';
      updateTextAreaValue(err);
    }
    runButton.disabled = false;
  };
});

function updateTextAreaValue (value) {
  const MAX_OUTPUT_LENGTH = 200; // Maximum number of characters to be shown
  value = String(value);
  if (value.length > MAX_OUTPUT_LENGTH) { value = value.slice(0, MAX_OUTPUT_LENGTH) + '... (Showing first ' + MAX_OUTPUT_LENGTH + ' character' + (MAX_OUTPUT_LENGTH > 1 ? 's' : '') + ')'; }
  logTextArea.value = value;
}
