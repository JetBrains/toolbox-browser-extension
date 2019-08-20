/* eslint-env node */
/* eslint-disable import/no-commonjs */

const path = require('path');

const CopyWebpackPlugin = require('copy-webpack-plugin');
const LicenseChecker = require('@jetbrains/ring-ui-license-checker');

module.exports = {
  entry: {
    github: './github',
    gitlab: './gitlab',
    bitbucket: './bitbucket',
    common: ['./common'], // https://github.com/webpack/webpack/issues/300
    background: './background',
    popup: './popup'
  },
  output: {
    filename: 'jetbrains-toolbox-[name].js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: require.resolve('whatwg-fetch'),
        loader: 'imports-loader?Promise=core-js/es6/promise'
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        options: {
          babelrc: false,
          presets: [
            [
              require('@babel/preset-env')
            ]
          ]
        }
      },
      {
        test: /\.(svg|png)$/,
        loader: 'file-loader?name=[name].[ext]'
      }
    ]
  },
  optimization: {
    splitChunks: {
      name: 'common',
      minChunks: 2
    }
  },
  plugins: [
    new CopyWebpackPlugin([
      {from: 'manifest.json'},
      {from: 'icons/icon-128.png', to: 'icon-128.png'}, // Replace with logo from package after it's generation
      {from: 'icons/icon-disabled-128.png', to: 'icon-disabled-128.png'},
      {from: 'popup/index.html', to: 'jetbrains-toolbox-popup.html'},
      {from: 'popup/disabled.html', to: 'jetbrains-toolbox-disabled-popup.html'}
    ]),
    new LicenseChecker({
      format: params => params.modules.map(mod => `${mod.name}@${mod.version} (${mod.url})
${mod.license.name} (${mod.license.url})`).join('\n\n'),
      filename: 'third-party-licences.txt',
      exclude: /@jetbrains\/logos/
    })
  ]
};
