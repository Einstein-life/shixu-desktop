const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const P=require('../renderer/plant-examples.js');
const C=require('../renderer/lab-core.js');
const R=require('../renderer/research-core.js');
const now=Date.parse('2026-10-20T04:00:00Z');

test('plant examples have coherent projects, workflows, experiments and action links without active timers',()=>{
  const d=P.create('zh-CN',now);
  assert.equal(d.projects.length,6);assert.equal(d.tasks.length,18);assert.equal(d.experiments.length,6);
  for(const p of d.projects){
    assert.equal(p.example_set,P.SET);
    assert.ok(p.title.startsWith('[示例]'));
    assert.ok(Date.parse(p.deadline_date)>now);
    assert.ok(p.milestones.every(m=>m.deadline<=p.deadline_date));
    const e=R.analysisEvidence(p,d.experiments);
    assert.equal(e.linkedExperimentIds.length,1);
    assert.ok(e.items.every(x=>x.missingSourceIds.length===0));
    const action=p.evidence.find(x=>x.kind==='next_step');
    assert.ok(d.tasks.some(t=>t.project_id===p.id&&t.analysis_step_id==='action_'+action.id));
    for(const t of d.tasks.filter(t=>t.project_id===p.id&&t.analysis_step_id&&!t.analysis_step_id.startsWith('action_')))assert.ok(p.analysis_workflow.steps.some(s=>s.id===t.analysis_step_id));
    assert.ok(p.research_context.conclusion.includes('模拟示例'));
  }
  assert.ok(d.experiments.every(e=>e.steps.every(s=>s.status!=='running'&&!s.dueAt)));
  assert.equal(C.recommendations(d,now).due.length,0);
  assert.deepEqual(C.migrate(JSON.parse(JSON.stringify(d))),d);
});

test('plant examples are localized at creation and have stable identities across language and date changes',()=>{
  const en=P.create('en',now),zh=P.create('zh-CN',now+86400000);
  assert.ok(!/[\u3400-\u9fff]/.test(JSON.stringify(en)));
  for(const key of ['projects','tasks','experiments'])assert.deepEqual(en[key].map(x=>x.id),zh[key].map(x=>x.id));
  assert.notEqual(en.projects[0].deadline_date,zh.projects[0].deadline_date);
  const other=P.create('en',now);en.projects[0].analysis_workflow.steps[0].note='Edited';
  assert.notEqual(other.projects[0].analysis_workflow.steps[0].note,'Edited');
});

test('adding examples is idempotent and preserves existing data, edits and valid links',()=>{
  const original=C.migrate({tasks:[{id:'own-task',title:'My work'}],projects:[{id:'own-project',title:'My study'}],experiments:[],summaries:[{id:'report',text:'Keep'}],custom:'Keep metadata'});
  const first=P.add(original,'zh-CN',now);
  first.projects[1].research_context.question='My edited hypothesis';
  first.experiments[0].notes='My experiment note';first.tasks[1].done=true;
  const twice=P.add(first,'en',now+86400000);
  assert.deepEqual(twice,first);
  assert.equal(twice.projects[0].title,'My study');assert.equal(twice.custom,'Keep metadata');
  assert.equal(original.projects.length,1);
});

test('English additions extend the original Chinese examples without translating or duplicating saved records',()=>{
  const old=P.create('zh-CN',now);
  for(const key of ['projects','tasks','experiments'])old[key]=old[key].filter(x=>!/maize-heat|wheat-rust|soybean-nodulation/.test(x.id));
  old.projects[0].title='用户编辑的项目';
  const next=P.add(old,'en',now);
  assert.equal(next.projects.length,6);assert.equal(next.tasks.length,18);assert.equal(next.experiments.length,6);
  assert.equal(next.projects[0].title,'用户编辑的项目');
  for(const key of ['projects','tasks','experiments']){
    const added=next[key].filter(x=>/maize-heat|wheat-rust|soybean-nodulation/.test(x.id));
    assert.ok(added.length>0);assert.ok(!/[\u3400-\u9fff]/.test(JSON.stringify(added)));
  }
  assert.deepEqual(P.add(next,'en',now),next);
});

test('explicit English samples remain available after Chinese first launch and are not duplicated in an English workspace',()=>{
  const zh=P.create('zh-CN',now),withEnglish=P.addEnglish(zh,now);
  assert.equal(withEnglish.projects.length,12);assert.equal(withEnglish.tasks.length,36);assert.equal(withEnglish.experiments.length,12);
  const added=withEnglish.projects.slice(6);
  assert.ok(!/[\u3400-\u9fff]/.test(JSON.stringify(added)));
  for(const p of added)assert.ok(R.analysisEvidence(p,withEnglish.experiments).items.every(x=>!x.missingSourceIds.length));
  assert.equal(withEnglish.projects[0].title,zh.projects[0].title);
  withEnglish.projects[6].research_context.question='An edited question';
  assert.deepEqual(P.addEnglish(withEnglish,now),withEnglish);
  const en=P.create('en',now);assert.deepEqual(P.addEnglish(en,now),en);
});

test('English loader completes six linked examples without overwriting Chinese edits or English additions',()=>{
  const old=P.create('zh-CN',now);
  old.projects[0].research_context.question='保留我的修改';
  const partial=P.create('en',now,'english-additions');
  for(const key of ['projects','tasks','experiments'])old[key].push(...partial[key]);
  const next=P.addEnglish(old,now);
  assert.equal(next.projects.length,12);
  assert.equal(next.projects[0].research_context.question,'保留我的修改');
  const english=next.projects.filter(p=>p.example_locale==='en');
  assert.equal(english.length,6);assert.equal(new Set(english.map(p=>p.example_key)).size,6);
  for(const project of english)assert.ok(R.analysisEvidence(project,next.experiments).items.every(x=>!x.missingSourceIds.length));
  assert.deepEqual(P.addEnglish(next,now),next);
  assert.ok(!/[\u3400-\u9fff]/.test(JSON.stringify(P.create())));
});

test('loading examples requires a click and uses English even from the Chinese interface',async()=>{
  const source=fs.readFileSync(path.join(__dirname,'../renderer/index.html'),'utf8');
  const start=source.indexOf('  async function loadPlantExamples('),end=source.indexOf('  $("btnSyncDesk").addEventListener',start);
  for(const desktop of [false,true]){
    const buttons={btnPlantExamples:{},btnWelcomeExamples:{}},events={};let saves=0,notices=0;
    const context={state:C.empty(),PlantExamples:P,normalizeState:C.migrate,isDemoShot:false,STORE_KEY:'test',
      document:{documentElement:{lang:'zh-CN'},dispatchEvent:()=>notices++},CustomEvent:function(){},
      window:desktop?{shixu:{save:async data=>{saves++;return data;}}}:{},
      applyExternalState:data=>context.state=data,localStorage:{setItem:()=>saves++},toast:()=>{},render:()=>{},
      $:id=>({...buttons[id],addEventListener:(_,fn)=>events[id]=fn})};
    vm.createContext(context);vm.runInContext(source.slice(start,end),context);
    assert.equal(saves,0);assert.equal(context.state.projects.length,0);
    await events.btnPlantExamples();assert.equal(saves,1);assert.equal(notices,1);
    assert.equal(context.state.projects.length,6);assert.equal(context.state.tasks.length,18);
    assert.ok(!/[\u3400-\u9fff]/.test(JSON.stringify(context.state)));
    await events.btnWelcomeExamples();assert.equal(saves,1);assert.equal(context.state.projects.length,6);
  }
});

function desktopStore(initial={}){
  const files=new Map(Object.entries(initial)),filename='/data/shixu-data.json';
  const source=fs.readFileSync(path.join(__dirname,'../electron/main.js'),'utf8');
  const start=source.indexOf('function defaultData()'),end=source.indexOf('function pagePath(',start);
  const api=vm.runInNewContext(source.slice(start,end)+'\n({loadData,saveData});',{
    LabCore:C,PlantExamples:P,locale:'en',store:null,path,process:{env:{}},
    dataFile:()=>filename,legacyDataFile:()=>'/legacy/shixu-data.json',
    tr:(_,en)=>en,dialog:{showErrorBox:()=>{}},
    fs:{existsSync:p=>files.has(p),mkdirSync:()=>{},readFileSync:p=>{if(!files.has(p))throw new Error('missing');return files.get(p);},writeFileSync:(p,v)=>files.set(p,v),copyFileSync:(a,b)=>files.set(b,files.get(a)),renameSync:(a,b)=>{files.set(b,files.get(a));files.delete(a);},unlinkSync:p=>files.delete(p)}
  });
  return {...api,files,filename};
}

test('desktop starts empty until English examples are explicitly loaded and persists the chosen records',()=>{
  const h=desktopStore(),first=h.loadData();
  assert.equal(first.projects.length,0);assert.equal(first.tasks.length,0);assert.equal(first.experiments.length,0);assert.ok(h.files.has(h.filename));
  const loaded=P.addEnglish(first,now);
  assert.equal(loaded.projects.length,6);assert.equal(loaded.tasks.length,18);assert.equal(loaded.experiments.length,6);
  assert.ok(!/[\u3400-\u9fff]/.test(JSON.stringify(loaded)));
  loaded.projects[0].title='Edited project';h.saveData(loaded);
  assert.equal(h.loadData().projects[0].title,'Edited project');
  h.saveData(C.empty());assert.equal(h.loadData().projects.length,0);
});

test('desktop keeps existing and migrated records and does not substitute examples for corrupt data',()=>{
  const legacy={tasks:[{id:'t',title:'Existing task'}],projects:[{id:'p',title:'Existing project'}]};
  for(const filename of ['/data/shixu-data.json','/legacy/shixu-data.json']){
    const h=desktopStore({[filename]:JSON.stringify(legacy)}),data=h.loadData();
    assert.equal(data.projects.length,1);assert.equal(data.projects[0].title,'Existing project');
    assert.ok(!data.projects[0].example_set);
  }
  const corrupt=desktopStore({'/data/shixu-data.json':'{broken'});
  assert.equal(corrupt.loadData().projects.length,0);
  assert.ok([...corrupt.files.keys()].some(key=>key.includes('.corrupt-')));
});

function browserStore(initial={},search=''){
  const files=new Map(Object.entries(initial));
  const source=fs.readFileSync(path.join(__dirname,'../renderer/index.html'),'utf8');
  const start=source.indexOf('  function loadState()'),end=source.indexOf('  function normalizeState(',start);
  const result=vm.runInNewContext(source.slice(start,end)+'\nloadState();',{
    PlantExamples:P,normalizeState:C.migrate,emptyState:C.empty,STORE_KEY:search.includes('demo=1')?'shixu-v2-demo':'shixu-v2-store',
    window:{},document:{documentElement:{lang:'en'}},location:{search},URLSearchParams,
    localStorage:{getItem:key=>files.get(key)||null,setItem:(key,value)=>files.set(key,value)}
  });
  return {data:result,files};
}

test('browser starts empty until a click loads examples; stored empty data and malformed data are not overwritten',()=>{
  const fresh=browserStore();assert.equal(fresh.data.projects.length,0);assert.ok(!fresh.files.has('shixu-v2-store'));
  const empty=JSON.stringify(C.empty()),stored=browserStore({'shixu-v2-store':empty});
  assert.equal(stored.data.projects.length,0);
  const broken=browserStore({'shixu-v2-store':'{broken'});
  assert.equal(broken.files.get('shixu-v2-store'),'{broken');assert.equal(broken.data.projects.length,0);
});

test('demo browser storage stays separate from legacy and normal records and retains edits',()=>{
  const legacy=JSON.stringify({tasks:[{id:'real',title:'Private work'}],projects:[]});
  const first=browserStore({'shixu-bio-v3-store':legacy},'?demo=1');
  assert.equal(first.data.projects.length,6);assert.ok(!first.data.tasks.some(t=>t.id==='real'));
  first.data.projects[0].title='Edited example';
  const second=browserStore({'shixu-v2-demo':JSON.stringify(first.data)},'?demo=1');
  assert.equal(second.data.projects[0].title,'Edited example');
  const normal=browserStore({'shixu-bio-v3-store':legacy});assert.equal(normal.data.tasks[0].title,'Private work');
});

