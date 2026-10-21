const test=require('node:test');
const assert=require('node:assert/strict');
const R=require('../renderer/research-core.js');
const C=require('../renderer/lab-core.js');

function fixture(){return C.migrate({tasks:[],projects:[{id:'p',title:'Study',milestones:[{id:'m',title:'Validate',done:false}],artifacts:[{id:'f',name:'DE table',path:'/results/de.tsv'}],evidence:[{id:'claim',kind:'finding',title:'Expression response',detail:'Needs validation',sourceIds:['exp:e','exp:e:file:gel','f']},{id:'next',kind:'next_step',title:'Validate in a second batch',detail:'Use independent biological replicates',sourceIds:['exp:e']}]}],experiments:[{id:'e',project_id:'p',title:'Validation PCR',sample:'S1/S2',lot:'L1',equipment:'PCR1',notes:'No amplification in sample S2',artifacts:[{id:'gel',name:'Gel image',path:'/results/gel.png'}],steps:[{id:'s',title:'Amplify',kind:'wait',status:'running',minutes:20,startedAt:'2026-10-20T00:00:00Z',dueAt:'2026-10-20T00:20:00Z'}],events:[]} ]});}

test('experiments linked by project or explicit reference provide deduplicated live evidence',()=>{
  const d=fixture(),p=d.projects[0];p.linked_experiment_ids=['e','extra'];
  d.experiments.push(C.normalizeExperiment({id:'extra',project_id:'other',title:'Supporting assay',notes:'An independent observation'}));
  const e=R.analysisEvidence(p,d.experiments);
  assert.deepEqual(e.linkedExperimentIds,['e','extra']);
  assert.equal(e.sources.filter(s=>s.id==='exp:e').length,1);
  assert.equal(e.sources.find(s=>s.id==='exp:e:file:gel').path,'/results/gel.png');
  assert.equal(e.items.length,2); // adding an experiment must not fabricate a conclusion
  d.experiments[0].notes='Revised after review';
  assert.equal(R.analysisEvidence(p,d.experiments).sources.find(s=>s.id==='exp:e').detail,'Revised after review');
  assert.equal(p.evidence[0].detail,'Needs validation');
  assert.equal(p.milestones[0].done,false);
});

test('research records and experiment result files survive JSON import with timer and history intact',()=>{
  const d=fixture(),before=structuredClone(d.experiments[0].steps);
  d.experiments[0].notes='Updated observation';d.experiments[0].events.push({id:'note',action:'note',detail:'Updated observation'});
  const saved=C.migrate(JSON.parse(JSON.stringify(d)));
  assert.deepEqual(saved.experiments[0].steps,before);
  assert.equal(saved.experiments[0].events[0].action,'note');
  assert.deepEqual(saved.projects[0].evidence[0].sourceIds,['exp:e','exp:e:file:gel','f']);
  assert.equal(saved.experiments[0].artifacts[0].id,'gel');
  assert.equal(saved.projects[0].evidence[1].kind,'next_step');
});

test('unlinking, deletion or reassignment surfaces missing sources without silently removing provenance',()=>{
  const d=fixture(),p=d.projects[0];p.linked_experiment_ids=['e'];
  let out=R.analysisEvidence(p,[]);
  assert.deepEqual(out.missingExperimentIds,['e']);
  assert.deepEqual(out.items[0].missingSourceIds,['exp:e','exp:e:file:gel']);
  assert.deepEqual(out.items[0].sourceIds,p.evidence[0].sourceIds);
  p.linked_experiment_ids=[];d.experiments[0].project_id='different';
  out=R.analysisEvidence(p,d.experiments);
  assert.equal(out.linkedExperimentIds.length,0);
  assert.ok(out.items[0].missingSourceIds.includes('exp:e'));
});

test('project and proposal exports include live experiment evidence and action provenance in both languages',()=>{
  const d=fixture(),p=d.projects[0];
  for(const lang of ['en','zh-CN'])for(const render of [R.markdown,R.proposal]){
    const text=render(p,lang,d.experiments);
    for(const fragment of ['Validation PCR','No amplification in sample S2','/results/gel.png','S1/S2','L1','PCR1','Validate in a second batch','Use independent biological replicates','DE table'])assert.ok(text.includes(fragment),fragment);
    if(lang==='en')assert.ok(!/[\u3400-\u9fff]/.test(text));
    const stages=[...text.matchAll(/^## ([1-5])\./gm)].map(x=>x[1]);
    assert.deepEqual(stages,['1','2','3','4','5']);
    assert.ok(text.indexOf('No amplification in sample S2')<text.indexOf('## 4.'));
    assert.ok(text.indexOf('Validate in a second batch')>text.indexOf('## 5.'));
  }
});

test('simultaneous project evidence and experiment-result edits survive the existing window merge',()=>{
  const base=fixture(),main=structuredClone(base),lab=structuredClone(base);
  main.projects[0].evidence[0].detail='Pilot conclusion';lab.experiments[0].notes='New laboratory result';
  const out=C.mergeSnapshot(main,base,lab);
  assert.equal(out.projects[0].evidence[0].detail,'Pilot conclusion');
  assert.equal(R.analysisEvidence(out.projects[0],out.experiments).sources.find(s=>s.id==='exp:e').detail,'New laboratory result');
});

test('malformed evidence and experiment attachments are rejected; legacy notes remain readable',()=>{
  for(const patch of [{evidence:{}},{evidence:[null]},{evidence:[{sourceIds:'e'}]},{evidence:[{sourceIds:[1]}]},{linked_experiment_ids:[{}]}])assert.throws(()=>C.migrate({tasks:[],projects:[{id:'p',...patch}]}),{message:'INVALID_DATA'});
  assert.throws(()=>C.migrate({tasks:[],experiments:[{id:'e',artifacts:{}}]}),{message:'INVALID_DATA'});
  const d=C.migrate({tasks:[],projects:[{id:'p',summary:'Legacy summary',research_context:{conclusion:'Legacy interpretation'}}],experiments:[{id:'e',project_id:'p',notes:'Legacy results'}]});
  assert.equal(d.projects[0].summary,'Legacy summary');
  assert.equal(d.projects[0].research_context.conclusion,'Legacy interpretation');
  assert.equal(R.analysisEvidence(d.projects[0],d.experiments).sources[0].detail,'Legacy results');
});
