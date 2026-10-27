const test=require('node:test');
const assert=require('node:assert/strict');
const R=require('../renderer/research-core.js');
const C=require('../renderer/lab-core.js');

test('workflow instances keep editable output and QC guidance, with independent step IDs',()=>{
  for(const template of R.templates){
    const a=R.instantiate(template.id,'en'),b=R.instantiate(template.id,'zh-CN');
    assert.ok(a.steps.length>=4);
    assert.ok(a.steps.every(s=>s.title&&s.output&&s.qc&&s.status==='pending'));
    assert.ok(!/[\u3400-\u9fff]/.test(JSON.stringify(a)));
    assert.ok(b.steps.every(s=>!a.steps.some(x=>x.id===s.id)));
    a.steps[0].note='A custom design';
    assert.equal(R.instantiate(template.id,'en').steps[0].note,'');
  }
});

test('legacy projects migrate with research defaults without changing milestones or summaries',()=>{
  const input={tasks:[],projects:[{id:'p',title:'Old project',summary:'An existing finding',milestones:[{id:'m',title:'Draft',done:true}]}]};
  const p=C.migrate(input).projects[0];
  assert.deepEqual(p.milestones,input.projects[0].milestones);
  assert.equal(p.summary,'An existing finding');
  assert.deepEqual(p.analysis_workflow.steps,[]);
  assert.deepEqual(p.artifacts,[]);
  assert.equal(p.research_context.question,'');
  assert.equal(input.projects[0].artifacts,undefined);
});

test('research records, step evidence and linked files survive migration and JSON round trips',()=>{
  const workflow=R.instantiate('rnaseq','en');workflow.steps[1].status='done';workflow.steps[1].note='QC review: failed';workflow.steps[1].updatedAt='2026-10-20T00:00:00.000Z';
  const p={id:'p',title:'Expression study',analysis_workflow:workflow,research_context:{reference:'Genome v3; annotation v3',parameters:'design = ~ batch + condition'},artifacts:[{id:'a',name:'MultiQC',path:'D:\\analysis results\\multiqc.html',type:'file',stepId:workflow.steps[1].id,note:'Two samples excluded; see sample sheet'}]};
  const out=C.migrate(JSON.parse(JSON.stringify(C.migrate({tasks:[],projects:[p]})))).projects[0];
  assert.deepEqual(out.analysis_workflow,p.analysis_workflow);
  assert.equal(out.artifacts[0].stepId,workflow.steps[1].id);
  assert.equal(out.research_context.parameters,p.research_context.parameters);
  const text=R.markdown(out,'en');
  for(const fragment of ['QC review: failed','Genome v3','Two samples excluded','Raw data QC','D:\\analysis results\\multiqc.html'])assert.ok(text.includes(fragment),fragment);
  assert.ok(!/[\u3400-\u9fff]/.test(text));
});

test('a floating panel update retains project evidence created in the main window',()=>{
  const base=C.migrate({tasks:[{id:'t',done:false}],projects:[{id:'p',title:'Study'}]});
  const current=structuredClone(base);current.projects[0].analysis_workflow=R.instantiate('atacseq','en');current.projects[0].artifacts=[{id:'a',name:'PCA',path:'/data/pca.pdf',note:'Batch effect'}];
  const incoming=structuredClone(base);incoming.tasks[0].done=true;
  const merged=C.mergeSnapshot(current,base,incoming);
  assert.equal(merged.projects[0].artifacts[0].note,'Batch effect');
  assert.equal(merged.projects[0].analysis_workflow.id,'atacseq');
  assert.equal(merged.tasks[0].done,true);
});

test('malformed imported research records are rejected rather than silently discarded',()=>{
  for(const bad of [{artifacts:{}},{artifacts:[null]},{analysis_workflow:[]},{analysis_workflow:{steps:{}}},{analysis_workflow:{steps:[null]}}])assert.throws(()=>C.migrate({tasks:[],projects:[{id:'p',...bad}]}),{message:'INVALID_DATA'});
});

test('artifact targets accept web/local/remote references and reject executable URL schemes',()=>{
  for(const path of ['D:\\report file.html','/Users/researcher/results','\\\\server\\share\\report.pdf'])assert.equal(R.target(path).kind,'local',path);
  assert.equal(R.target('https://example.org/report?q=1').kind,'web');
  assert.equal(R.target('user@cluster:/project/run').kind,'remote');
  for(const path of ['javascript:alert(1)','file:///C:/tool.exe','data:text/html,test','https://name:secret@example.org','relative/results','https://','/data\nrm -rf'])assert.equal(R.target(path).kind,'invalid',path);
});

test('research plan drafts use saved evidence and mark missing details instead of inventing findings',()=>{
  const p={title:'Study',analysis_workflow:R.instantiate('rnaseq','en'),research_context:{question:'Does treatment change expression?',conclusion:'No preliminary results yet.'},milestones:[{title:'Pilot analysis',deadline:'2026-11-01'}],artifacts:[{name:'Design',path:'/data/design.tsv',note:'Three biological replicates per group'}]};
  const text=R.proposal(p,'en');
  for(const fragment of ['Does treatment change expression?','No preliminary results yet.','To be specified','Three biological replicates per group','Pilot analysis','2026-11-01','Expected output','Quality control and risk review'])assert.ok(text.includes(fragment),fragment);
  assert.ok(!/[\u3400-\u9fff]/.test(text));
});
