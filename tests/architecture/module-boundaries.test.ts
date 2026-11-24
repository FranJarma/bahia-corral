import {readdirSync,readFileSync} from 'node:fs';
import {join,relative,sep} from 'node:path';
import {describe,expect,it} from 'vitest';

function discover(dir:string):string[]{
 return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?discover(join(dir,e.name)):/\.(ts|tsx)$/.test(e.name)?[join(dir,e.name)]:[]);
}

describe('fronteras de los módulos',()=>{
 it('ningún módulo accede a data o integrations privados de otro módulo',()=>{
  const violations:string[]=[];
  for(const file of discover('src/modules')){
   const owner=relative('src/modules',file).split(sep)[0];
   const text=readFileSync(file,'utf8');
   for(const match of text.matchAll(/from\s+['"]@\/modules\/([^/]+)\/(data|integrations)\//g)){
    if(match[1]!==owner)violations.push(`${file}: import privado de ${match[1]}/${match[2]}`);
   }
  }
  expect(violations).toEqual([]);
 });
});
