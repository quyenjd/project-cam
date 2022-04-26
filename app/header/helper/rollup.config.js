import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import { main, module } from './package.json';

export default {
  input: 'dist/src/index.js',
  plugins: [
    resolve({ browser: true }),
    commonjs({ transformMixedEsModules: true }),
    process.env.NODE_ENV === 'production' && terser()
  ],
  output: [
    {
      file: main,
      name: 'Helper',
      format: 'umd',
      sourcemap: true
    },
    {
      file: module,
      format: 'es',
      sourcemap: true
    }
  ]
};
