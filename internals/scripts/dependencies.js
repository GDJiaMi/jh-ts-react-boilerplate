const shelljs = require('shelljs')
const path = require('path')
const fs = require('fs')
const paths = require('../webpack/paths')
const pkg = require(paths.appPackageJson)
const values = require('lodash/values')
const webpackDllConfig = require('../webpack/webpack.config.dll')
const chalk = require('chalk')

const outputPath = webpackDllConfig.output.path
if (process.env.NODE_ENV === 'production') {
  process.exit(0)
}

// 检查是否已经是最新
const packages = JSON.stringify(pkg.dependencies)
const dllfile = path.join(
  outputPath,
  `${Object.keys(webpackDllConfig.entry)[0]}.dll.js`,
)
const metaFile = path.join(outputPath, 'dll.meta')
if (fs.existsSync(dllfile) && fs.existsSync(metaFile)) {
  const data = fs.readFileSync(metaFile, 'utf8')
  if (data === packages) {
    console.log(chalk.green('Dll 已经是最新，无需重新编译'))
    process.exit(0)
  }
}

shelljs.mkdir('-p', outputPath)
shelljs.rm('-rf', path.join(outputPath, '*'))
console.log(`${chalk.green('DllPlugin')}: 正在打包Dll文件....`)
console.log(
  `${chalk.green('DllPlugin')}: 下列依赖将被打包进Dll文件中:\n ${chalk.cyan(
    values(webpackDllConfig.entry)[0]
      .map(mod => `${mod}: ${pkg.dependencies[mod]}`)
      .join('\n'),
  )}`,
)

shelljs.exec(
  'cross-env BUILDING_DLL=true webpack --display-chunks --color --config internals/webpack/webpack.config.dll.js',
)
fs.writeFileSync(metaFile, packages)
