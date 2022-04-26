/**
 * @type {import('@project-cam/helper').default}
 */
const helper = window.Helper;

/**
 * @type {HTMLSelectElement}
 */
const sourceSelect = document.getElementById('source');

/**
 * @type {HTMLDivElement}
 */
const urlBox = document.getElementById('url');
const urlInput = urlBox.getElementsByTagName('input')[0];
const urlButton = urlBox.getElementsByTagName('button')[0];

/**
 * @type {HTMLDivElement}
 */
const localBox = document.getElementById('local');
const localButton = localBox.getElementsByTagName('button')[0];

/**
 * @type {HTMLSpanElement}
 */
const statusText = document.getElementsByClassName('status')[0];

helper((event, api, destroy) => {
  let loaded;

  const push = (data) => {
    statusText.textContent = 'Pushing...';
    const bytes = (new TextEncoder().encode(data)).length;
    api.call('newoutput', { data }).finally(() => {
      statusText.textContent = 'Pushed ' + bytes + ' byte' + (bytes > 1 ? 's' : '') + '.';
      urlButton.disabled = localButton.disabled = false;
    });
  };

  window.fromURL = function (url) {
    urlInput.value = url = url ?? urlInput.value;

    sourceSelect.value = 'url';
    sourceSelect.dispatchEvent(new Event('change'));
    statusText.textContent = 'GETting the data...';
    urlButton.disabled = localButton.disabled = true;

    api.call('fetch', url, {
      method: 'GET',
      type: 'text'
    }).then((res) => {
      if (res) {
        push(res.body);
        loaded = { type: 'url', url };
      } else { throw new Error('No content to load.'); }
    }).catch((err) => {
      statusText.textContent = 'Cannot GET the data. ' + err;
      urlButton.disabled = localButton.disabled = false;
    });
  };

  window.fromLocal = function (dir) {
    sourceSelect.value = 'local';
    sourceSelect.dispatchEvent(new Event('change'));
    statusText.textContent = dir ? 'Loading the file...' : 'Browsing...';
    urlButton.disabled = localButton.disabled = true;

    (dir
      ? api.call('readfileabsolute', dir, 'utf8').then((res) => {
        if (res) {
          push(res);
          loaded = { type: 'file', file: dir };
        } else { throw new Error('No content to load.'); }
      })
      : api.call('readfilefrom', false, 'utf8', 'Load File From...').then((res) => {
        if (res) {
          push(res.data);
          loaded = { type: 'file', file: res.fullPath };
        } else { throw new Error('No content to load.'); }
      })
    ).catch((err) => {
      statusText.textContent = 'Cannot load the file. ' + err;
      urlButton.disabled = localButton.disabled = false;
    });
  };

  sourceSelect.addEventListener('change', function () {
    if (this.value === 'local') {
      localBox.style.display = 'block';
      urlBox.style.display = 'none';
    } else {
      urlBox.style.display = 'block';
      localBox.style.display = 'none';
    }
  });

  // Support backup/restore
  event.bind('backup', () => loaded || []);
  event.bind('restore', (data) => {
    if (data.type === 'url') { window.fromURL(data.url); } else if (data.type === 'file') { window.fromLocal(data.file); }
  });

  // Finally, enable all operations
  sourceSelect.disabled = false;
  urlButton.disabled = false;
  localButton.disabled = false;
});
