const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{EventEmitter}=require('node:events');
const C=require('../renderer/lab-core.js'),R=require('../renderer/research-core.js'),P=require('../renderer/plant-examples.js');
function harness(lock=true){
 const app=new EventEmitter(),ipc=new Map(),windows=[],files=new Map();let ready,io=0,quit=0,profile,lockProfile;
 Object.assign(app,{setName:()=>{},requestSingleInstanceLock:()=>{lockProfile=profile;return lock},quit:()=>quit++,getPath:n=>'/'+n,setPath:(name,value)=>{if(name==='userData')profile=value},whenReady:()=>({then:fn=>ready=fn})});
 class Win extends EventEmitter{
  constructor(options){super();this.options=options;this.visible=true;this.minimized=false;this.destroyed=false;this.webContents=new EventEmitter();this.webContents.send=()=>{};windows.push(this);}
  static getAllWindows(){return windows.filter(w=>!w.destroyed)}
  loadFile(){} isDestroyed(){return this.destroyed}isMinimized(){return this.minimized}restore(){this.minimized=false}show(){this.visible=true}hide(){this.visible=false}isVisible(){return this.visible}focus(){this.emit('focus')}setAlwaysOnTop(){}setVisibleOnAllWorkspaces(){}
  close(){this.destroyed=true;this.emit('closed')}
 }
 class Tray extends EventEmitter{setToolTip(){}setContextMenu(){}destroy(){}}
 const image={isEmpty:()=>false,resize:()=>({})};
 const electron={app,BrowserWindow:Win,ipcMain:{handle:(k,fn)=>ipc.set(k,fn),on:()=>{}},Tray,Menu:{buildFromTemplate:x=>x},nativeImage:{createFromPath:()=>image},screen:{getPrimaryDisplay:()=>({workAreaSize:{width:1920,height:1080}})},dialog:{showErrorBox:()=>{}},Notification:{isSupported:()=>false},powerMonitor:new EventEmitter()};
 const fakeFs={mkdirSync:()=>{},existsSync:p=>files.has(p),readFileSync:p=>{if(!files.has(p))throw Error('missing');return files.get(p)},writeFileSync:(p,v)=>{io++;files.set(p,v)},copyFileSync:(a,b)=>files.set(b,files.get(a)),renameSync:(a,b)=>{files.set(b,files.get(a));files.delete(a)},unlinkSync:p=>files.delete(p)};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../electron/main.js'),'utf8'),{require:name=>({'electron':electron,'path':path,'fs':fakeFs,'../renderer/lab-core.js':C,'../renderer/research-core.js':R,'../renderer/plant-examples.js':P,'./autostart.js':{createAutoStart:()=>({get:()=>false,set:()=>{}})}}[name]),__dirname:'/app/electron',process:{env:{SHIXU_DATA_DIR:'/data'},platform:'win32'},setInterval:()=>1,clearInterval:()=>{},console});
 return {app,ipc,windows,files,start:()=>ready(),io:()=>io,quit:()=>quit,lockProfile:()=>lockProfile};
}
test('secondary process exits before persistence, IPC or window initialization',()=>{
 const h=harness(false);assert.equal(h.quit(),1);assert.equal(h.lockProfile(),'/data');assert.equal(h.io(),0);assert.equal(h.ipc.size,0);assert.equal(h.windows.length,0);
});
test('repeat launches during startup and after minimization reuse the main window',()=>{
 const h=harness();h.app.emit('second-instance');assert.equal(h.windows.length,0);h.start();
 const [main,dock]=h.windows;assert.equal(h.windows.length,2);main.minimized=true;main.visible=false;
 h.app.emit('second-instance');assert.equal(h.windows.length,2);assert.equal(main.minimized,false);assert.equal(main.visible,true);assert.equal(dock.visible,true);
 main.focus();main.minimized=true;assert.equal(dock.visible,true);
});
test('main can be recreated inside the existing process; floating visibility follows explicit controls',()=>{
 const h=harness();h.start();const [main,dock]=h.windows;
 h.ipc.get('shixu:hide-dock')();main.focus();assert.equal(dock.visible,false);
 main.close();h.app.emit('second-instance');assert.equal(h.windows.length,3);assert.equal(dock.visible,false);
 h.app.emit('activate');assert.equal(h.windows.length,3);
 h.ipc.get('shixu:open-main')();assert.equal(h.windows.length,3);
});
