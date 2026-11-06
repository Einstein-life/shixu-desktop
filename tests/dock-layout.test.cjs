const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createDockLayoutController}=require('../renderer/dock-layout.js');
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};};

function desktop(workArea={x:0,y:0,width:1920,height:1040},initialSettings={}){
  let bounds={x:workArea.x+Math.max(0,Math.min(workArea.width-340,1500)),y:workArea.y+Math.max(0,Math.min(workArea.height-200,250)),width:340,height:200};let cursor={x:workArea.x+20,y:workArea.y+20};let settings={dockDisplayMode:'edge',...initialSettings};const handlers={};const sender={};
  const source=fs.readFileSync(path.join(__dirname,'../electron/main.js'),'utf8');
  const start=source.indexOf('function layoutDisplay('),end=source.indexOf("ipcMain.handle('shixu:open-main'",start);
  const display={workArea};
  vm.runInNewContext(source.slice(start,end),{
    dockExpanded:false,dockBallDrag:null,dockWindow:{webContents:sender,isDestroyed:()=>false,getBounds:()=>({...bounds}),setBounds:value=>bounds={...value},setAlwaysOnTop:()=>{}},
    screen:{getDisplayNearestPoint:()=>display,getCursorScreenPoint:()=>({...cursor}),getDisplayMatching:()=>display,getPrimaryDisplay:()=>display},
    saveSettings:patch=>{settings={...settings,...patch};},loadSettings:()=>({...settings}),ipcMain:{handle:(name,fn)=>handlers[name]=fn}
  });
  const call=(name,value)=>handlers['shixu:'+name]({},value);
  const callDock=(name,value)=>handlers['shixu:'+name]({sender},value);
  return {bounds:()=>bounds,settings:()=>settings,setCursor:value=>cursor={...value},call,callDock,api:{dockSetSize:v=>call('dock-set-size',v),dockSetBall:v=>call('dock-set-ball',v),dockSlide:v=>call('dock-slide',v)}};
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
  const nodes=new Map(),timers=[],intervals=[];
  const node=id=>{
    if(!nodes.has(id)){
      const classes=new Set();
      nodes.set(id,{listeners:{},classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),toggle:(v,on)=>on?classes.add(v):classes.delete(v),contains:v=>classes.has(v)},addEventListener(event,fn){this.listeners[event]=fn;},setPointerCapture(){},releasePointerCapture(){},setAttribute(){},before(){},innerHTML:'',textContent:''});
    }
    return nodes.get(id);
  };
  const api={...d.api,load:async()=>({tasks:[],projects:[],experiments:[]}),onUpdate:()=>{},dockGetDisplayMode:async()=>({displayMode:'edge'}),dockDisplayMode:async()=>{},...overrides};
  const context=vm.createContext({window:{shixu:api,DockLayout:{createDockLayoutController}},document:{documentElement:{lang:'en'},getElementById:node,querySelectorAll:()=>[]},LabCore:require('../renderer/lab-core.js'),URLSearchParams,location:{search:''},setInterval:(fn,delay)=>{intervals.push({fn,delay});return intervals.length-1;},setTimeout:(fn,delay)=>{timers.push({fn,delay,cleared:false});return timers.length-1;},clearTimeout:id=>{if(timers[id])timers[id].cleared=true;},console});
  const source=fs.readFileSync(path.join(__dirname,'../renderer/dock.html'),'utf8').match(/  <script>\s*([\s\S]*?)<\/script>/)[1];
  vm.runInContext(source,context);await context.init();
  return {context,node,timers,intervals,run:code=>vm.runInContext(code,context)};
}

test('edge mode returns an expanded panel to the ball after repeated expansions and pointer exit',async()=>{
  const d=desktop(),r=await renderer(d);
  await r.context.setDisplayMode('always');
  for(let i=0;i<6;i++){await r.context.setExpanded(true);await r.context.setExpanded(false);}
  await r.context.setExpanded(true);
  await r.context.setDisplayMode('edge');
  r.node('shell').listeners.mouseleave();
  r.run('lastHoverTs=Date.now()-1200');
  r.intervals.find(t=>t.delay===250).fn();
  for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(r.node('shell').classList.contains('ball-only'),true);
  assert.equal(r.run('expanded'),false);
  assert.equal(r.run('edgeHidden'),true);
  assert.equal(d.bounds().width,56);
  assert.equal(d.bounds().height,56);
});

test('a single pointer exit clears repeated hover entries and allows the panel to return to its saved ball position',async()=>{
  const d=desktop(undefined,{dockBallPosition:{x:480,y:280}}),r=await renderer(d);
  await r.context.setDisplayMode('edge');
  await r.context.setExpanded(false);
  for(let i=0;i<3;i++)r.node('shell').listeners.mouseenter();
  r.node('shell').listeners.mouseleave();
  r.run('lastHoverTs=Date.now()-1200');
  r.intervals.find(t=>t.delay===250).fn();
  for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(r.node('shell').classList.contains('ball-only'),true);
  assert.deepEqual(d.bounds(),{x:480,y:280,width:56,height:56});
});

test('edge mode keeps an expanded panel open while the pointer remains over it',async()=>{
  const d=desktop(),r=await renderer(d);
  await r.context.setExpanded(true);
  r.node('shell').listeners.mouseenter();
  await r.context.setDisplayMode('edge');
  r.timers.find(t=>t.delay===500).fn();
  r.intervals.find(t=>t.delay===250).fn();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(r.run('expanded'),true);
  assert.equal(r.run('edgeHidden'),false);
  assert.equal(d.bounds().height,660);
});

test('reopening during a pending expanded-to-ball transition leaves the final native window expanded',async()=>{
  const d=desktop(),gate=deferred();let hold=false;
  const r=await renderer(d,{dockSetSize:async value=>{if(hold&&!value)await gate.promise;return d.api.dockSetSize(value);}});
  await r.context.setExpanded(true);
  hold=true;
  const hiding=r.context.hideToEdge();
  await new Promise(resolve=>setImmediate(resolve));
  const opening=r.context.setExpanded(true);
  gate.resolve();await Promise.all([hiding,opening]);
  assert.equal(d.bounds().height,660);
  assert.equal(r.node('shell').classList.contains('ball-only'),false);
  assert.equal(r.run('edgeHidden'),false);
  assert.equal(r.run('expanded'),true);
});

test('a late edge-mode response cannot undo a later always-visible selection',async()=>{
  const gate=deferred(),d=desktop(),r=await renderer(d,{dockDisplayMode:async mode=>{if(mode==='edge')await gate.promise;}});
  const edge=r.context.setDisplayMode('edge');
  await r.context.setDisplayMode('always');
  gate.resolve();await edge;
  for(const timer of r.timers.filter(t=>!t.cleared))timer.fn();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(r.run('displayMode'),'always');
  assert.equal(r.run('edgeHidden'),false);
  assert.equal(r.node('shell').classList.contains('ball-only'),false);
});

test('a failed edge collapse can retry instead of remaining falsely marked as hidden',async()=>{
  const d=desktop();let fail=false;
  const r=await renderer(d,{dockSetSize:value=>{if(fail&&!value){fail=false;throw Error('Window busy');}return d.api.dockSetSize(value);}});
  await r.context.setExpanded(true);fail=true;
  await r.context.hideToEdge();
  assert.equal(r.run('edgeHidden'),false);
  assert.equal(r.node('shell').classList.contains('ball-only'),false);
  await r.context.hideToEdge();
  assert.equal(d.bounds().height,56);
  assert.equal(r.node('shell').classList.contains('ball-only'),true);
});

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


test('dragging the ball saves its position and keeps it through collapse, expansion, and edge reveal',()=>{
  const d=desktop({x:-1280,y:-100,width:1280,height:820});
  const before=d.bounds();d.setCursor({x:before.x+12,y:before.y+12});
  d.callDock('dock-drag-start');
  d.setCursor({x:-760,y:500});
  const moved=d.callDock('dock-drag-move');
  assert.deepEqual({...moved},{x:-772,y:488,width:56,height:56});
  assert.deepEqual({...d.callDock('dock-drag-end')},{x:-772,y:488});
  assert.deepEqual({...d.settings().dockBallPosition},{x:-772,y:488});
  d.call('dock-set-size',true);assert.deepEqual(d.bounds(),{x:-1136,y:60,width:420,height:660});
  d.call('dock-set-size',false);assert.deepEqual(d.bounds(),{x:-1056,y:488,width:340,height:200});
  d.call('dock-set-ball',true);assert.deepEqual(d.bounds(),{x:-772,y:488,width:56,height:56});
  d.call('dock-slide',{mode:'show'});assert.deepEqual(d.bounds(),{x:-1056,y:488,width:340,height:200});
  const restarted=desktop({x:-1280,y:-100,width:1280,height:820},d.settings());
  restarted.call('dock-set-ball',true);assert.deepEqual(restarted.bounds(),{x:-772,y:488,width:56,height:56});
});

test('ball drag messages cannot reposition the floating window from another renderer',()=>{
  const d=desktop();
  const before=d.bounds();
  assert.equal(d.call('dock-drag-start'),false);
  assert.equal(d.call('dock-drag-move'),false);
  assert.equal(d.call('dock-drag-end'),false);
  assert.deepEqual(d.bounds(),before);
});

test('expanded windows cannot begin ball drags',()=>{
  const d=desktop();d.call('dock-set-size',true);
  assert.equal(d.callDock('dock-drag-start'),false);
  assert.equal(d.callDock('dock-drag-move'),false);
  assert.equal(d.callDock('dock-drag-end'),false);
});

test('compact ball drag moves and persists; a click without movement still expands',async()=>{
  const d=desktop(),calls=[];
  const r=await renderer(d,{dockDragStart:async()=>{calls.push('start');return true;},dockDragMove:async()=>{calls.push('move');},dockDragEnd:async()=>{calls.push('end');}});
  const ball=r.node('bb');
  ball.listeners.pointerdown({button:0,pointerId:7,clientX:12,clientY:12,preventDefault(){}});
  ball.listeners.pointermove({pointerId:7,clientX:23,clientY:12});
  ball.listeners.pointerup({pointerId:7});
  for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(calls,['start','move','end']);
  assert.equal(r.run('expanded'),false);
  ball.listeners.pointerdown({button:0,pointerId:8,clientX:12,clientY:12,preventDefault(){}});
  ball.listeners.pointerup({pointerId:8});
  for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(calls,['start','move','end','start','end']);
  assert.equal(r.run('expanded'),true);
});

test('edge hover reveal waits briefly so a ball press and drag can take priority',async()=>{
  const calls=[],r=await renderer(desktop(),{dockDragStart:async()=>{calls.push('drag-start');},dockDragMove:async()=>{calls.push('drag-move');},dockDragEnd:async()=>{calls.push('drag-end');},dockSetBall:async value=>calls.push('ball-'+value),dockSlide:async value=>calls.push('slide-'+value.mode)});
  r.run('homePos={x:120,y:160}');
  await r.context.hideToEdge();
  r.node('shell').listeners.mouseenter();
  assert.equal(r.timers[0].delay,180);
  assert.equal(r.run('edgeHidden'),true);
  const ball=r.node('bb');
  ball.listeners.pointerdown({button:0,pointerId:3,clientX:10,clientY:10,preventDefault(){}});
  ball.listeners.pointermove({pointerId:3,clientX:20,clientY:20});
  ball.listeners.pointerup({pointerId:3});
  for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(r.timers[0].cleared,true);
  assert.deepEqual(calls,['slide-hide-edge','ball-true','drag-start','drag-move','drag-end']);
  assert.equal(r.node('shell').classList.contains('ball-only'),true);
  assert.equal(r.run('edgeHidden'),true);
});

test('edge hover reveals the panel after the short delay when the user is not dragging',async()=>{
  const calls=[],r=await renderer(desktop(),{dockSetBall:async value=>calls.push('ball-'+value),dockSlide:async value=>calls.push('slide-'+value.mode)});
  r.run('homePos={x:120,y:160}');
  await r.context.hideToEdge();
  r.node('shell').listeners.mouseenter();
  assert.equal(r.timers[0].delay,180);
  r.timers[0].fn();
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(calls,['slide-hide-edge','ball-true','ball-false','slide-show']);
  assert.equal(r.node('shell').classList.contains('ball-only'),false);
  assert.equal(r.run('edgeHidden'),false);
});

test('compact panel retains all unfinished tasks, including ready and waiting items',async()=>{
  const tasks=[...Array.from({length:20},(_,i)=>({id:'open-'+i,title:'Open '+i,score:20-i,createdAt:i+1})),...Array.from({length:4},(_,i)=>({id:'ready-'+i,title:'Ready '+i,run_state:'ready',score:12-i})),...Array.from({length:4},(_,i)=>({id:'waiting-'+i,title:'Waiting '+i,run_state:'waiting',score:10-i})),{id:'escaped',title:'<script>Task & title</script>',score:1},{id:'done',title:'Finished task',score:22,done:true}];
  const r=await renderer(desktop(),{load:async()=>({tasks,projects:[],experiments:[]})});
  const html=r.node('peekBody').innerHTML;
  assert.equal((html.match(/data-user-copy/g)||[]).length,29);
  for(const task of tasks.filter(t=>!t.done&&t.id!=='escaped'))assert.ok(html.includes('>'+task.title+'</span>'),task.id);
  assert.ok(!html.includes('Finished task'));
  assert.ok(html.includes('&lt;script&gt;Task &amp; title&lt;/script&gt;'));
  assert.equal(r.node('expanded').classList.contains('open'),false);
});
