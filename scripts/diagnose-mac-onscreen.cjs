// Visible synthetic windows on a dedicated macOS runner. No installed workspace is loaded.
const {app,BrowserWindow,screen,nativeImage,nativeTheme,systemPreferences}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const which=process.env.SHIXU_PROBE_CONFIG||'current';
if(process.platform!=='darwin')throw Error('Run this diagnostic on a dedicated macOS test host');
const out=path.resolve(process.env.SHIXU_PROBE_OUT||'diagnostics');fs.mkdirSync(out,{recursive:true});
app.setName('Shixu synthetic window diagnostics');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'shixu-onscreen-')));
if(process.env.SHIXU_PROBE_NO_GPU==='1')app.disableHardwareAcceleration();
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const root=path.resolve(__dirname,'..');
let front,back;
const report={config:which,noGPU:process.env.SHIXU_PROBE_NO_GPU==='1',electron:process.versions.electron,host:os.release(),stages:[],scope:'Actual screen capture of a visible floating window over a synthetic blue backdrop. No user data, existing application or wallpaper is read.'};
const watchdog=setTimeout(()=>{report.error='Diagnostic timed out';finish(1);},50000);
function finish(code){
 clearTimeout(watchdog);
 for(const w of [front,back])if(w&&!w.isDestroyed())w.destroy();
 fs.writeFileSync(path.join(out,which+'.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));app.exit(code);
}
function capture(label,bounds){
 const file=path.join(out,which+'-'+label+'.png');
 execFileSync('/usr/sbin/screencapture',['-x','-R'+[bounds.x,bounds.y,bounds.width,bounds.height].join(','),file],{timeout:8000,stdio:'pipe'});
 const image=nativeImage.createFromPath(file).resize({width:56,height:56}),buf=image.toBitmap();
 if(buf.length!==56*56*4)throw Error('Screen-capture dimensions invalid');
 const rgb=(x,y)=>{const i=(y*56+x)*4;return [buf[i+2],buf[i+1],buf[i]];};
 return {file:path.basename(file),outside:[[44,12],[44,44],[12,44],[40,30]].map(([x,y])=>rgb(x,y)),center:rgb(20,20)};
}
function compare(actual,baseline){
 const delta=(a,b)=>Math.max(...a.map((x,i)=>Math.abs(x-b[i])));
 const outsideDifferences=actual.outside.map((rgb,i)=>delta(rgb,baseline.outside[i]));
 const whiteSamples=actual.outside.filter(rgb=>rgb.every(v=>v>=235)).length;
 return {...actual,outsideDifferences,whiteSamples,ballDetected:delta(actual.center,baseline.center)>45,backdropVisibleOutsideBall:outsideDifferences.every(v=>v<18)};
}
app.whenReady().then(async()=>{
 try{
  report.os=execFileSync('/usr/bin/sw_vers',[],{encoding:'utf8'}).trim();
  report.screenPermission=systemPreferences.getMediaAccessStatus('screen');
  const main=fs.readFileSync(path.join(root,'electron/main.js'),'utf8');
  const start=main.indexOf('function createDockWindow()'),end=main.indexOf('function createTray()',start);
  let options;
  class CaptureWindow{constructor(v){options=v;}setAlwaysOnTop(){}setVisibleOnAllWorkspaces(){}loadFile(){}on(){}}
  vm.runInNewContext(main.slice(start,end)+'\ncreateDockWindow();',{dockExpanded:false,dockBallDrag:null,dockWindow:null,screen,BrowserWindow:CaptureWindow,
   tr:(_zh,en)=>en,iconPath:()=>path.join(root,'assets/icon.png'),path,__dirname:path.join(root,'electron'),pagePath:()=>'',
   process:{platform:'darwin'},validDockBallPosition:()=>false,loadSettings:()=>({}),setInterval:()=>1,clearInterval:()=>{}});
  const variants={current:{},borderless:{roundedCorners:false},panel:{type:'panel',roundedCorners:false},skiptransform:{},refreshclear:{},textured:{type:'textured'}};
  if(!Object.hasOwn(variants,which))throw Error('Unknown configuration');
  const wa=screen.getPrimaryDisplay().workArea;
  const bounds={x:wa.x+180,y:wa.y+160,width:56,height:56};
  back=new BrowserWindow({x:wa.x+60,y:wa.y+70,width:650,height:Math.min(760,wa.height-80),frame:false,backgroundColor:'#214F73',show:false,webPreferences:{sandbox:true}});
  await back.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<!doctype html><style>html,body{margin:0;width:100%;height:100%;background:#214F73}</style>'));
  back.show();await pause(600);
  report.baseline=capture('backdrop',bounds);
  report.syntheticBackdropVisible=report.baseline.center[2]>65&&report.baseline.center[0]<100;
  const {preload,...webPreferences}=options.webPreferences;
  front=new BrowserWindow({...options,...variants[which],...bounds,show:false,webPreferences:{...webPreferences,backgroundThrottling:false}});
  await front.loadFile(path.join(root,'renderer/dock.en.html'),{query:{lang:'en'}});
  await front.webContents.executeJavaScript('pointerOverDock=()=>false;displayMode="edge";hideToEdge();');
  front.showInactive();await pause(600);
  report.stages.push({name:'initial-show',...compare(capture('initial',bounds),report.baseline)});
  front.setAlwaysOnTop(true,'screen-saver');
  front.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true,...(which==='skiptransform'?{skipTransformProcessType:true}:{})});
  if(which==='refreshclear')front.setBackgroundColor('#00000000');
  await pause(600);
  report.stages.push({name:'production-workspace-and-level',...compare(capture('workspace',bounds),report.baseline)});
  for(let n=0;n<6;n++){
   front.setBounds({...bounds,width:420,height:Math.min(660,wa.height-100)});
   await front.webContents.executeJavaScript('setExpanded(true);');
   await pause(50);
   await front.webContents.executeJavaScript('setExpanded(false);hideToEdge();');
   front.setBounds(bounds);await pause(50);
  }
  if(which==='refreshclear')front.setBackgroundColor('#00000000');
  await pause(500);
  report.stages.push({name:'after-six-native-resizes',...compare(capture('resized',bounds),report.baseline)});
  report.renderer=await front.webContents.executeJavaScript('({shell:document.getElementById("shell").className,colors:["html","body","#shell","#ballWrap"].map(s=>getComputedStyle(document.querySelector(s)).backgroundColor),dpr:devicePixelRatio})');
  report.window={bounds:front.getBounds(),background:front.getBackgroundColor(),resizable:front.isResizable(),shadow:front.hasShadow(),nativeTheme:nativeTheme.shouldUseDarkColors};
  report.valid=report.syntheticBackdropVisible&&report.stages.every(s=>s.ballDetected);
  report.allStagesTransparent=report.valid&&report.stages.every(s=>s.backdropVisibleOutsideBall);
  finish(0);
 }catch(error){report.error=error.stack;finish(1);}
});
