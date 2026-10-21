// Starts only the supplied package with an isolated temporary data directory.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const exe=path.resolve(process.argv[2]||'');
const folder=process.argv[3];
if(!fs.existsSync(exe)||!['win','mac'].includes(folder))throw Error('Supply a packaged executable and win/mac');
const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'shixu-package-smoke-'));
const env={...process.env,SHIXU_DATA_DIR:dataDir};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(exe,[],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
let exited=false,exitCode=null,output='';
child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>output+=chunk);
child.on('exit',code=>{exited=true;exitCode=code;});child.on('error',err=>{exited=true;output+=err.message;});
const start=Date.now();
const timer=setInterval(()=>{
  const dataFile=path.join(dataDir,'shixu-data.json');
  if(exited||Date.now()-start>20000){
    clearInterval(timer);child.kill();console.error('Packaged startup failed:',exitCode,output);process.exitCode=1;return;
  }
  if(Date.now()-start<5000||!fs.existsSync(dataFile))return;
  try {
    const data=JSON.parse(fs.readFileSync(dataFile,'utf8'));
    if(data.version!==4||data.projects.length!==6||data.tasks.length!==18||data.experiments.length!==6)throw Error('Unexpected first-run data');
    const report={started:true,aliveForMs:Date.now()-start,version:require('../package.json').version,platform:process.platform,arch:process.arch,projects:data.projects.length,tasks:data.tasks.length,experiments:data.experiments.length,checkedAt:new Date().toISOString(),limits:'Checks process survival and isolated first-run persistence; does not establish visual layout or native notifications.'};
    fs.mkdirSync(path.join(root,folder),{recursive:true});fs.writeFileSync(path.join(root,folder,'startup-smoke.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));clearInterval(timer);child.kill();
  } catch(err){console.error(err.message);clearInterval(timer);child.kill();process.exitCode=1;}
},250);
