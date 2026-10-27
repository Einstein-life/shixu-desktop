const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createDockLayoutController}=require('../renderer/dock-layout.js');
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};};

function desktop(workArea={x:0,y:0,width:1920,height:1040}){
  let bounds={x:1500,y:250,width:340,height:200};const handlers={};
  const source=fs.readFileSync(path.join(__dirname,'../electron/main.js'),'utf8');
  const start=source.indexOf('function layoutDisplay('),end=source.indexOf("ipcMain.handle('shixu:open-main'",start);
  const display={workArea};
  vm.runInNewContext(source.slice(start,end),{
    dockExpanded:false,dockWindow:{isDestroyed:()=>false,getBounds:()=>({...bounds}),setBounds:value=>bounds={...value},setAlwaysOnTop:()=>{}},
    screen:{getDisplayNearestPoint:()=>display,getCursorScreenPoint:()=>({x:workArea.x+20,y:workArea.y+20}),getDisplayMatching:()=>display,getPrimaryDisplay:()=>display},
    saveSettings:()=>{},loadSettings:()=>({dockDisplayMode:'edge'}),ipcMain:{handle:(name,fn)=>handlers[name]=fn}
  });
  const call=(name,value)=>handlers['shixu:'+name]({},value);
  return {bounds:()=>bounds,call,api:{dockSetSize:v=>call('dock-set-size',v),dockSetBall:v=>call('dock-set-ball',v),dockSlide:v=>call('dock-slide',v)}};
}

test('expansion waits for edge reveal before setting expanded bounds',async()=>{
  const gate=deferred(),calls=[],d=desktop();
  const c=createDockLayoutController({...d.api,dockSetBall:async v=>{calls.push('ball');await gate.promise;d.api.dockSetBall(v);},dockSetSize:v=>{calls.push('size');d.api.dockSetSize(v);}});
  const pending=c.resize(true);await Promise.resolve();await Promise.resolve();
  assert.deepEqual(calls,['ball']);
  gate.resolve();await pending;
  assert.deepEqual(calls,['ball','size']);assert.equal(d.bounds().height,660);
});

test('pending edge hide, hover reveal and expansion settle on the last requested panel state',async()=>{
  const d=desktop(),gate=deferred(),c=createDockLayoutController({...d.api,dockSlide:async value=>{await gate.promise;d.api.dockSlide(value);}});
  const hiding=c.hide(),showing=c.show(),expanded=c.resize(true);
  gate.resolve();await Promise.all([hiding,showing,expanded]);
  assert.equal(d.bounds().height,660);assert.equal(d.bounds().width,420);
  await c.resize(false);assert.equal(d.bounds().height,200);
  await c.hide();assert.equal(d.bounds().height,56);
});

test('late edge or hover requests and mode changes cannot shrink an expanded native panel',()=>{
  const d=desktop();d.call('dock-set-size',true);
  for(const [name,value] of [['dock-set-ball',false],['dock-slide',{mode:'show'}],['dock-set-ball',true],['dock-slide',{mode:'hide-edge'}],['dock-display-mode','always'],['dock-display-mode','edge']]){
    d.call(name,value);assert.equal(d.bounds().height,660,name);assert.equal(d.bounds().width,420,name);
  }
  d.call('dock-set-size',false);d.call('dock-set-ball',true);assert.equal(d.bounds().width,56);
  d.call('dock-set-ball',false);assert.equal(d.bounds().height,200);
});

test('expanded geometry remains inside a small work area or a monitor with negative coordinates',()=>{
  for(const area of [{x:-1280,y:-200,width:1280,height:720},{x:0,y:40,width:390,height:560}]){
    const d=desktop(area);d.call('dock-set-size',true);
    const b=d.bounds();assert.equal(b.height,Math.min(660,area.height));assert.equal(b.width,Math.min(420,area.width));
    assert.ok(b.x>=area.x&&b.y>=area.y&&b.x+b.width<=area.x+area.width&&b.y+b.height<=area.y+area.height);
  }
});

test('a failed geometry operation does not block later recovery and rapid collapse follows expansion',async()=>{
  let fail=true;const d=desktop(),c=createDockLayoutController({...d.api,dockSetBall:v=>{if(fail){fail=false;throw Error('window busy');}return d.api.dockSetBall(v);}});
  await assert.rejects(c.resize(true),/window busy/);
  await c.resize(true);assert.equal(d.bounds().height,660);
  await Promise.all([c.resize(true),c.resize(false)]);assert.equal(d.bounds().height,200);
});

async function renderer(d,overrides={}){
  const nodes=new Map();
  const node=id=>{
    if(!nodes.has(id)){
      const classes=new Set();
      nodes.set(id,{listeners:{},classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),toggle:(v,on)=>on?classes.add(v):classes.delete(v),contains:v=>classes.has(v)},addEventListener(event,fn){this.listeners[event]=fn;},setAttribute(){},before(){},innerHTML:'',textContent:''});
    }
    return nodes.get(id);
  };
  const api={...d.api,load:async()=>({tasks:[],projects:[],experiments:[]}),onUpdate:()=>{},dockGetDisplayMode:async()=>({displayMode:'edge'}),dockDisplayMode:async()=>{},...overrides};
  const context=vm.createContext({window:{shixu:api,DockLayout:{createDockLayoutController}},document:{documentElement:{lang:'en'},getElementById:node,querySelectorAll:()=>[]},LabCore:require('../renderer/lab-core.js'),URLSearchParams,location:{search:''},setInterval:()=>{},setTimeout:()=>{},console});
  const source=fs.readFileSync(path.join(__dirname,'../renderer/dock.html'),'utf8').match(/  <script>\s*([\s\S]*?)<\/script>/)[1];
  vm.runInContext(source,context);await context.init();
  return {context,node,run:code=>vm.runInContext(code,context)};
}

test('renderer hover and mode switching retain full native bounds until explicit collapse',async()=>{
  const d=desktop(),r=await renderer(d);
  await r.context.setExpanded(true);
  for(let i=0;i<3;i++)r.node('shell').listeners.mouseenter();
  await r.context.setDisplayMode('always');await r.context.setDisplayMode('edge');
  assert.equal(d.bounds().height,660);assert.equal(r.node('expanded').classList.contains('open'),true);
  await r.context.setExpanded(false);assert.equal(d.bounds().height,200);
  await r.context.init();assert.equal(d.bounds().height,200);
});

test('renderer ignores a stale ball paint when expansion occurs during pending edge hide',async()=>{
  const d=desktop(),gate=deferred(),r=await renderer(d,{dockSlide:async value=>{await gate.promise;return d.api.dockSlide(value);}});
  const hiding=r.context.hideToEdge();
  const expanding=r.context.setExpanded(true);
  gate.resolve();await Promise.all([hiding,expanding]);
  assert.equal(d.bounds().height,660);
  assert.equal(r.node('shell').classList.contains('ball-only'),false);
  assert.equal(r.node('expanded').classList.contains('open'),true);
});
