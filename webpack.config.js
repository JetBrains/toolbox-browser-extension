/* eslint-env node */
/* eslint-disable import/no-commonjs */

const path = require('path');

const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const LicenseChecker = require('@jetbrains/ring-ui-license-checker');

module.exports = {
  entry: {
    github: './github',
    gitlab: './gitlab',
    bitbucket: './bitbucket',
    common: ['./common'] // https://github.com/webpack/webpack/issues/300
  },
  output: {
    filename: 'jetbrains-toolbox-[name].js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    loaders: [
      {
        test: require.resolve('whatwg-fetch'),
        loader: 'imports?Promise=core-js/es6/promise'
      },
      {
        test: /\.js$/,
        loader: 'babel'
      },
      {
        test: /\.(svg|png)$/,
        loader: 'file?name=[name].[ext]'
      }
    ]
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'common',
      minChunks: 2
    }),
    new CopyWebpackPlugin([
      {from: 'manifest.json'},
      {from: 'icon-128.png'} // Replace with logo from package after it's generation
    ]),
    new LicenseChecker({
      format: params => params.modules.map(mod => `${mod.name}@${mod.version} (${mod.url})
${mod.license.name} (${mod.license.url})`).join('\n\n'),
      filename: 'third-party-licences.txt',
      exclude: /@jetbrains\/logos/
    })
  ]
};
