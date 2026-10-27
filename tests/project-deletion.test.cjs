const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const R=require('../renderer/research-core.js');
const L=require('../renderer/lab-core.js');
const target='example_plant_en_test';
const clone=value=>JSON.parse(JSON.stringify(value));
function fixture() {
  return {
    tasks:[{id:'task',project_id:target,analysis_step_id:'step',title:'Review evidence',result_note:'Keep these results',done:false},{id:'other-task',project_id:'other',title:'Another task'}],
    projects:[{id:target,title:'Example <plant> study',archived:true,analysis_workflow:{steps:[{id:'step',title:'Analysis',note:'QC review'}]},research_context:{question:'Does treatment help?'},artifacts:[{id:'report',path:'D:\\research\\report.pdf'}],evidence:[{id:'evidence',sourceIds:['exp:external']}],linked_experiment_ids:['external']},{id:'other',title:'Other study',linked_experiment_ids:['shared'],evidence:[{id:'shared-result',sourceIds:['exp:evidence-shared:file:result']}]}],
    experiments:[{id:'own',project_id:target,title:'Own experiment',artifacts:[{id:'file',path:'D:\\research\\result.csv'}],events:[{id:'log',note:'Recorded result'}]},{id:'shared',project_id:target,title:'Shared experiment'},{id:'evidence-shared',project_id:target,title:'Shared through evidence'},{id:'external',project_id:'other',title:'External experiment'},{id:'unassigned',project_id:null,title:'Unassigned experiment'}],
    summaries:[{id:'weekly',text:'Existing weekly record'}]
  };
}
const opts=(data,extra={})=>({fingerprint:R.projectDeletionPlan(data,target).fingerprint,...extra});

test('deletion plan identifies associated, shared and externally linked experiments',()=>{
  const d=fixture(),p=R.projectDeletionPlan(d,target);
  assert.equal(p.title,'Example <plant> study');
  assert.deepEqual(p.taskIds,['task']);
  assert.deepEqual(p.experimentIds,['own','shared','evidence-shared']);
  assert.deepEqual(p.sharedExperimentIds,['shared','evidence-shared']);
  assert.deepEqual(p.linkedExperimentIds,['external']);
});

test('default deletion is immutable and preserves detached research results and file references',()=>{
  const d=fixture(),before=clone(d),result=R.deleteProject(d,target,opts(d)),n=result.data;
  assert.deepEqual(d,before);
  assert.equal(n.projects.some(p=>p.id===target),false);
  assert.deepEqual(n.projects,d.projects.slice(1));
  assert.equal(n.tasks[0].project_id,null);
  assert.equal(n.tasks[0].analysis_step_id,'');
  assert.equal(n.tasks[0].result_note,'Keep these results');
  assert.equal(n.experiments[0].project_id,null);
  assert.deepEqual(n.experiments[0].artifacts,d.experiments[0].artifacts);
  assert.deepEqual(n.experiments[0].events,d.experiments[0].events);
  assert.deepEqual(n.summaries,d.summaries);
  assert.equal(result.deletedTaskCount,0);
  assert.equal(result.deletedExperimentCount,0);
});

for(const deleteTasks of [false,true])for(const deleteExperiments of [false,true])test('cascade options: tasks='+deleteTasks+', experiments='+deleteExperiments,()=>{
  const d=fixture(),r=R.deleteProject(d,target,opts(d,{deleteTasks,deleteExperiments}));
  assert.equal(r.data.tasks.some(t=>t.id==='task'),!deleteTasks);
  assert.equal(r.data.experiments.some(e=>e.id==='own'),!deleteExperiments);
  for(const id of ['shared','evidence-shared'])assert.equal(r.data.experiments.find(e=>e.id===id).project_id,null);
  assert.equal(r.deletedTaskCount,deleteTasks?1:0);
  assert.equal(r.deletedExperimentCount,deleteExperiments?1:0);
});

test('only explicit boolean cascade options delete associated records',()=>{
  const d=fixture(),r=R.deleteProject(d,target,opts(d,{deleteTasks:'true',deleteExperiments:1}));
  assert.equal(r.data.tasks.length,d.tasks.length);
  assert.equal(r.data.experiments.length,d.experiments.length);
});

test('external and unassigned linked experiments are preserved unchanged',()=>{
  const d=fixture();d.projects[0].linked_experiment_ids.push('unassigned');
  const r=R.deleteProject(d,target,opts(d,{deleteExperiments:true}));
  for(const id of ['external','unassigned'])assert.deepEqual(r.data.experiments.find(e=>e.id===id),d.experiments.find(e=>e.id===id));
});

test('missing projects and missing or stale confirmation are rejected',()=>{
  const d=fixture();
  assert.throws(()=>R.projectDeletionPlan(d,'missing'),/PROJECT_NOT_FOUND/);
  assert.throws(()=>R.deleteProject(d,target),/PROJECT_CHANGED/);
  assert.throws(()=>R.deleteProject(d,target,{fingerprint:'stale'}),/PROJECT_CHANGED/);
});

test('project, associated task and owned experiment edits invalidate confirmation',()=>{
  for(const change of [d=>d.projects[0].title+=' edited',d=>d.tasks[0].done=true,d=>d.experiments[0].events.push({note:'new result'})]){
    const d=fixture(),o=opts(d);change(d);
    assert.throws(()=>R.deleteProject(d,target,o),/PROJECT_CHANGED/);
  }
});

test('new sharing links or evidence invalidate confirmation before cascade deletion',()=>{
  for(const change of [d=>d.projects[1].linked_experiment_ids.push('own'),d=>d.projects[1].evidence.push({sourceIds:['exp:own']})]){
    const d=fixture(),o=opts(d,{deleteExperiments:true});change(d);
    assert.throws(()=>R.deleteProject(d,target,o),/PROJECT_CHANGED/);
    const r=R.deleteProject(d,target,opts(d,{deleteExperiments:true}));
    assert.ok(r.data.experiments.some(e=>e.id==='own'));
  }
});

test('unrelated current edits do not invalidate confirmation and survive deletion',()=>{
  const d=fixture(),o=opts(d);d.tasks[1].title='Latest unrelated edit';d.summaries.push({id:'new',text:'Latest summary'});
  const r=R.deleteProject(d,target,o);
  assert.equal(r.data.tasks[1].title,'Latest unrelated edit');
  assert.equal(r.data.summaries.length,2);
});

test('a sparse project-only dataset can be deleted',()=>{
  const d={projects:[{id:target,title:'Empty project'}]},r=R.deleteProject(d,target,opts(d));
  assert.deepEqual(r.data,{projects:[],tasks:[],experiments:[]});
});

test('stale floating-window edits never resurrect deleted records',()=>{
  const base=L.migrate(fixture()),incoming=clone(base);
  incoming.projects[0].title='Stale title';incoming.tasks[0].done=true;incoming.experiments[0].notes='Stale notes';
  const current=R.deleteProject(base,target,opts(base,{deleteTasks:true,deleteExperiments:true})).data;
  const n=L.mergeSnapshot(current,base,incoming);
  assert.equal(n.projects.some(p=>p.id===target),false);
  assert.equal(n.tasks.some(t=>t.id==='task'),false);
  assert.equal(n.experiments.some(e=>e.id==='own'),false);
});

test('stale edits to retained results preserve detached links and independent additions',()=>{
  const base=L.migrate(fixture()),incoming=clone(base);
  incoming.tasks[0].result_note='Updated research result';incoming.tasks.push({id:'independent',title:'New task'});
  const current=R.deleteProject(base,target,opts(base)).data,n=L.mergeSnapshot(current,base,incoming),t=n.tasks.find(t=>t.id==='task');
  assert.equal(t.result_note,'Updated research result');assert.equal(t.project_id,null);assert.equal(t.analysis_step_id,'');
  assert.ok(n.tasks.some(t=>t.id==='independent'));
});

function desktop(failure) {
  const handlers={},calls=[],initial=L.migrate(fixture()),mainWindow={webContents:{mainFrame:{}}};
  const context={ipcMain:{handle:(name,fn)=>handlers[name]=fn},mainWindow,store:initial,ResearchCore:R,path,
    loadData:()=>{calls.push('load');return initial;},dataFile:()=>path.join(__dirname,'isolated','shixu-data.json'),
    fs:{mkdirSync:()=>calls.push('mkdir'),writeFileSync:(file,text,options)=>{calls.push({file,text,options});if(failure==='backup')throw new Error('EACCES');}},
    saveData:data=>{calls.push('save');if(failure==='save')throw new Error('ENOSPC');context.store=L.migrate(data);return context.store;},
    broadcast:(channel,data)=>calls.push({channel,data})};
  const source=fs.readFileSync(path.join(__dirname,'../electron/main.js'),'utf8');
  const start=source.indexOf("ipcMain.handle('shixu:project-deletion-plan'"),end=source.indexOf("ipcMain.handle('shixu:get-locale'",start);
  assert.ok(start>=0&&end>start);vm.runInNewContext(source.slice(start,end),context);
  return {context,initial,calls,event:{sender:mainWindow.webContents,senderFrame:mainWindow.webContents.mainFrame},plan:handlers['shixu:project-deletion-plan'],run:handlers['shixu:delete-project']};
}

test('desktop deletion rejects other windows and child frames',()=>{
  const h=desktop();
  for(const event of [{sender:{},senderFrame:h.event.senderFrame},{sender:h.event.sender,senderFrame:{}}]){
    assert.equal(h.plan(event,target).error,'INVALID_SENDER');
    assert.equal(h.run(event,target,opts(h.initial)).error,'INVALID_SENDER');
  }
  assert.equal(h.calls.length,0);
});

test('desktop validates options and reads the latest deletion plan',()=>{
  const h=desktop();
  for(const options of [undefined,null,{},'invalid'])assert.equal(h.run(h.event,target,options).error,'INVALID_DATA');
  h.context.store.tasks[0].done=true;
  assert.equal(h.plan(h.event,target).plan.fingerprint,R.projectDeletionPlan(h.context.store,target).fingerprint);
  assert.equal(h.calls.length,0);
});

test('desktop stale confirmation makes no writes',()=>{
  const h=desktop(),options=opts(h.initial);h.context.store.tasks[0].done=true;
  assert.equal(h.run(h.event,target,options).error,'PROJECT_CHANGED');assert.equal(h.calls.length,0);
});

test('desktop writes an exclusive original-data backup before saving and broadcasting',()=>{
  const h=desktop(),before=clone(h.initial),r=h.run(h.event,target,opts(h.initial,{deleteTasks:true,deleteExperiments:true}));
  assert.equal(r.ok,true);assert.equal(h.calls[0],'mkdir');
  assert.match(h.calls[1].file,/shixu-data\.json\.before-project-delete-.*\.json$/);
  assert.equal(h.calls[1].options.flag,'wx');assert.deepEqual(JSON.parse(h.calls[1].text),before);
  assert.equal(h.calls[2],'save');assert.equal(h.calls[3].channel,'shixu:updated');
  assert.equal(r.backupPath,h.calls[1].file);assert.equal(r.data.projects.length,1);
});

for(const failure of ['backup','save'])test('desktop '+failure+' failure preserves current records without broadcast',()=>{
  const h=desktop(failure),before=structuredClone(h.initial),r=h.run(h.event,target,opts(h.initial,{deleteTasks:true,deleteExperiments:true}));
  assert.equal(r.ok,false);assert.deepEqual(h.context.store,before);
  assert.equal(h.calls.some(c=>c&&c.channel==='shixu:updated'),false);
});
