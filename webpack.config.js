/* eslint-env node */
/* eslint-disable import/no-commonjs */

const path = require('path');

const TerserPlugin = require('terser-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const LicenseChecker = require('@jetbrains/ring-ui-license-checker');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = {
  entry: {
    'github-public': './github-public',
    'gitlab-public': './gitlab-public',
    'bitbucket-public': './bitbucket-public',
    background: './background',
    'clone-popup': './popups/clone',
    'detect-enterprise': './detect-enterprise',
    options: './pages/options'
  },
  output: {
    filename: 'jetbrains-toolbox-[name].js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: require.resolve('whatwg-fetch'),
        use: {
          loader: 'imports-loader',
          options: {
            promise: 'core-js/es6/promise'
          }
        }
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
        {from: 'icons/icon-128.png', to: 'icon-128.png'}, // Replace with logo from package after it's generation
        {from: 'icons/icon-disabled-128.png', to: 'icon-disabled-128.png'},
        {from: 'popups/clone.html', to: 'jetbrains-toolbox-clone-popup.html'},
        {from: 'popups/disabled.html', to: 'jetbrains-toolbox-disabled-popup.html'},
        {from: 'pages/options-extra-buttons.png', to: 'options-extra-buttons.png'},
        {from: 'pages/options.html', to: 'options.html'},
        {from: 'pages/options.css', to: 'options.css'},
        {from: 'styles/common.css', to: 'common.css'},
        {from: 'styles/page.css', to: 'page.css'},
        {from: 'styles/popup.css', to: 'popup.css'},
        {from: 'styles/variables.css', to: 'variables.css'}
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
