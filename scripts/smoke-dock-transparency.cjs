// Invoke with native Electron, an app.asar path and a report path. No production data is loaded.
const {app,BrowserWindow,screen}=require('electron');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const os=require('node:os'),assert=require('node:assert/strict');
const [archiveArg,reportArg]=process.argv.slice(2);
if(!archiveArg||!reportArg)throw Error('Use Electron smoke-dock-transparency.cjs APP_ASAR REPORT');
const archive=path.resolve(archiveArg),reportFile=path.resolve(reportArg);
app.setName('Shixu window transparency verification');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'shixu-transparency-')));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const report={platform:process.platform,arch:process.arch,electron:process.versions.electron,checks:[],checkedAt:new Date().toISOString(),scope:'Packaged constructor options, native non-resizable-window geometry and renderer alpha. Offscreen captures do not establish the final onscreen compositor appearance.'};
let win;
const timeout=setTimeout(()=>{report.passed=false;report.error='Native transparency check timed out';finish(1);},25000);
function finish(code){
 clearTimeout(timeout);
 if(win&&!win.isDestroyed())win.destroy();
 fs.mkdirSync(path.dirname(reportFile),{recursive:true});
 fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));app.exit(code);
}
app.whenReady().then(async()=>{
 try{
  const source=fs.readFileSync(path.join(archive,'electron/main.js'),'utf8');
  const start=source.indexOf('function createDockWindow()'),end=source.indexOf('function createTray()',start);
  if(start<0||end<0)throw Error('Cannot inspect packaged floating-window constructor');
  let options;
  class CaptureWindow{
   constructor(value){options=value;}
   setAlwaysOnTop(){}setVisibleOnAllWorkspaces(){}loadFile(){}on(){}
  }
  vm.runInNewContext(source.slice(start,end)+'\ncreateDockWindow();',{
   dockExpanded:false,dockBallDrag:null,dockWindow:null,screen,
   BrowserWindow:CaptureWindow,tr:(_zh,en)=>en,iconPath:()=>path.join(archive,'assets/icon.png'),
   path,__dirname:path.join(archive,'electron'),pagePath:()=>'',process:{platform:process.platform},
   validDockBallPosition:()=>false,loadSettings:()=>({}),setInterval:()=>1,clearInterval:()=>{}
  });
  assert.equal(options.frame,false);assert.equal(options.transparent,true);
  assert.equal(options.backgroundColor,'#00000000');assert.equal(options.hasShadow,false);
  if(process.platform==='darwin')assert.equal(options.resizable,false);
  report.checks.push('Packaged floating window has a transparent native background and no native shadow');
  const wa=screen.getPrimaryDisplay().workArea;
  const {preload,...webPreferences}=options.webPreferences;
  win=new BrowserWindow({...options,x:wa.x+80,y:wa.y+80,show:false,webPreferences:{...webPreferences,offscreen:true,backgroundThrottling:false}});
  assert.equal(win.hasShadow(),false);
  if(process.platform==='darwin')assert.equal(win.isResizable(),false);
  assert.match(win.getBackgroundColor(),/^#0{6,8}$/i);
  report.nativeBackgroundColor=win.getBackgroundColor();
  report.nativeResizable=win.isResizable();
  report.geometry=[];report.languages=[];
  for(const lang of ['en','zh-CN']){
   await win.loadFile(path.join(archive,'renderer',lang==='en'?'dock.en.html':'dock.html'),{query:{lang}});
   await win.webContents.executeJavaScript('pointerOverDock=()=>false;void 0;');
   for(const [width,height] of [[56,56],[340,200],[420,660],[56,56]]){
    win.setBounds({x:wa.x+80,y:wa.y+80,width,height});
    await pause(90);
    const actual=win.getBounds(),expectedWidth=Math.min(width,wa.width),expectedHeight=Math.min(height,wa.height);
    assert.ok(Math.abs(actual.width-expectedWidth)<=2);
    assert.ok(Math.abs(actual.height-expectedHeight)<=2);
    report.geometry.push({lang,requested:{width,height},actual});
   }
   await win.webContents.executeJavaScript('displayMode="edge";hideToEdge();');
   await pause(100);
   const styles=await win.webContents.executeJavaScript('({ballOnly:document.getElementById("shell").classList.contains("ball-only"),backgrounds:["html","body","#shell","#ballWrap"].map(s=>getComputedStyle(document.querySelector(s)).backgroundColor)})');
   assert.equal(styles.ballOnly,true);assert.ok(styles.backgrounds.every(color=>color==='rgba(0, 0, 0, 0)'));
   const image=await win.webContents.capturePage();const {width,height}=image.getSize(),pixels=image.toBitmap();
   assert.ok(width>0&&height>0&&pixels.length>=width*height*4);
   const alpha=[pixels[3],pixels[(width*height-1)*4+3]];
   assert.deepEqual(alpha,[0,0]);
   fs.writeFileSync(reportFile.replace(/\.json$/, '-'+lang+'.png'),image.toPNG());
   report.languages.push({lang,styles,imageSize:{width,height},cornerAlpha:alpha});
  }
  report.checks.push('Native setBounds still switches between ball, compact panel and expanded panel');
  report.checks.push('English and Chinese ball backgrounds and captured corner pixels are transparent');
  report.passed=true;finish(0);
 }catch(error){report.passed=false;report.error=error.stack;finish(1);}
});
