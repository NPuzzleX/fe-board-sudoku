const path = require('path')
const { merge } = require('webpack-merge')
const parts = require('./webpack.parts')
const { mode, analyze } = require('webpack-nano/argv')

const common = merge([
  { output: { path: path.resolve(process.cwd(), 'dist-play') } },
  parts.page({ title: 'Test' }),
  parts.loadSvg(),
  parts.loadAssets(),
  parts.svelte(mode),
  parts.extractCSS({ loaders: [parts.postcss()] }),
  parts.cleanDist(),
  parts.useWebpackBar(),
  parts.useDotenv(),
  parts.useModuleFederation(mode)
])

const development = merge([
  { entry: ['./src/play/index.ts', 'webpack-plugin-serve/client'] },
  { target: 'web' },
  parts.generateSourceMaps({ type: 'eval-source-map' }),
  parts.esbuild(),
  parts.devServer()
])

const production = merge([
    { entry: ['./src/play/index.ts'] },
    { target: 'web' },
    parts.typescript(),
    analyze && parts.analyze()
  ].filter(Boolean)
)

const getConfig = mode => {
  switch (mode) {
    case 'production':
      return merge(common, production, { mode })
    case 'development':
      return merge(common, development, { mode })
    default:
      throw new Error(`Unknown mode, ${mode}`)
  }
}

module.exports = getConfig(mode)
