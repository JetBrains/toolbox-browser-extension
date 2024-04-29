/* eslint-env node */
/* eslint-disable import/no-commonjs */

const path = require('path');

const TerserPlugin = require('terser-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = {
  entry: {
    'github-public': './github-public',
    'gitlab-public': './gitlab-public',
    'bitbucket-public': './bitbucket-public',
    gitee: './providers/gitee',
    background: './background',
    'detect-enterprise': './detect-enterprise'
  },
  output: {
    filename: 'jetbrains-toolbox-[name].js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader'
      },
      {
        test: /\.svg$/,
        type: 'asset/inline'
      }
    ]
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          mangle: false,
          compress: {
            defaults: false,
            unused: true,
            arguments: true,
            booleans: false,
            expression: false,
            sequences: false,
            /* eslint-disable camelcase */
            join_vars: false,
            keep_classnames: true,
            keep_fnames: true
            /* eslint-enable camelcase */
          },
          format: {
            beautify: true,
            comments: false,
            /* eslint-disable camelcase */
            indent_level: 2
            /* eslint-enable camelcase */
          }
        }
      })
    ]
  },
  plugins: [
    new NodePolyfillPlugin({
      includeAliases: ['url', 'process']
    }),
    new CopyWebpackPlugin({
      patterns: [
        {from: 'manifest.json'},
        {from: 'icons/*'},
        {from: 'pages/*'},
        {from: 'popups/*'},
        {from: 'providers/**/assets/*'},
        {from: 'styles/*'}
      ]
    })
  ]
};
