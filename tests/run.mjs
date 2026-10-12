import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
for(const file of readdirSync('tests').filter(f=>f.endsWith('.mjs')&&f!=='run.mjs')){const result=spawnSync(process.execPath,['--experimental-strip-types','tests/'+file],{stdio:'inherit'});if(result.status!==0)process.exit(result.status??1);}
