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
  let oldPort = 2201;
  window.bindPort = async function () {
    statusText.innerText = 'Binding...';
    if (oldPort != null) {
      await api.call('unbindfromport', oldPort);
      event.unbind(`port.${oldPort}`);
    }
    if (!(await api.call('bindtoport', oldPort = portInput.value))) {
      statusText.innerText = 'Binding declined. Currently unbound.';
      return;
    }
    event.bind(`port.${oldPort}`, (data) => {
      statusText.innerText = 'New data received.';
      api.call('newoutput', { _: data });
    });
    await api.call('componentsetname', `Port In [${oldPort}]`);
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
