const glob = require('glob');
const path = require('path');
const MergeIntoSingleFilePlugin = require('webpack-merge-and-include-globally');
const TerserPlugin = require('terser-webpack-plugin');

const jsFiles = glob.sync('./js/components/*.js');
jsFiles.push('./js/ready.js');

module.exports = {
  entry: jsFiles,
  output: {
    filename: './js/dashboard.js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  target: ['electron12-renderer', 'es2020'],
  mode: process.env.NODE_ENV || 'none',
  plugins: [
    new MergeIntoSingleFilePlugin({
      files: {
        './js/extension.js': [
          path.resolve(__dirname, 'js/.ext/jquery.min.js'),
          path.resolve(__dirname, 'js/.ext/jquery-ui.min.js'),
          path.resolve(__dirname, 'js/.ext/es6-promise.auto.min.js'),
          path.resolve(__dirname, 'js/.ext/attrchange.min.js'),
          path.resolve(__dirname, 'js/.ext/datatables.min.js'),
          path.resolve(__dirname, 'js/.ext/jquery-confirm.min.js'),
          path.resolve(__dirname, 'js/.ext/jquery.scrollintoview.min.js'),
          path.resolve(__dirname, 'js/.ext/jquery.toast.min.js'),
          path.resolve(__dirname, 'js/.ext/jquery.ui.touch-punch.min.js'),
          path.resolve(__dirname, 'js/.ext/panzoom.min.js'),
          path.resolve(__dirname, 'js/.ext/spectrum.min.js'),
          path.resolve(__dirname, 'js/.ext/hotkeys.min.js'),
          path.resolve(__dirname, 'js/.ext/jquery.actual.min.js')
        ],
        './css/extension.css': [
          path.resolve(__dirname, 'css/.ext/all.min.css'),
          path.resolve(__dirname, 'css/.ext/jquery-ui.min.css'),
          path.resolve(__dirname, 'css/.ext/normalize.min.css'),
          path.resolve(__dirname, 'css/.ext/typebase.min.css'),
          path.resolve(__dirname, 'css/.ext/datatables.min.css'),
          path.resolve(__dirname, 'css/.ext/jquery.toast.min.css'),
          path.resolve(__dirname, 'css/.ext/jquery-confirm.min.css'),
          path.resolve(__dirname, 'css/.ext/spectrum.min.css')
        ]
      }
    })
  ],
  externals: [
    (function () {
      const IGNORES = ['electron'];
      return function ({ request }, callback) {
        if (IGNORES.indexOf(request) >= 0) { return callback(null, 'null'); }
        return callback();
      };
    })()
  ],
  optimization: {
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          format: {
            comments: false
          }
        }
      })
    ]
  }
};
