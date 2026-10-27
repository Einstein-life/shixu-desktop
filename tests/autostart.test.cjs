const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {createAutoStart}=require('../electron/autostart.js');
const {create}=require('../renderer/autostart-ui.js');

function system({packaged=false,platform='win32',ignore=false,writeError=false,readError=false,extra={}}={}) {
  let registered=false;
  const reads=[],writes=[],saved=[];
  const app={isPackaged:packaged,getAppPath:()=>path.resolve(__dirname,'..'),
    getLoginItemSettings:identity=>{reads.push(identity);if(readError)throw new Error('denied');return {openAtLogin:registered,...extra};},
    setLoginItemSettings:value=>{writes.push(value);if(writeError)throw new Error('denied');if(!ignore)registered=value.openAtLogin;}};
  return {controller:createAutoStart({app,platform,execPath:'C:\\Shixu folder\\electron.exe',saveSettings:patch=>saved.push(patch)}),reads,writes,saved};
}

test('Windows development login settings read and write the same executable and project argument',()=>{
  const s=system();
  assert.equal(s.controller.get().openAtLogin,false);
  assert.equal(s.controller.set(true).openAtLogin,true);
  assert.equal(s.controller.get().openAtLogin,true);
  const {path:exe,args}=s.writes[0];
  assert.equal(exe,'C:\\Shixu folder\\electron.exe');
  assert.deepEqual(args,[path.resolve(__dirname,'..')]);
  for(const query of s.reads)assert.deepEqual(query,{path:exe,args});
  assert.equal(s.controller.set(false).openAtLogin,false);
  assert.deepEqual(s.saved,[{openAtLogin:true},{openAtLogin:false}]);
});

test('packaged Windows app registers its own executable without development arguments',()=>{
  const s=system({packaged:true});
  s.controller.set(true);
  assert.deepEqual(s.writes[0].args,[]);
  assert.equal(s.writes[0].enabled,true);
});

test('failed writes and writes rejected by the OS never save a successful preference',()=>{
  for(const options of [{writeError:true},{ignore:true},{readError:true}]) {
    const s=system(options);
    assert.throws(()=>s.controller.set(true),/AUTOSTART_(SET_FAILED|NOT_APPLIED|READ_FAILED)/);
    assert.deepEqual(s.saved,[]);
  }
});

test('Windows startup approval for another Electron project does not determine this project state',()=>{
  const args=[path.resolve(__dirname,'..')];
  const s=system({extra:{executableWillLaunchAtLogin:true,launchItems:[
    {name:'Other app',path:'C:\\Shixu folder\\electron.exe',args:['other-project'],enabled:true},
    {name:'Shixu Desktop',path:'C:\\Shixu folder\\electron.exe',args,enabled:false}
  ]}});
  const state=s.controller.set(true);
  assert.equal(state.blocked,true);
  assert.equal(state.openAtLogin,false);
  assert.deepEqual(s.saved,[{openAtLogin:false}]);
});

test('macOS approval and unsupported environments are reported honestly',()=>{
  const pending=system({platform:'darwin',packaged:true,extra:{status:'requires-approval'}});
  assert.equal(pending.controller.set(true).pendingApproval,true);
  assert.equal(pending.saved[0].openAtLogin,false);
  assert.equal(Object.hasOwn(pending.writes[0],'path'),false);
  const dev=system({platform:'darwin'});
  assert.equal(dev.controller.get().available,false);
  assert.throws(()=>dev.controller.set(true),/AUTOSTART_INSTALL_REQUIRED/);
  assert.equal(system({platform:'linux'}).controller.get().reason,'UNSUPPORTED');
});

function ui(api,lang='zh-CN') {
  const button={dataset:{},disabled:false,textContent:'',attrs:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(){}};
  const messages=[];
  return {button,messages,control:create({button,api,lang,toast:value=>messages.push(value)})};
}

test('button displays verified on/off states in both languages and blocks concurrent clicks',async()=>{
  for(const lang of ['zh-CN','en']) {
    let on=false,resolveWrite,count=0;
    const api={getAutoStart:async()=>({openAtLogin:on}),setAutoStart:requested=>{count++;return new Promise(resolve=>resolveWrite=()=>{on=requested;resolve({openAtLogin:on});});}};
    const u=ui(api,lang);await u.control.refresh();
    assert.equal(u.button.dataset.on,'0');
    const pending=u.control.toggle();
    assert.equal(u.button.disabled,true);
    assert.equal(u.button.textContent,lang==='en'?'Launch at login: updating…':'开机自启：正在设置…');
    await u.control.toggle();await u.control.refresh();
    assert.equal(count,1);
    resolveWrite();await pending;
    assert.equal(u.button.dataset.on,'1');
    assert.equal(u.button.disabled,false);
    assert.equal(u.button.textContent,lang==='en'?'Launch at login: on':'开机自启：开');
    const reopened=ui(api,lang);await reopened.control.refresh();assert.equal(reopened.button.dataset.on,'1');
    const off=u.control.toggle();resolveWrite();await off;
    assert.equal(u.button.dataset.on,'0');
  }
});

test('button rereads after failures and never reports an unchanged state as a successful toggle',async()=>{
  const u=ui({getAutoStart:async()=>({openAtLogin:false}),setAutoStart:async()=>{throw new Error('AUTOSTART_SET_FAILED');}},'en');
  await u.control.refresh();await u.control.toggle();
  assert.equal(u.button.textContent,'Launch at login: off');
  assert.equal(u.button.disabled,false);
  assert.match(u.messages[0],/Could not change/);
  assert.ok(!u.messages.some(m=>m==='Launch at login enabled'));
  const unchanged=ui({getAutoStart:async()=>({openAtLogin:false}),setAutoStart:async()=>({openAtLogin:false})},'en');
  await unchanged.control.refresh();await unchanged.control.toggle();
  assert.match(unchanged.messages[0],/did not apply/);
});

test('unknown initial status retries reading before changing the OS',async()=>{
  let fail=true,writes=0;
  const u=ui({getAutoStart:async()=>{if(fail)throw new Error('AUTOSTART_READ_FAILED');return {openAtLogin:false};},setAutoStart:async()=>{writes++;return {openAtLogin:true};}});
  await u.control.refresh();fail=false;await u.control.toggle();
  assert.equal(writes,0);
  assert.equal(u.button.dataset.on,'0');
  await u.control.toggle();assert.equal(writes,1);
});
