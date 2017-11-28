'use strict'

const autoprefixer = require('autoprefixer')
const path = require('path')
const fs = require('fs')
const webpack = require('webpack')
const cheerio = require('cheerio')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin')
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin')
const WatchMissingNodeModulesPlugin = require('react-dev-utils/WatchMissingNodeModulesPlugin')
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const chalk = require('chalk')
const webpackBaseConfig = require('./webpack.config.base')
const webpackDllConfig = require('./webpack.config.dll')
const getClientEnvironment = require('./env')
const paths = require('./paths')

// Webpack uses `publicPath` to determine where the app is being served from.
// In development, we always serve from the root. This makes config easier.
const publicPath = '/'
// `publicUrl` is just like `publicPath`, but we will provide it to our app
// as %PUBLIC_URL% in `index.html` and `process.env.PUBLIC_URL` in JavaScript.
// Omit trailing slash as %PUBLIC_PATH%/xyz looks better than %PUBLIC_PATH%xyz.
const publicUrl = ''
// Get environment variables to inject into our app.
const env = getClientEnvironment(publicUrl)

const { DLL_NAME, DLL_PATH } = env.raw
const manifestPath = path.resolve(DLL_PATH, DLL_NAME + '.json')
if (!fs.existsSync(manifestPath)) {
  console.error(
    `${chalk.bgRed('[Webpack Dev]')}: Dll manifest(${chalk.blue(
      manifestPath,
    )}) 文件不存在, 请运行'yarn dll'`,
  )
  process.exit(0)
}

// 使用DllPlugin 来加速第三方库的打包
function dependenciesHandle() {
  if (process.env.BUILDING_DLL) return []
  return [
    new webpack.DllReferencePlugin({
      context: process.cwd(),
      manifest: require(manifestPath),
      name: DLL_NAME,
    }),
  ]
}

// 注入dll文件到模板文件中
function templateContent() {
  const html = fs.readFileSync(paths.appHtml).toString()
  const doc = cheerio.load(html)
  const body = doc('body')
  body.append(`<script data-dll="true" src="/${DLL_NAME}.dll.js"></script>`)
  return doc.html()
}

// 这个是开发时配置文件, 专注于开发体验和快速rebuild
module.exports = webpackBaseConfig({
  // You may want 'eval' instead if you prefer to see the compiled output in DevTools.
  devtool: 'cheap-module-source-map',
  // These are the "entry points" to our application.
  // This means they will be the "root" imports that are included in JS bundle.
  // The first two entry points enable "hot" CSS and auto-refreshes for JS.
  entry: [
    // 支持react热加载
    'react-hot-loader/patch',
    // 包含一个客户端, 用于连接到webpackDevSever, 用于支持热更新
    // 下面这行代码相当于:
    // require.resolve('webpack-dev-server/client') + '?/',
    // require.resolve('webpack/hot/dev-server'),
    require.resolve('react-dev-utils/webpackHotDevClient'),
    // 默认包含polyfill
    require.resolve('./polyfills'),
    // 所有错误在开发环境都被视为fatal错误
    require.resolve('react-error-overlay'),
    // 引入源代码入口
    paths.appIndexJs,
    // We include the app code last so that if there is a runtime error during
    // initialization, it doesn't blow up the WebpackDevServer client, and
    // changing JS code would still trigger a refresh.
  ],
  output: {
    // 输出目录, 这一行不是必须的,但是没有它webpackDevServer会报错
    path: paths.appBuild,
    // 添加 /* filename */ 注释到生成后的require()s
    pathinfo: true,
    // 这个不会生成真实的文件, 而是通过 webpackDevServer 在内存文件系统中伺服
    filename: 'static/js/bundle.js',
    // 其他代码分割后的chunk
    chunkFilename: 'static/js/[name].chunk.js',
    // 这个是你的App伺服的目录, 在开发时我们使用'/'
    publicPath: publicPath,
    // Point sourcemap entries to original disk location
    devtoolModuleFilenameTemplate: info =>
      path.resolve(info.absoluteResourcePath),
  },
  rules: [
    // 编译.tsx?
    {
      test: /\.(ts|tsx)$/,
      include: paths.appSrc,
      use: [
        require.resolve('react-hot-loader/webpack'),
        {
          loader: require.resolve('ts-loader'),
          options: {
            transpileOnly: true,
          },
        },
      ],
    },

    // 处理.css文件
    {
      test: /\.css$/,
      use: [
        require.resolve('style-loader'),
        {
          loader: require.resolve('css-loader'),
          options: {
            importLoaders: 1,
          },
        },
        {
          loader: require.resolve('postcss-loader'),
          options: {
            ident: 'postcss', // https://webpack.js.org/guides/migrating/#complex-options
            plugins: () => [
              require('postcss-flexbugs-fixes'),
              autoprefixer({
                browsers: [
                  '>1%',
                  'last 4 versions',
                  'Firefox ESR',
                  'not ie < 9', // React doesn't support IE8 anyway
                ],
                flexbox: 'no-2009',
              }),
            ],
          },
        },
      ],
    },
  ],
  plugins: [
    // Makes some environment variables available in index.html.
    // The public URL is available as %PUBLIC_URL% in index.html, e.g.:
    // <link rel="shortcut icon" href="%PUBLIC_URL%/favicon.ico">
    // In development, this will be an empty string.
    new InterpolateHtmlPlugin(env.raw),
    // Generates an `index.html` file with the <script> injected.
    new HtmlWebpackPlugin({
      inject: true,
      templateContent: templateContent(),
      alwaysWriteToDisk: true,
    }),
    // 在另一个进程中检查Typescript类型
    new ForkTsCheckerWebpackPlugin({
      // 禁止tslint检查
      tslint: false,
    }),
    // Makes some environment variables available to the JS code, for example:
    // if (process.env.NODE_ENV === 'development') { ... }. See `./env.js`.
    new webpack.DefinePlugin(env.stringified),
    // This is necessary to emit hot updates (currently CSS only):
    new webpack.HotModuleReplacementPlugin(),
    // Watcher doesn't work well if you mistype casing in a path so we use
    // a plugin that prints an error when you attempt to do this.
    // See https://github.com/facebookincubator/create-react-app/issues/240
    new CaseSensitivePathsPlugin(),
    // If you require a missing module and then `npm install` it, you still have
    // to restart the development server for Webpack to discover it. This plugin
    // makes the discovery automatic so you don't have to restart.
    // See https://github.com/facebookincubator/create-react-app/issues/186
    new WatchMissingNodeModulesPlugin(paths.appNodeModules),
    // Moment.js is an extremely popular library that bundles large locale files
    // by default due to how Webpack interprets its code. This is a practical
    // solution that requires the user to opt into importing specific locales.
    // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
    // You can remove this if you don't use Moment.js:
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
  ].concat(dependenciesHandle()),
  // Turn off performance hints during development because we don't do any
  // splitting or minification in interest of speed. These warnings become
  // cumbersome.
  performance: {
    hints: false,
  },
})
