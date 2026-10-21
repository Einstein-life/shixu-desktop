const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const R=require('../renderer/research-core.js');
const localPath=process.platform==='win32'?'D:\\analysis\\run-script.bat':'/Users/researcher/analysis/run-script.sh';

function harness(artifacts,exists=true) {
  const handlers={},calls=[];
  const mainWindow={webContents:{mainFrame:{}}};
  const shell={showItemInFolder:value=>calls.push(['reveal',value]),openExternal:async value=>calls.push(['web',value])};
  const source=fs.readFileSync(path.join(__dirname,'../electron/main.js'),'utf8');
  const start=source.indexOf("ipcMain.handle('shixu:open-research-artifact'");
  const end=source.indexOf("ipcMain.handle('shixu:reveal-data'",start);
  assert.ok(start>=0&&end>start);
  vm.runInNewContext(source.slice(start,end),{ipcMain:{handle:(name,fn)=>handlers[name]=fn},mainWindow,store:{projects:[{id:'p',artifacts}],experiments:[{id:'e',artifacts}]},ResearchCore:R,path,fs:{existsSync:()=>exists},tr:(_,en)=>en,require:name=>{assert.equal(name,'electron');return {shell};}});
  return {run:handlers['shixu:open-research-artifact'],experiment:handlers['shixu:open-experiment-artifact'],calls,event:{sender:mainWindow.webContents,senderFrame:mainWindow.webContents.mainFrame}};
}

test('desktop artifact action reveals saved local paths without executing linked files',async()=>{
  const h=harness([{id:'a',path:localPath}]);
  const result=await h.run(h.event,'p','a');
  assert.equal(result.ok,true);
  assert.deepEqual(h.calls,[['reveal',localPath]]);
});

test('desktop action opens saved web reports and reports missing local files',async()=>{
  const web=harness([{id:'a',path:'https://example.org/report.html'}]);
  assert.equal((await web.run(web.event,'p','a')).ok,true);
  assert.deepEqual(web.calls,[['web','https://example.org/report.html']]);
  const missing=harness([{id:'a',path:'D:\\moved\\report.pdf'}],false);
  assert.equal((await missing.run(missing.event,'p','a')).ok,false);
  assert.equal(missing.calls.length,0);
});

test('artifact action rejects untrusted frames, unknown references and unsupported schemes',async()=>{
  const h=harness([{id:'a',path:'javascript:alert(1)'},{id:'server',path:'user@cluster:/project/report'}]);
  for(const event of [{sender:{},senderFrame:h.event.senderFrame},{sender:h.event.sender,senderFrame:{}}])assert.equal((await h.run(event,'p','a')).error,'INVALID_SENDER');
  for(const id of ['a','server','D:\\arbitrary\\file.exe'])assert.equal((await h.run(h.event,'p',id)).ok,false);
  assert.equal(h.calls.length,0);
});

test('experiment files resolve saved IDs, reveal local files and open web reports',async()=>{
  const local=harness([{id:'a',path:localPath}]);
  assert.equal((await local.experiment(local.event,'e','a')).ok,true);
  assert.deepEqual(local.calls,[['reveal',localPath]]);
  const web=harness([{id:'a',path:'https://example.org/assay.csv'}]);
  assert.equal((await web.experiment(web.event,'e','a')).ok,true);
  assert.deepEqual(web.calls,[['web','https://example.org/assay.csv']]);
});

test('experiment file actions reject missing records, frames and unsupported paths without shell calls',async()=>{
  const h=harness([{id:'a',path:'javascript:alert(1)'},{id:'remote',path:'user@cluster:/results'}]);
  for(const [e,a] of [['missing','a'],['e','missing'],['e','a'],['e','remote']])assert.equal((await h.experiment(h.event,e,a)).ok,false);
  assert.equal((await h.experiment({sender:{},senderFrame:h.event.senderFrame},'e','a')).error,'INVALID_SENDER');
  assert.equal((await h.experiment({sender:h.event.sender,senderFrame:{}},'e','a')).error,'INVALID_SENDER');
  assert.equal(h.calls.length,0);
  const missing=harness([{id:'a',path:'D:\\moved\\assay.csv'}],false);
  assert.equal((await missing.experiment(missing.event,'e','a')).ok,false);
  assert.equal(missing.calls.length,0);
});
