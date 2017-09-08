/**
 * Component Generator
 */
'use strict'

const path = require('path')
const fuzzy = require('fuzzy')
const { componentExists } = require('../utils/componentExists.js')
const pascalCase = require('../utils/pascalCase')

const autocompleteTypes = [
  'any',
  'number',
  'boolean',
  'string',
  'null',
  'void',
  'undefined',
]

module.exports = {
  description: '添加一个组件',
  prompts: [
    {
      type: 'list',
      name: 'type',
      message: '选择组件类型: ',
      default: 'stateless',
      choices: [
        {
          name: '无状态组件',
          value: 'stateless',
        },
        {
          name: '纯Styled Components 组件',
          value: 'pure-styled',
        },
        {
          name: 'Styled Components 组件',
          value: 'styled',
        },
        {
          name: 'ES6 Class组件',
          value: 'class',
        },
      ],
    },
    {
      type: 'input',
      name: 'name',
      message: '请输入组件名(PascalCase): ',
      validate: value => {
        if (/.+/.test(value)) {
          value = pascalCase(value)
          return componentExists(value) ? `这个组件已存在(${value})` : true
        }
        return '必须输入组件名'
      },
    },
    {
      type: 'input',
      name: 'description',
      message: data => `请输入组件描述(默认为: ${pascalCase(data.name)}): `,
      default: data => data.name,
      validate: value => {
        if (/.+/.test(value)) {
          return true
        }
        return '必须输入组件描述'
      },
    },
    {
      when(answers) {
        return answers.type == 'pure-styled'
      },
      type: 'input',
      name: 'decorateComponent',
      message: '输入要进行扩展的元素名',
      default: data => data.name.toLowerCase(),
      validate: value => {
        if (/.+/.test(value)) {
          return true
        }
        return '必须输入扩展元素名'
      },
    },
    {
      when(answers) {
        return answers.type !== 'pure-styled'
      },
      type: 'confirm',
      name: 'i18n',
      default: true,
      message: '是否支持i18n?: ',
    },
    {
      when(answers) {
        return answers.type !== 'pure-styled'
      },
      type: 'recursive',
      message: '继续添加props?: ',
      name: 'props',
      prompts: [
        {
          type: 'input',
          name: 'name',
          message: 'Props 命名: ',
          validate: (() => {
            let props = []
            return value => {
              if (/.+/.test(value)) {
                if (props.find(item => item === value)) {
                  return 'props 已存在'
                }
                props.push(value)
                return true
              }
              return '必须输入props名'
            }
          })(),
        },
        {
          type: 'autocomplete',
          name: 'type',
          message: 'Props 类型: ',
          default: 'any',
          suggestOnly: true,
          source: (answers, input) => {
            input = input || ''
            return new Promise(resolve => {
              const fuzzyRes = fuzzy.filter(input, autocompleteTypes)
              resolve(fuzzyRes.map(el => el.original))
            })
          },
          validate: value => {
            if (/.+/.test(value)) {
              return true
            }
            return '必须输入props类型'
          },
        },
        {
          type: 'input',
          name: 'default',
          message: '默认值',
        },
      ],
    },
  ],
  actions: data => {
    let componentTemplate
    const outputPath = path.resolve(
      process.cwd(),
      `src/components/${pascalCase(data.name)}/`
    )
    switch (data.type) {
      case 'stateless':
        componentTemplate = path.resolve(__dirname, './stateless.js.hbs')
        break
      case 'styled':
        componentTemplate = path.resolve(__dirname, './styled.tsx.hbs')
        break
      case 'pure-styled':
        componentTemplate = path.resolve(__dirname, './pure-styled.hbs')
        break
      case 'class':
        componentTemplate = path.resolve(__dirname, './es6.tsx.hbs')
        break
    }

    const actions = [
      {
        type: 'add',
        path: path.join(outputPath, 'index.tsx'),
        templateFile: componentTemplate,
        abortOnFail: true,
      },
    ]

    if (data.i18n) {
      actions.push({
        type: 'add',
        path: path.join(outputPath, 'messages.ts'),
        templateFile: path.resolve(__dirname, './messages.ts.hbs'),
        abortOnFail: true,
      })
    }

    if (data.props) {
      data.defaultProps = data.props.filter(item => item.default !== '')
    }

    return actions
  },
}
