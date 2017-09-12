/**
 * 生成dll包, 避免生成环境重复打包第三方库
 * 在package.json的dllPlugin字段中设置和排除需要被打包进dll的依赖.
 * 如:
 * "dllPlugin": {
 *    "exclude": [         // -> 排除
 *      "/^@types/",       // -> 支持正则表达式
 *      "chalk",
 *     ],
 *   "include": []
 *  }
 */
const webpack = require('webpack')
const path = require('path')
const pkg = require(path.join(process.cwd(), 'package.json'))
const uniq = require('lodash/uniq')
const pullAllWith = require('lodash/pullAllWith')
const getClientEnvironment = require('./env')
const webpackBaseConfig = require('./webpack.config.base')

const env = getClientEnvironment('')
const { DLL_NAME, DLL_PATH } = env.raw

const JSONREGXP = /^\/(.*)\/$/
function isJsonRegexp(str) {
  return str.match(JSONREGXP)
}

function generateEntry(pkg) {
  const dependenciesNames = Object.keys(pkg.dependencies)
  const exclude = pkg.dllPlugin.exclude || []
  const include = pkg.dllPlugin.include || []
  const includeDependencies = uniq(dependenciesNames.concat(include))
  return {
    [DLL_NAME]: pullAllWith(includeDependencies, exclude, (i, e) => {
      const reg = isJsonRegexp(e)
      if (!!reg) {
        return i.match(new RegExp(reg[1]))
      }
      return i === e
    }),
  }
}

module.exports = exports = webpackBaseConfig({
  entry: generateEntry(pkg),
  context: process.cwd(),
  devtool: 'eval',
  output: {
    filename: '[name].dll.js',
    path: DLL_PATH,
    library: '[name]',
  },
  plugins: [
    new webpack.DllPlugin({
      name: '[name]',
      path: path.join(DLL_PATH, '[name].json'),
    }),
    new webpack.DefinePlugin(env.stringified),
  ],
  performance: {
    hints: false,
  },
})