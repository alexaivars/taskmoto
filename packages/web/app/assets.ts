import { createAssetServer } from 'remix/assets';
import { fileURLToPath } from 'node:url';
export const assets = createAssetServer({
  basePath: '/assets',
  rootDir: fileURLToPath(new URL('../', import.meta.url)),
  mounts: { app: 'app', npm: '../../node_modules' },
  allowFiles: ['app/routes.ts', 'app/**/public/**'],
  allowPackages: ['remix', '@simplewebauthn/browser'],
  denyFiles: ['app/**/*.test.*'],
  watch: process.env.NODE_ENV === 'development',
  minify: process.env.NODE_ENV === 'production',
});
export const scriptEntry = await assets.getScriptEntry(
  'app/actions/public/entry.ts',
);
