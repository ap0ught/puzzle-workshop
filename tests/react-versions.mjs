import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const manifest=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const lock=JSON.parse(readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
const react=manifest.dependencies.react;

assert.match(react,/^\d+\.\d+\.\d+$/,'React runtime packages must use exact version pins');
assert.equal(manifest.dependencies['react-dom'],react,'react and react-dom must match exactly to avoid React error #527');

for(const name of ['react','react-dom']){
  assert.equal(lock.packages[''].dependencies[name],react,`${name} lockfile declaration must match package.json`);
  assert.equal(lock.packages[`node_modules/${name}`].version,react,`${name} locked version must match package.json`);
}

// DefinitelyTyped packages release independently: their patches/minors need not
// match React or each other, but their major must match the runtime.
for(const name of ['@types/react','@types/react-dom']){
  const version=manifest.devDependencies?.[name]??manifest.dependencies[name];
  if(version===undefined)continue;
  assert.match(version,/^\d+\.\d+\.\d+$/,`${name} must use an exact version pin`);
  assert.equal(version.split('.')[0],react.split('.')[0],`${name} major must match React`);
}

console.log('PASS: React runtime pins and lockfile match; React type majors are compatible');
