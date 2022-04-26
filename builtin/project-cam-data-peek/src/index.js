/**
 * @type {import('@project-cam/helper').default}
 */
const helper = window.Helper;

/**
 * @type {HTMLTextAreaElement}
 */
const contentArea = document.getElementById('content');

helper((event, api, destroy) => {
  event.bind('newinput', (input) => {
    contentArea.value = 'Reloading...';
    let text = '';

    input.data.forEach((item) => {
      text += 'Parameter: ' + item.param + '\n==========\n';

      const value = String(item.value);
      const lines = value.substring(0, 100).split('\n');
      const ellipsis = value.length > 100 || lines.length > 5 ? '...' : '';

      text += lines.join('\n') + ellipsis + '\n==========\n\n';
    });

    contentArea.value = text || 'No input found.';
  });
});
