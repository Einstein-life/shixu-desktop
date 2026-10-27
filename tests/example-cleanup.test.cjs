const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../renderer/lab-core.js'),R=require('../renderer/research-core.js'),P=require('../renderer/plant-examples.js');
const now=Date.parse('2026-10-27T08:00:00Z');
const chinese=()=>P.create('zh-CN',now);
function count(data){return [data.projects.length,data.tasks.length,data.experiments.length];}
test('cleanup removes complete untouched Chinese families, leaves English and user data, and is idempotent',()=>{
  const data=P.addEnglish(chinese(),now);data.projects.push({id:'personal',title:'我的研究'});
  const r=P.removeUntouchedChinese(data);
  assert.equal(r.removed.length,6);assert.deepEqual(count(r.data),[7,18,6]);
  assert.ok(r.data.projects.some(p=>p.title==='我的研究'));
  assert.equal(chinese().projects.length,6);assert.equal(P.removeUntouchedChinese(r.data).removed.length,0);
});
test('renderer normalization defaults do not prevent cleanup',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../renderer/index.html'),'utf8');
  const constants=html.slice(html.indexOf('  const CATS ='),html.indexOf('  let state ='));
  const normalization=html.slice(html.indexOf('  function normalizeState('),html.indexOf('  function uid('));
  const scoreStart=html.indexOf('  function computeScore(');
  const score=html.slice(scoreStart,html.indexOf('  function ',scoreStart+1));
  const normalize=vm.runInNewContext(constants+'\n'+normalization+'\n'+score+'\nnormalizeState',{LabCore:C,ResearchCore:R,Date});
  assert.equal(P.removeUntouchedChinese(normalize(chinese())).removed.length,6);
});
test('edits to any family member or nested content and missing members preserve the whole family',()=>{
  const mutations=[d=>d.projects[0].title+=' edited',d=>d.projects[0].evidence[0].detail+=' edited',d=>d.projects[0].artifacts.push({id:'my-file',path:'C:/research'}),d=>d.tasks[0].time_spent=1,d=>d.tasks[0].progress=26,d=>d.experiments[0].notes+=' edited',d=>d.experiments[0].steps[0].status='running',d=>d.tasks.shift()];
  for(const mutate of mutations){const d=chinese();mutate(d);const r=P.removeUntouchedChinese(d);assert.equal(r.removed.length,5);assert.ok(r.data.projects.some(p=>p.id==='example_plant_arabidopsis-salt_project'));}
});
test('outside project, experiment, task and encoded evidence references protect families',()=>{
  const additions=[d=>d.tasks.push({id:'personal',project_id:d.projects[0].id}),d=>d.experiments.push({id:'personal',project_id:d.projects[0].id}),d=>d.projects.push({id:'personal',linked_experiment_ids:[d.experiments[0].id]}),d=>d.summaries.push({id:'personal',source:'exp:'+d.experiments[0].id+':file:'+d.experiments[0].artifacts[0].id}),d=>d.tasks.push({id:'personal',analysis_step_id:'action_'+d.projects[0].evidence[2].id})];
  for(const add of additions){const d=chinese();add(d);const r=P.removeUntouchedChinese(d);assert.equal(r.removed.length,5);assert.ok(r.data.projects.some(p=>p.id==='example_plant_arabidopsis-salt_project'));}
});
test('historic three-family subset is recognized, metadata and IDs are both required',()=>{
 const d=chinese();for(const k of ['projects','tasks','experiments'])d[k]=d[k].filter(x=>['arabidopsis-salt','rice-drought','tomato-rhizosphere'].includes(x.example_key));
 assert.equal(d.projects.length,3); assert.equal(P.removeUntouchedChinese(d).removed.length,3);
 const e=chinese();delete e.projects[0].example_set;assert.ok(P.removeUntouchedChinese(e).data.projects.some(p=>p.id===e.projects[0].id));
});
function desktop(failBackup=false,failSave=false){
 const filename='/data/shixu-data.json',files=new Map([[filename,JSON.stringify(chinese())]]);
 const source=fs.readFileSync(path.join(__dirname,'../electron/main.js'),'utf8');
 const api=vm.runInNewContext(source.slice(source.indexOf('function defaultData()'),source.indexOf('function pagePath('))+'\n({loadData,saveData});',{
 LabCore:C,PlantExamples:P,store:null,path,process:{env:{}},dataFile:()=>filename,legacyDataFile:()=>'/missing',tr:(_,en)=>en,dialog:{showErrorBox:()=>{}},
 fs:{existsSync:p=>files.has(p),mkdirSync:()=>{},readFileSync:p=>{if(!files.has(p))throw Error('missing');return files.get(p)},writeFileSync:(p,v)=>{if((failBackup&&p.includes('before-chinese'))||(failSave&&p.endsWith('.tmp')))throw Error('disk full');files.set(p,v)},copyFileSync:(a,b)=>files.set(b,files.get(a)),renameSync:(a,b)=>{files.set(b,files.get(a));files.delete(a)},unlinkSync:p=>files.delete(p)}});
 return {...api,files,filename};
}
test('desktop snapshot precedes deletion and backup failure preserves records',()=>{
 const h=desktop();assert.equal(h.loadData().projects.length,0);
 const backup=[...h.files.keys()].find(p=>p.includes('before-chinese'));assert.ok(backup);assert.equal(JSON.parse(h.files.get(backup)).projects.length,6);
 h.saveData(C.empty());assert.equal(JSON.parse(h.files.get(backup)).projects.length,6);
 const blocked=desktop(true);assert.equal(blocked.loadData().projects.length,6);assert.equal(JSON.parse(blocked.files.get(blocked.filename)).projects.length,6);
});
test('browser saves a dedicated snapshot before cleanup and preserves all records if storage backup fails',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../renderer/index.html'),'utf8');
 for(const fail of [false,true]){
  const files=new Map([['shixu-v2-store',JSON.stringify(chinese())]]);
  const result=vm.runInNewContext(source.slice(source.indexOf('  function loadState()'),source.indexOf('  function normalizeState('))+'\nloadState();',{
    PlantExamples:P,normalizeState:C.migrate,STORE_KEY:'shixu-v2-store',window:{},document:{documentElement:{lang:'en'}},location:{search:''},URLSearchParams,
    localStorage:{getItem:k=>files.get(k)||null,setItem:(k,v)=>{if(fail&&k.includes('before-chinese'))throw Error('quota');files.set(k,v)}}});
  assert.equal(result.projects.length,fail?6:0);assert.equal(JSON.parse(files.get('shixu-v2-store')).projects.length,fail?6:0);
  if(!fail)assert.equal(JSON.parse([...files].find(([k])=>k.includes('before-chinese'))[1]).projects.length,6);
 }
});

test('desktop preserves original records when saving cleanup fails after a successful snapshot',()=>{
 const h=desktop(false,true);assert.equal(h.loadData().projects.length,6);
 assert.equal(JSON.parse(h.files.get(h.filename)).projects.length,6);
 const backup=[...h.files.keys()].find(p=>p.includes('before-chinese'));assert.ok(backup);
 assert.equal(JSON.parse(h.files.get(backup)).projects.length,6);
});
