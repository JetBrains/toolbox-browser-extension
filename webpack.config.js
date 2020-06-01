/* eslint-env node */
/* eslint-disable import/no-commonjs */

const path = require('path');

const TerserPlugin = require('terser-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const LicenseChecker = require('@jetbrains/ring-ui-license-checker');

module.exports = {
  entry: {
    'github-public': './github-public',
    'gitlab-public': './gitlab-public',
    'bitbucket-public': './bitbucket-public',
    background: './background',
    'clone-popup': './popup/clone',
    'detect-enterprise': './detect-enterprise'
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
    minimizer: [
      new TerserPlugin({
        parallel: true,
        extractComments: false,
        terserOptions: {
          extractComments: false,
          mangle: false,
          compress: {
            defaults: false,
            unused: true,
            arguments: true,
            booleans: false,
            expression: false,
            sequences: false,
            /* eslint-disable camelcase */
            dead_code: true,
            join_vars: false,
            keep_classnames: true,
            keep_fnames: true
            /* eslint-enable camelcase */
          },
          output: {
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
    new CopyWebpackPlugin({
      patterns: [
        {from: 'manifest.json'},
        {from: 'icons/icon-128.png', to: 'icon-128.png'}, // Replace with logo from package after it's generation
        {from: 'icons/icon-disabled-128.png', to: 'icon-disabled-128.png'},
        {from: 'popup/common.css', to: 'jetbrains-toolbox-common.css'},
        {from: 'popup/clone.html', to: 'jetbrains-toolbox-clone-popup.html'},
        {from: 'popup/disabled.html', to: 'jetbrains-toolbox-disabled-popup.html'},
        {from: 'distribution/README.md', to: 'README.md'}
      ]
    }),
    new LicenseChecker({
      format: params => params.modules.map(mod => `${mod.name}@${mod.version} (${mod.url})
${mod.license.name} (${mod.license.url})`).join('\n\n'),
      filename: 'third-party-licences.txt',
      exclude: /@jetbrains[\/|\\]logos/
    })
  ]
};
