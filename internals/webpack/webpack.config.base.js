'use strict'

const path = require('path')
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin')
const omit = require('lodash/omit')
const paths = require('./paths')
const svgoConfig = require('./svgo.config.json')

// 这个是基本配置, development和production都会继承它
module.exports = options => {
  const other = omit(options, [
    'devtool',
    'entry',
    'output',
    'resolve',
    'rules',
    'plugins',
  ])

  const results = {
    devtool: options.devtool || 'cheap-module-source-map',
    entry: options.entry,
    output: options.output,
    resolve: {
      // This allows you to set a fallback for where Webpack should look for modules.
      // We placed these paths second because we want `node_modules` to "win"
      // if there are any conflicts. This matches Node resolution mechanism.
      // 支持以非相对路径的形式引入模块文件
      modules: ['node_modules', paths.appNodeModules, paths.appSrc],
      // These are the reasonable defaults supported by the Node ecosystem.
      // We also include JSX as a common component filename extension to support
      // some tools, although we do not recommend using it, see:
      // https://github.com/facebookincubator/create-react-app/issues/290
      extensions: [
        '.web.ts',
        '.web.tsx',
        '.web.js',
        '.ts',
        '.tsx',
        '.js',
        '.json',
        '.jsx',
      ],
      alias: {
        // Support React Native Web
        // https://www.smashingmagazine.com/2016/08/a-glimpse-into-the-future-with-react-native-for-web/
        'react-native': 'react-native-web',
      },
      plugins: [
        // 阻止导入src或node_modules之外的模块
        new ModuleScopePlugin(paths.appSrc),
      ],
    },
    module: {
      strictExportPresence: true,
      rules: [
        // 首先检查ts代码是否符合规范
        {
          test: /\.(ts|tsx)$/,
          loader: require.resolve('tslint-loader'),
          enforce: 'pre',
          include: paths.appSrc,
        },
        // 这个loader将从所有JavaScript文件中提取sourcemap, 这些sourcemap将被webpack
        // 进行处理(适配devtool). 这个loader主要配合ts-loader, 将typescript的sourceMap
        // 转换为webpack的sourcemap
        {
          test: /\.js$/,
          loader: require.resolve('source-map-loader'),
          enforce: 'pre',
          include: paths.appSrc,
          // 禁用require.ensure因为他不是一个标准的语言特性, 使用import()代替
          parser: { requireEnsure: false },
        },
        // ** ADDING/UPDATING LOADERS **
        // The "file" loader handles all assets unless explicitly excluded.
        // The `exclude` list *must* be updated with every change to loader extensions.
        // When adding a new loader, you must add its `test`
        // as a new entry in the `exclude` list for "file" loader.

        // "file" loader makes sure those assets get served by WebpackDevServer.
        // When you `import` an asset, you get its (virtual) filename.
        // In production, they would get copied to the `build` folder.
        {
          exclude: [
            /\.html$/,
            // We have to write /\.(js|jsx)(\?.*)?$/ rather than just /\.(js|jsx)$/
            // because you might change the hot reloading server from the custom one
            // to Webpack's built-in webpack-dev-server/client?/, which would not
            // get properly excluded by /\.(js|jsx)$/ because of the query string.
            // Webpack 2 fixes this, but for now we include this hack.
            // https://github.com/facebookincubator/create-react-app/issues/1713
            /\.(js|jsx)(\?.*)?$/,
            /\.(ts|tsx)(\?.*)?$/,
            /\.css$/,
            /\.json$/,
            /\.bmp$/,
            /\.gif$/,
            /\.jpe?g$/,
            /\.png$/,
            /\.svg$/,
          ],
          loader: require.resolve('file-loader'),
          options: {
            name: 'static/media/[name].[hash:8].[ext]',
          },
        },
        // "url" loader works like "file" loader except that it embeds assets
        // smaller than specified limit in bytes as data URLs to avoid requests.
        // A missing `test` is equivalent to a match.
        {
          test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/, /\.svg$/],
          exclude: [/\.icon\.svg$/],
          loader: require.resolve('url-loader'),
          options: {
            limit: 10000,
            name: 'static/media/[name].[hash:8].[ext]',
          },
        },
        // svg sprite
        {
          test: /\.icon\.svg$/,
          use: [
            {
              loader: require.resolve('svg-sprite-loader'),
              options: {
                esModule: false,
              },
            },
            { loader: require.resolve('svg-fill-loader') },
            {
              loader: require.resolve('svgo-loader'),
              options: {
                plugins: svgoConfig,
              },
            },
          ],
          include: paths.appSrc,
        },
        // ** STOP ** Are you adding a new loader?
        // Remember to add the new extension(s) to the "url" loader exclusion list.
      ].concat(options.rules || []),
    },
    plugins: options.plugins,
    // Some libraries import Node modules but don't use them in the browser.
    // Tell Webpack to provide empty mocks for them so importing them works.
    node: {
      fs: 'empty',
      net: 'empty',
      tls: 'empty',
    },
  }

  return Object.assign(results, other)
}
