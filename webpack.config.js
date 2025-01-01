import path from "path";
import { fileURLToPath } from "url";

import TerserPlugin from "terser-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import NodePolyfillPlugin from "node-polyfill-webpack-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default () => ({
  entry: {
    background: "./src/background/background",
    github: "./src/contentScripts/github",
    gitlab: "./src/contentScripts/gitlab",
    bitbucket: "./src/contentScripts/bitbucket",
    gitee: "./src/contentScripts/gitee",
    detectProvider: "./src/contentScripts/detectProvider",
  },
  output: {
    path: path.resolve(__dirname, `dist/${process.env.BROWSER}`),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: "babel-loader",
      },
      {
        test: /\.svg$/,
        type: "asset/inline",
      },
    ],
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
            join_vars: false,
            keep_classnames: true,
            keep_fnames: true,
          },
          format: {
            beautify: true,
            comments: false,
            indent_level: 2,
          },
        },
      }),
    ],
  },
  plugins: [
    new NodePolyfillPlugin({
      additionalAliases: ["url", "process"],
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "pages/*", context: "src/" },
        { from: "popups/*", context: "src/" },
        { from: "icons/*", context: "src/assets/" },
        { from: "styles/*", context: "src/assets/" },
        { from: "providers/**/assets/*", context: "src/content/" },
        { from: "manifest.json", context: `src/manifests/${process.env.BROWSER}/` },
      ],
    }),
  ],
});
