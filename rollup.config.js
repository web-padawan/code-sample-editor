import resolve from 'rollup-plugin-node-resolve';
import postcss from 'rollup-plugin-postcss'
import sw from './rollup-sw.config.js'

export default [{
  input: 'monaco/monaco.js',
  output: {
    dir: 'monaco_build',
    format: 'esm'
  },
  plugins: [
    resolve({
      jsnext: true,
      main: true
    }),

    postcss({
      inject: false,
      extract: true,
    })
  ]
},
{
  input: 'node_modules/monaco-editor/esm/vs/editor/editor.worker.js',
  output: {
    file: 'monaco_build/editor.worker.js',
    name: 'editorWorker',
    format: 'iife',
    globals: ['self']
  },
  plugins: [
    resolve({
      jsnext: true,
      main: true
    })
  ]
},
{
  input: 'node_modules/monaco-editor/esm/vs/language/json/json.worker.js',
  output: {
    file: 'monaco_build/json.worker.js',
    name: 'jsonWorker',
    format: 'iife',
    globals: ['self']
  },
  plugins: [
    resolve({
      jsnext: true,
      main: true
    })
  ]
},
{
  input: 'node_modules/monaco-editor/esm/vs/language/css/css.worker.js',
  output: {
    file: 'monaco_build/css.worker.js',
    name: 'cssWorker',
    format: 'iife',
    globals: ['self']
  },
  plugins: [
    resolve({
      jsnext: true,
      main: true
    })
  ]
},
{
  input: 'node_modules/monaco-editor/esm/vs/language/html/html.worker.js',
  output: {
    file: 'monaco_build/html.worker.js',
    name: 'htmlWorker',
    format: 'iife',
    globals: ['self']
  },
  plugins: [
    resolve({
      jsnext: true,
      main: true
    })
  ]
},
{
  input: 'node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js',
  output: {
    file: 'monaco_build/ts.worker.js',
    name: 'tsWorker',
    format: 'iife',
    globals: ['self']
  },
  plugins: [
    resolve({
      jsnext: true,
      main: true
    })
  ]
},
sw
];
