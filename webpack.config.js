const path = require('path');
const MergeIntoSingleFilePlugin = require('webpack-merge-and-include-globally');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './js/ready.js',
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
          './js/ext/**/*.js'
        ],
        './css/extension.css': [
          './css/ext/**/*.css'
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
