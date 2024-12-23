import path from "path";
import { fileURLToPath } from "url";

import TerserPlugin from "terser-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import NodePolyfillPlugin from "node-polyfill-webpack-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default () => ({
  entry: {
    "github-public": "./github-public",
    "gitlab-public": "./gitlab-public",
    "bitbucket-public": "./bitbucket-public",
    gitee: "./providers/gitee",
    background: "./background",
    "detect-enterprise": "./detect-enterprise",
  },
  output: {
    filename: "jetbrains-toolbox-[name].js",
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
        { from: "manifest.json", context: `manifests/${process.env.BROWSER}/` },
        { from: "icons/*" },
        { from: "pages/*" },
        { from: "popups/*" },
        { from: "providers/**/assets/*" },
        { from: "styles/*" },
      ],
    }),
  ],
});
