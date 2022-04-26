import ApexCharts from 'apexcharts';
import { parse, unparse } from 'papaparse';

/**
 * @type {import('@project-cam/helper').default}
 */
const helper = window.Helper;

/**
 * @type {HTMLSelectElement}
 */
const graphSelect = document.getElementById('select');

/**
 * @type {HTMLDivElement}
 */
const graphBox = document.getElementById('graph');

/**
 * @type {HTMLSelectElement}
 */
const exportBox = document.getElementById('export');
const exportFileType = exportBox.getElementsByTagName('select')[0];
const exportButton = exportBox.getElementsByTagName('button')[0];

helper((event, api, destroy) => {
  /**
   * @type {{ name: string, series: { data: number[], name: string }[], xaxis: any[] }|null}
   */
  let data = null;

  /**
   * @type {ApexCharts|null}
   */
  let graph = null;

  const render = () => {
    if (graph) {
      graph.destroy();
      graph = null;
    }

    if (data) {
      const lineOptions = {
        series: data.series,
        chart: {
          type: 'line',
          toolbar: {
            tools: {
              download: false
            }
          }
        },
        stroke: {
          curve: 'straight'
        },
        title: {
          text: 'Line Visualization (w.r.t. ' + data.name + ')',
          align: 'left'
        },
        grid: {
          row: {
            colors: ['#fafafa', 'transparent'],
            opacity: 0.5
          }
        },
        xaxis: {
          categories: data.xaxis
        }
      };

      graphBox.textContent = '';

      switch (graphSelect.value) {
        case 'straightline':
          graph = new ApexCharts(graphBox, lineOptions);
          graph.render();
          break;
        case 'curveline':
          graph = new ApexCharts(graphBox, {
            ...lineOptions,
            stroke: {
              curve: 'smooth'
            }
          });
          graph.render();
          break;
        case 'stepline':
          graph = new ApexCharts(graphBox, {
            ...lineOptions,
            stroke: {
              curve: 'stepline'
            }
          });
          graph.render();
          break;
        case 'column':
          graph = new ApexCharts(graphBox, {
            series: data.series,
            chart: {
              type: 'bar',
              toolbar: {
                tools: {
                  download: false
                }
              }
            },
            plotOptions: {
              bar: {
                horizontal: false,
                columnWidth: '55%',
                endingShape: 'rounded'
              }
            },
            stroke: {
              show: true,
              width: 2,
              colors: ['transparent']
            },
            title: {
              text: 'Column Visualization (w.r.t. ' + data.name + ')',
              align: 'left'
            },
            fill: {
              opacity: 1
            },
            xaxis: {
              categories: data.xaxis
            }
          });
          graph.render();
          break;
        default:
          graphBox.textContent = 'Unsupported graph type.';
          break;
      }
    } else graphBox.textContent = 'No data.';

    if (graph) {
      window.export = function () {
        const saveBase64 = (base64) => {
          exportButton.disabled = true;
          api.call('savefileas', base64.split(',')[1], 'base64', 'Export PNG As...', [{ extensions: ['png'], name: 'PNG File' }]).finally(() => {
            exportButton.disabled = false;
          });
        };

        switch (exportFileType.value) {
          case 'png1':
            graph.dataURI({ scale: 1 }).then(({ imgURI }) => {
              saveBase64(imgURI);
            });
            break;
          case 'png2':
            graph.dataURI({ scale: 2 }).then(({ imgURI }) => {
              saveBase64(imgURI);
            });
            break;
          case 'png3':
            graph.dataURI({ scale: 3 }).then(({ imgURI }) => {
              saveBase64(imgURI);
            });
            break;
          case 'png4':
            graph.dataURI({ scale: 4 }).then(({ imgURI }) => {
              saveBase64(imgURI);
            });
            break;
          case 'png5':
            graph.dataURI({ scale: 5 }).then(({ imgURI }) => {
              saveBase64(imgURI);
            });
            break;
          case 'csv':
            exportButton.disabled = true;
            api.call(
              'savefileas',
              unparse(
                (() => {
                  const arr = [[data.name, ...data.series.map((value) => value.name)]];
                  data.xaxis.forEach((value, idx) => arr.push([value, ...data.series.map(({ data }) => data[idx])]));
                  return arr;
                })(),
                { skipEmptyLines: 'greedy' }
              ),
              'utf8',
              'Export CSV As...',
              [{ extensions: ['csv'], name: 'CSV File' }]
            ).finally(() => {
              exportButton.disabled = false;
            });
            break;
          default:
            api.call('alert', 'Unsupported graph export type: ' + (exportFileType.value || 'n/a'));
            break;
        }
      };
      exportBox.style.display = 'block';
    } else {
      window.export = function () { };
      exportBox.style.display = 'none';
    }
  };

  graphSelect.addEventListener('change', function () {
    render();
  });

  event.bind('newinput', (input) => {
    const checkValidArrayOfArray = (array) => {
      return typeof array === 'object' && Array.isArray(array) && array.length > 1
        ? array.reduce((prev, curr, idx) => (
          prev && typeof curr === 'object' && Array.isArray(curr) && curr.length > +(!idx)
        ), true)
        : false;
    };

    const removeDuplicatingColumns = (array) => {
      const removed = [];
      const markedColumns = {};
      for (let idx = 0; idx < array[0].length; ++idx) {
        if (!Object.prototype.hasOwnProperty.call(markedColumns, array[0][idx])) { markedColumns[array[0][idx]] = idx; }
      }
      const filteredIndexes = Object.values(markedColumns).sort();
      array.forEach((row) => {
        const newRow = [];
        filteredIndexes.forEach((idx) => {
          if (idx < row.length) newRow.push(row[idx]);
        });
        removed.push(newRow);
      });
      return removed;
    };

    const inputData = input.data.map((value) => {
      const parsed = parse(value.value, { skipEmptyLines: 'greedy' });
      return parsed.errors.length ? [] : parsed.data;
    });

    if (!inputData || !inputData.length || !checkValidArrayOfArray(inputData[0])) {
      data = null;
      render();
      return;
    }

    const header = new Set(inputData[0][0]);
    const headerArr = [...header];

    // Filter out inputs that do not share header with first input
    const filtered = inputData.filter((value, index) => (!index || (checkValidArrayOfArray(value) && (() => {
      const almostHeader = new Set(value[0]);
      return header.size === almostHeader.size ? headerArr.every(value => almostHeader.has(value)) : false;
    })())));

    for (let idx = 0; idx < filtered.length; ++idx) { filtered[idx] = removeDuplicatingColumns(filtered[idx]); }

    const columns = {};
    Array.from(header).forEach((column) => {
      columns[column] = [];
    });

    filtered.forEach((csv) => {
      csv.forEach((row, idx) => {
        if (idx) {
          for (let idx = 0; idx < header.size; ++idx) {
            columns[csv[0][idx]].push(idx >= row.length ? '' : row[idx]);
          }
        }
      });
    });

    const finalColumns = {};
    for (const column in columns) { finalColumns[column] = []; }
    const markedXAxisValues = new Set();
    columns[inputData[0][0][0]].forEach((value, idx) => {
      if (!markedXAxisValues.has(value)) {
        for (const column in columns) { finalColumns[column].push(columns[column][idx]); }
        markedXAxisValues.add(value);
      }
    });

    data = {};
    data.name = inputData[0][0][0];
    data.xaxis = finalColumns[data.name];
    data.series = [];
    for (const column in finalColumns) {
      if (column !== data.name) {
        data.series.push({
          name: column,
          data: finalColumns[column].map((value) => parseFloat(value) || 0.0)
        });
      }
    }

    render();
  });

  // Finally, enable the operation
  graphSelect.disabled = false;
});
