const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: './src/index.ts',
  devtool: 'inline-source-map',
  module: {
    loaders: [
      {
        test: /\.tsx?$/,
        loader: 'awesome-typescript-loader',
        exclude: /node_modules/
      },
      {
        test: /\.scss$/,
          use: [{
            loader: "style-loader"
          }, {
            loader: "css-loader"
          }, {
            loader: "sass-loader"
          }]
       }
    ]
  },
  resolve: {
    extensions: [ ".webpack.js", ".tsx", ".jsx", ".ts", ".js" ]
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  }
};
