const {app,BrowserWindow,screen,nativeImage}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn,execFileSync}=require('node:child_process');
const [exeArg,label]=process.argv.slice(2),out=path.resolve('diagnostics');fs.mkdirSync(out,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'shixu-no-debug-profile-'));
app.setName('Shixu screen-only diagnostic');app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'shixu-screen-controller-')));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const report={label,stages:[],debuggerConnected:false,scope:'Normally launched signed application with production preload/IPC; screen-only capture, no remote debugging connection. A temporary capture hook synchronizes renderer operations in this disposable CI copy.'};
let back,child,closed=false;
const timer=setTimeout(()=>{report.error='Screen-only check timed out';finish(1);},40000);
function shot(name,b){
 const file=path.join(out,label+'-'+name+'.png');
 execFileSync('/usr/sbin/screencapture',['-x','-R'+[b.x,b.y,b.width,b.height].join(','),file],{timeout:8000,stdio:'pipe'});
 const image=nativeImage.createFromPath(file).resize({width:56,height:56}),data=image.toBitmap();
 const rgb=(x,y)=>{const i=(y*56+x)*4;return [data[i+2],data[i+1],data[i]];};
 return {file:path.basename(file),outside:[[44,12],[44,44],[12,44],[40,30]].map(([x,y])=>rgb(x,y)),center:rgb(20,20)};
}
async function finish(code){
 clearTimeout(timer);
 if(child&&!closed){child.kill();await Promise.race([new Promise(r=>child.once('exit',r)),pause(2000)]);if(!closed)child.kill('SIGKILL');}
 if(back&&!back.isDestroyed())back.destroy();
 fs.writeFileSync(path.join(out,label+'.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));app.exit(code);
}
app.whenReady().then(async()=>{
 try{
  report.os=execFileSync('/usr/bin/sw_vers',[],{encoding:'utf8'}).trim();
  try{report.reduceTransparency=execFileSync('/usr/bin/defaults',['read','com.apple.universalaccess','reduceTransparency'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{}
  const wa=screen.getPrimaryDisplay().workArea,ball={x:wa.x+wa.width-100,y:wa.y+150,width:56,height:56};
  fs.writeFileSync(path.join(profile,'shixu-settings.json'),JSON.stringify({locale:'en',dockDisplayMode:'edge',dockBallPosition:{x:ball.x,y:ball.y}}));
  back=new BrowserWindow({x:wa.x+30,y:wa.y+30,width:wa.width-60,height:wa.height-60,frame:false,backgroundColor:'#214F73',show:false,webPreferences:{sandbox:true}});
  await back.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<!doctype html><style>html,body{margin:0;width:100%;height:100%;background:#214F73}</style>'));
  back.showInactive();await pause(500);report.baseline=shot('backdrop',ball);
  const env={...process.env,SHIXU_DATA_DIR:profile,SHIXU_PROBE_CAPTURE_HANDLER:path.join(__dirname,'mac-onscreen-capture-hook.cjs')};delete env.ELECTRON_RUN_AS_NODE;
  let output='';child=spawn(path.resolve(exeArg),[],{env,stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);child.on('exit',()=>closed=true);
  let done=false;
  const observed=new Set();
  for(let n=0;n<500;n++){
   if(closed)throw Error('Application exited: '+output.slice(-1500));
   try{
    const phase=JSON.parse(fs.readFileSync(path.join(profile,'capture-phase.json'),'utf8'));
    if(!observed.has(phase.phase)){
     const image=shot(phase.phase,phase.bounds),delta=(a,b)=>Math.max(...a.map((x,i)=>Math.abs(x-b[i])));
     report.stages.push({...phase,...image,whiteSamples:image.outside.filter(rgb=>rgb.every(v=>v>=235)).length,ballDetected:delta(image.center,report.baseline.center)>45,backdropVisible:image.outside.every((rgb,i)=>delta(rgb,report.baseline.outside[i])<18)});
     observed.add(phase.phase);fs.writeFileSync(path.join(profile,'capture-ack.json'),JSON.stringify({phase:phase.phase}));
    }
   }catch(error){if(error.message.includes('screencapture'))throw error;}
   if(fs.existsSync(path.join(profile,'capture-done.json'))){const result=JSON.parse(fs.readFileSync(path.join(profile,'capture-done.json'),'utf8'));if(result.error)throw Error(result.error);report.renderer=result.renderer;done=true;break;}
   await pause(50);
  }
  if(!done)throw Error('No synchronized screen-capture result: '+output.slice(-2000));
  report.valid=report.stages.length===2&&report.stages.every(s=>s.ballDetected);
  report.transparent=report.valid&&report.stages.every(s=>s.backdropVisible);
  await finish(0);
 }catch(error){report.error=error.stack;await finish(1);}
});
