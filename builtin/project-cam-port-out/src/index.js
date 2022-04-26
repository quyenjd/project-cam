/**
 * @type {import('@project-cam/helper').default}
 */
const helper = window.Helper;

/**
 * @type {HTMLInputElement}
 */
const portInput = document.getElementById('port');

/**
 * @type {HTMLButtonElement}
 */
const bindButton = document.getElementById('bind');

/**
 * @type {HTMLSpanElement}
 */
const statusText = document.getElementById('status');

helper((event, api, destroy) => {
  let data;
  let oldPort = 2201;
  event.bind('newinput', (input) => {
    if (input._.length) {
      data = input._[0].value;
    } else {
      data = null;
    }
    if (data != null && oldPort != null) {
      statusText.innerText = 'Sending...';
      api.call('sendtoport', oldPort, data).then(() => {
        statusText.innerText = 'Sent.';
      });
    }
  });
  window.bindPort = async function () {
    statusText.innerText = 'Binding...';
    await api.call('componentsetname', `Port Out [${oldPort = portInput.value}]`);
    if (data != null && oldPort != null) {
      await api.call('sendtoport', oldPort, data);
    }
    statusText.innerText = 'Bound successfully.';
  };
  portInput.disabled = false;
  bindButton.disabled = false;
  bindButton.innerText = 'Bind';

  // Backup/restore support
  event.bind('backup', () => {
    return { port: oldPort };
  });
  event.bind('restore', (data) => {
    const port = parseInt(data.port);
    if (!isNaN(port)) {
      portInput.value = port;
      window.bindPort();
    }
  });
});
