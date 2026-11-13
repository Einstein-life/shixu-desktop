// Run on a clean macOS CI host with Electron. Uses actual screen captures, no DevTools connection.
const {app,BrowserWindow,screen,nativeImage}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {spawn,execFileSync}=require('node:child_process');
const asar=require('@electron/asar');
const [appArg,reportArg]=process.argv.slice(2);
if(process.platform!=='darwin'||!appArg||!reportArg)throw Error('Use native Electron smoke-dock-compositor.cjs APP_DIRECTORY REPORT on macOS CI');
const original=path.resolve(appArg),reportFile=path.resolve(reportArg),out=path.dirname(reportFile);
if(!fs.existsSync(path.join(original,'Contents/Resources/app.asar')))throw Error('Packaged Mac app missing');
fs.mkdirSync(out,{recursive:true});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'shixu-compositor-'));
app.setName('Shixu compositor verification');app.setPath('userData',path.join(temp,'controller-profile'));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const report={platform:process.platform,arch:process.arch,electron:process.versions.electron,languages:[],checkedAt:new Date().toISOString(),
 scope:'Visible signed app launched normally on a macOS CI desktop over a synthetic backdrop, without DevTools or a remote debugger. A disposable app copy contains a capture synchronization hook; the distributed app is not modified.'};
let child,closed=false,back,finishing=false;
const watchdog=setTimeout(()=>{report.error='Desktop compositor verification timed out';void finish(1);},65000);
async function stopChild(){
 if(child&&!closed){child.kill();await Promise.race([new Promise(resolve=>child.once('exit',resolve)),pause(2500)]);if(!closed)child.kill('SIGKILL');}
 child=null;
}
async function finish(code){
 if(finishing)return;finishing=true;clearTimeout(watchdog);await stopChild();
 if(back&&!back.isDestroyed())back.destroy();
 fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));app.exit(code);
}
function screenshot(label,bounds){
 const filename=path.basename(reportFile,'.json')+'-'+label+'.png',file=path.join(out,filename);
 execFileSync('/usr/sbin/screencapture',['-x','-R'+[bounds.x,bounds.y,bounds.width,bounds.height].join(','),file],{timeout:8000,stdio:'pipe'});
 const image=nativeImage.createFromPath(file).resize({width:56,height:56}),data=image.toBitmap();
 if(data.length!==56*56*4)throw Error('Invalid desktop screenshot dimensions');
 const rgb=(x,y)=>{const i=(y*56+x)*4;return [data[i+2],data[i+1],data[i]];};
 return {filename,outside:[[44,12],[44,44],[12,44],[40,30]].map(([x,y])=>rgb(x,y)),center:rgb(20,20)};
}
const delta=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
app.whenReady().then(async()=>{
 try{
  report.os=execFileSync('/usr/bin/sw_vers',[],{encoding:'utf8'}).trim();
  const copy=path.join(temp,'Shixu Desktop.app');fs.cpSync(original,copy,{recursive:true});
  const archive=path.join(copy,'Contents/Resources/app.asar'),folder=path.join(temp,'source');asar.extractAll(archive,folder);
  const main=path.join(folder,'electron/main.js'),source=fs.readFileSync(main,'utf8'),anchor="  dockWindow.loadFile(pagePath('dock'));";
  if(source.split(anchor).length!==2)throw Error('Floating window startup anchor is not unique');
  const injection="  {const captureTarget=dockWindow;captureTarget.webContents.once('did-finish-load',()=>require(process.env.SHIXU_COMPOSITOR_HOOK)({window:captureTarget}));}\n";
  fs.writeFileSync(main,source.replace(anchor,injection+anchor));await asar.createPackage(folder,archive);
  const hash=crypto.createHash('sha256').update(asar.getRawHeader(archive).headerString).digest('hex');
  execFileSync('/usr/libexec/PlistBuddy',['-c','Set :ElectronAsarIntegrity:Resources/app.asar:hash '+hash,path.join(copy,'Contents/Info.plist')]);
  execFileSync('/usr/bin/codesign',['--force','--deep','--sign','-','--timestamp=none',copy],{stdio:'pipe',timeout:30000});
  const wa=screen.getPrimaryDisplay().workArea,ball={x:wa.x+wa.width-100,y:wa.y+150,width:56,height:56};
  back=new BrowserWindow({x:wa.x+30,y:wa.y+30,width:wa.width-60,height:wa.height-60,frame:false,backgroundColor:'#214F73',show:false,webPreferences:{sandbox:true}});
  await back.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<!doctype html><style>html,body{margin:0;width:100%;height:100%;background:#214F73}</style>'));
  back.showInactive();await pause(500);
  report.baseline=screenshot('backdrop',ball);
  if(report.baseline.center[0]>100||report.baseline.center[2]<65)throw Error('Synthetic background is not visible');
  for(const lang of ['en','zh-CN']){
   const profile=path.join(temp,'profile-'+lang);fs.mkdirSync(profile,{recursive:true});
   fs.writeFileSync(path.join(profile,'shixu-settings.json'),JSON.stringify({locale:lang,dockDisplayMode:'edge',dockBallPosition:{x:ball.x,y:ball.y}}));
   const env={...process.env,SHIXU_DATA_DIR:profile,SHIXU_COMPOSITOR_HOOK:path.join(__dirname,'mac-compositor-capture-hook.cjs')};delete env.ELECTRON_RUN_AS_NODE;
   let output='';closed=false;child=spawn(path.join(copy,'Contents/MacOS/Shixu Desktop'),[],{env,stdio:['ignore','pipe','pipe']});
   child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);child.on('exit',()=>closed=true);
   const phases=[],seen=new Set();let done;
   for(let n=0;n<430;n++){
    if(closed)throw Error('Application exited: '+output.slice(-1000));
    let state;try{state=JSON.parse(fs.readFileSync(path.join(profile,'capture-phase.json'),'utf8'));}catch{}
    if(state&&!seen.has(state.phase)){
     if(state.bounds.width!==56||state.bounds.height!==56)throw Error('Window did not return to ball size');
     const image=screenshot(lang+'-'+state.phase,state.bounds),differences=image.outside.map((v,i)=>delta(v,report.baseline.outside[i]));
     phases.push({...state,...image,outsideDifferences:differences,backdropVisible:differences.every(v=>v<18),ballDetected:delta(image.center,report.baseline.center)>45,whiteSamples:image.outside.filter(v=>v.every(c=>c>=235)).length});
     seen.add(state.phase);fs.writeFileSync(path.join(profile,'capture-ack.json'),JSON.stringify({phase:state.phase}));
    }
    try{done=JSON.parse(fs.readFileSync(path.join(profile,'capture-done.json'),'utf8'));}catch{}
    if(done)break;await pause(50);
   }
   if(!done||done.error)throw Error(done?.error||'No synchronized screenshot result: '+output.slice(-1400));
   const result={lang,phases,renderer:done.renderer,passed:phases.length===2&&phases.every(p=>p.backdropVisible&&p.ballDetected&&p.whiteSamples===0)};
   report.languages.push(result);await stopChild();await pause(150);
   if(!result.passed)throw Error('Desktop white backing reproduced for '+lang);
  }
  report.passed=true;await finish(0);
 }catch(error){report.passed=false;report.error=error.stack;await finish(1);}
});
