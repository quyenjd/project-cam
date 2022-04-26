/**
 * @type {import('@project-cam/helper').default}
 */
const helper = window.Helper;

/**
 * @type {HTMLButtonElement}
 */
const exportButton = document.getElementById('export');

helper((event, api, destroy) => {
  event.bind('newinput', (input) => {
    if (input.data && input.data.length) {
      exportButton.disabled = false;

      window.export = function () {
        exportButton.disabled = true;
        exportButton.textContent = 'Exporting';

        api.call(
          'savefileas',
          String(input.data[0].value),
          'utf8',
          'Export As...'
        ).finally(() => {
          exportButton.disabled = false;
          exportButton.textContent = 'Export';
        });
      };
    } else { exportButton.disabled = true; }
  });
});
