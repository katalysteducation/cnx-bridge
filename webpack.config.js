var debug = process.env.NODE_ENV !== "production";
var CopyWebpackPlugin = require('copy-webpack-plugin');
var autoprefixer = require('autoprefixer');
var webpack = require('webpack');
var path = require('path');

var copyConfig = new CopyWebpackPlugin([
  { from: './src/manifest.json', to: './build/manifest.json' },
  { from: './src/icons', to: './build/icons' },
  { from: './src/menu/menu.html', to: './build/app/menu/menu.html' },
  { from: './src/options/logo.png', to: './build/app/options/logo.png' },
  { from: './src/options/options.html', to: './build/app/options/options.html' },
  { from: './src/main/jax/jax.config.js', to: './build/app/jax/jax.config.js' }
]);

module.exports = {
  context: __dirname,
  devtool: debug ? "inline-sourcemap" : null,
  entry: {
    // Core Chrome Extension Compoenents.
    './build/app/menu/menu': './src/menu/menu.js',
    './build/app/content/content': './src/main/index.js',
    './build/app/bg/background': './src/bg/background.js',
    './build/app/options/options': './src/options/options.js',
    // MatchJax support.
    './build/app/jax/jax': './src/main/jax/jax.js',
  },
  output: {
    path: __dirname,
    filename: '[name].js'
  },
  module: {
    loaders: [
      {
        test: /\.js?$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015', 'stage-2']
        }
      },
     {
       test   : /\.scss$/,
       loaders: ['style', 'css', 'postcss-loader', 'sass']
     }
    ]
  },
  postcss: [autoprefixer({
     browsers: ['last 3 versions']
  })],
  plugins: debug ? [copyConfig] : [
    copyConfig,
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.optimize.UglifyJsPlugin({ mangle: false, sourcemap: false }),
  ],
};
