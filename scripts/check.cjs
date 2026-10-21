const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
for(const dir of ['electron','renderer','scripts','tests']) {
  for(const name of fs.readdirSync(path.join(root,dir))){
    if(!/\.(js|cjs|html)$/.test(name))continue;
    const filename=path.join(root,dir,name),source=fs.readFileSync(filename,'utf8');
    if(name.endsWith('.html')){
      for(const match of source.matchAll(/<script\b([^>]*)>([^]*?)<\/script>/g)){
        if(/\bsrc=/.test(match[1]))continue;
        new vm.Script(match[2],{filename});
      }
      for(const match of source.matchAll(/(?:src|href)="([^"#]+\.(?:js|css))"/g)) {
        if(!fs.existsSync(path.join(root,dir,match[1])))throw new Error('Missing dependency '+match[1]);
      }
    }else new vm.Script(source,{filename});
  }
}
console.log('All JavaScript and HTML scripts parse; linked scripts and styles exist.');
