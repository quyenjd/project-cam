export default {
  'src/index.js': `/**
 * @type {import('@project-cam/helper').default}
 */
const helper = window.Helper;

helper((event, api, destroy) => {
  // Your code goes here
});
`,
  'template/index.html': `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, height=device-height, initial-scale=1">
</head>

<body>
  <!-- Your code goes here -->
</body>

</html>
`,
  '.gitignore': `/*
!dist/
!src/
!template/
!.gitignore
!component.cam.json
!package.json
!package-lock.json
!README.md
!webpack.config.js
`,
  'webpack.config.js': `const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlInlineScriptPlugin = require('html-inline-script-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  mode: process.env.NODE_ENV || 'development',
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
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'index.js'
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      inject: 'body',
      minify: process.env.NODE_ENV === 'production' ? {
        caseSensitive: true,
        collapseWhitespace: true,
        keepClosingSlash: true,
        minifyCSS: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true
      } : false,
      template: 'template/index.html'
    }),
    new HtmlInlineScriptPlugin()
  ],
  target: 'web'
}
`,
  'package.json': {
    license: 'UNLICENSED',
    scripts: {
      build: 'webpack --config webpack.config.js',
      'build:prod': 'cross-env NODE_ENV=production webpack --config webpack.config.js'
    },
    devDependencies: {
      '@project-cam/helper': 'file:helper.tar.gz',
      'cross-env': '^7.0.3',
      'html-inline-script-webpack-plugin': '^2.0.2',
      'html-webpack-plugin': '^5.3.2',
      'terser-webpack-plugin': '^5.2.4',
      webpack: '^5.53.0',
      'webpack-cli': '^4.8.0'
    }
  },
  'README.md': `# {type}: {id}

This project is generated by \`@project-cam/prepare\`.

To build, use \`npm run build\`. For production build, use \`npm run build:prod\`.

Further information about how to configure the project can be found in the README of Project CAM.
`
};