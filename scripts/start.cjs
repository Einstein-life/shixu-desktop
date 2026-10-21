const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
let binary;
if(process.env.SHIXU_ELECTRON_PATH)binary=process.env.SHIXU_ELECTRON_PATH.trim();
else {
  try {
    const moduleRoot=path.dirname(require.resolve('electron/package.json',{paths:[root]}));
    binary=path.join(moduleRoot,'dist',fs.readFileSync(path.join(moduleRoot,'path.txt'),'utf8').trim());
  }catch(error){console.error('Electron is not installed. Run npm ci in the v2.0 folder.');process.exit(1);}
}
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(binary,[root,...process.argv.slice(2)],{stdio:'inherit',env,windowsHide:true});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('close',code=>{process.exitCode=code??1;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
