const path = require('path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin')
const ReactRefreshTypeScript = require('react-refresh-typescript')

function isDevMode(argv) {
  return process.env.NODE_ENV === 'development' || argv.mode === 'development'
}

module.exports = function (argv) {
  return {
    entry: './src/index.tsx',
    output: {
      filename: 'main.js',
      path: path.resolve(__dirname, 'dist')
    },
    devServer: {
      static: {
        directory: path.join(__dirname, 'public')
      },
      compress: true,
      port: 9000
    },
    module: {
      rules: [
        {
          test: /\.(png|jpg|jpeg|svg)$/i,
          type: 'asset/resource'
        },
        {
          test: /\.s?css$/,
          include: [/\.global\./, /node_modules/],
          use: [
            { loader: 'style-loader' }, // to inject the result into the DOM as a style block
            { loader: 'css-loader' } // to convert the resulting CSS to Javascript to be bundled (modules:true to rename CSS classes in output to cryptic identifiers, except if wrapped in a :global(...) pseudo class)
          ]
        },
        {
          test: /\.s?css$/,
          exclude: [/\.global\./, /node_modules/],
          use: [
            { loader: 'style-loader' }, // to inject the result into the DOM as a style block
            {
              loader: 'css-loader',
              options: {
                importLoaders: 3,
                sourceMap: false,
                modules: {
                  localIdentName: isDevMode(argv)
                    ? '[path][name]__[local]--[hash:base64:5]'
                    : '[hash:base64]'
                }
              }
            }, // to convert the resulting CSS to Javascript to be bundled (modules:true to rename CSS classes in output to cryptic identifiers, except if wrapped in a :global(...) pseudo class)
            { loader: 'sass-loader' } // to convert SASS to CSS
            // NOTE: The first build after adding/removing/renaming CSS classes fails, since the newly generated .d.ts typescript module is picked up only later
          ]
        },
        {
          test: /\.svelte$/,
          use: {
            loader: 'svelte-loader',
            options: {
              compilerOptions: {
                customElement: true
              },
              onwarn: (warning, handler) => {
                const { code, frame } = warning
                // Ignore unused CSS selectors,
                // since we have CSS selectors that assume
                // no shadow DOM (for storybook which does not
                // use the web-components version of the components, and
                // uses the svelte components directly).
                if (code === 'css-unused-selector') return
                handler(warning)
              },
              preprocess: require('svelte-preprocess')()
              // typescript({ sourceMap: true }),
              // css: css => { css.write('svelte.css') },
              // emitCss: true,
            }
          }
        },
        {
          // required to prevent errors from Svelte on Webpack 5+, omit on Webpack 4
          test: /node_modules\/svelte\/.*\.mjs$/,
          resolve: {
            fullySpecified: false
          }
        },
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: require.resolve('ts-loader'),
              options: {
                getCustomTransformers: () => ({
                  before: [isDevMode(argv) && ReactRefreshTypeScript()].filter(
                    Boolean
                  )
                }),
                transpileOnly: isDevMode(argv)
              }
            }
          ],
          exclude: /node_modules/
        }
      ]
    },
    plugins: [
      new MiniCssExtractPlugin(),
      isDevMode(argv) && new ReactRefreshWebpackPlugin()
    ].filter(Boolean),
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.svelte', '.css', '.scss'],
      mainFields: ['svelte', 'browser', 'module', 'main'],
      alias: {
        svelte: path.resolve('node_modules', 'svelte'),
        react: path.resolve('node_modules', 'react'),
        ['react-dom']: path.resolve('node_modules', 'react-dom'),
        ['react-router']: path.resolve('node_modules', 'react-router')
      }
    }
  }
}
