const path = require("path");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { VueLoaderPlugin } = require("vue-loader");
const { IgnorePlugin } = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");

const webpackConfig = (_, { mode }) => {
  const isProd = mode === "production";
  process.env.NODE_ENV = mode;
  return {
    mode: isProd ? "production" : "development",
    entry: "./src/index.ts",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].[contenthash].js",
      clean: true,
    },
    module: {
      rules: [
        {
          resourceQuery: /raw/,
          type: "asset/resource",
        },
        {
          test: /\.([cm]?ts|tsx)$/,
          use: [
            {
              loader: "ts-loader",
              options: {
                transpileOnly: true,
              },
            },
          ],
        },
        {
          test: /\.(s[ac]|c)ss$/i,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: "css-loader",
              options: {
                importLoaders: 2,
              },
            },
            "postcss-loader",
            {
              loader: "sass-loader",
              options: {
                additionalData: '@import "~style/bulma/theme/_variables.scss";',
              },
            },
          ],
        },
        {
          test: /\.vue$/,
          use: ["vue-loader"],
        },
        {
          test: /\.wasm$/,
          type: "asset/resource",
        },
      ],
    },
    performance: {
      hints: isProd ? "warning" : false,
    },
    plugins: [
      new VueLoaderPlugin(),
      new ForkTsCheckerWebpackPlugin({
        typescript: {
          mode: "write-references",
          extensions: {
            vue: {
              enabled: true,
              compiler: "@vue/compiler-sfc",
            },
          },
        },
        devServer: false,
      }),
      new HtmlWebpackPlugin({
        title: "DM Playground!",
        template: path.resolve(__dirname, "src", "index.html"),
      }),
      new MiniCssExtractPlugin(),
      new IgnorePlugin({
        resourceRegExp: /\.\/(capstone-x86.min.js|libwabt.js)$/,
        contextRegExp: /lib$/,
      }),
    ],
    resolve: {
      alias: {
        style: path.resolve(__dirname, "src/styles"),
      },
      extensions: [".js", ".vue", ".tsx", ".ts"],
      fallback: {
        perf_hooks: false,
        fs: false,
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        buffer: require.resolve("buffer/"),
      },
    },
    optimization: {
      runtimeChunk: "single",
      splitChunks: {
        cacheGroups: {
          styles: {
            test: /\.(s[ac]|c)ss$/,
            name: "styles",
            chunks: "all",
            priority: 20,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
          },
          vendors_big: {
            test(module) {
              return module.context?.match(/[\\/]node_modules[\\/]/);
            },
            name(module) {
              // get the name. E.g. node_modules/packageName/not/this/part.js
              // or node_modules/packageName
              //console.log(module);
              const packageName = module.context.match(
                /[\\/]node_modules[\\/](.*?)([\\/]|$)/,
              )[1];

              // npm package names are URL-safe, but some servers don't like @ symbols
              return `npm.${packageName.replace("@", "")}`;
            },
            minSize: 100_000,
            priority: 10,
            chunks: "all",
          },
        },
      },
      minimize: true,
      minimizer: [
        new TerserPlugin({
          exclude: /\?raw$/,
        }),
      ],
    },
    devServer: {
      client: {
        progress: true,
      },
      historyApiFallback: true,
      hot: true,
      port: 8080,
    },
    devtool: isProd ? "source-map" : "eval-cheap-module-source-map",
    stats: {
      loggingDebug: ["sass-loader"],
    },
  };
};
module.exports = webpackConfig;
