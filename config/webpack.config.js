const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

const isDevelopment = process.env.NODE_ENV === 'development';

module.exports = {
  mode: isDevelopment ? 'development' : 'production',
  entry: {
    main: ['./src/renderer/index.tsx']
  },
  target: 'web',
  output: {
    path: path.resolve(__dirname, '../build'),
    filename: 'renderer.js',
    publicPath: isDevelopment ? '/' : './',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@main': path.resolve(__dirname, '../src/main'),
      '@renderer': path.resolve(__dirname, '../src/renderer'),
      '@shared': path.resolve(__dirname, '../src/shared'),
      '@modules': path.resolve(__dirname, '../src/modules'),
    },
    fallback: {
      "path": require.resolve("path-browserify"),
      "fs": false,
      "stream": require.resolve("stream-browserify"),
      "buffer": require.resolve("buffer"),
      "http": require.resolve("http-browserify"),
      "https": require.resolve("https-browserify"),
      "url": require.resolve("url/"),
      "util": require.resolve("util/"),
      "process": require.resolve("process/browser"),
    },
  },
  devtool: isDevelopment ? 'source-map' : false,
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              '@babel/preset-typescript',
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.less$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'less-loader',
            options: {
              lessOptions: {
                javascriptEnabled: true,
              },
            },
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new NodePolyfillPlugin(),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      inject: true,
      meta: {
        charset: { charset: 'UTF-8' },
        'content-type': { 'http-equiv': 'Content-Type', content: 'text/html; charset=UTF-8' }
      }
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
    new webpack.NormalModuleReplacementPlugin(
      /node:process/,
      "process/browser.js"
    ),
    new webpack.NormalModuleReplacementPlugin(
      /process\/browser$/,
      "process/browser.js"
    ),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, '../public'),
    },
    port: 3000,
    host: 'localhost',
    hot: true,
    compress: true,
    historyApiFallback: true,
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
      logging: 'warn',
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Security-Policy': isDevelopment
        ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://localhost:3000 http://localhost:3000; img-src 'self' data:;"
        : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
    },
  },
}; 