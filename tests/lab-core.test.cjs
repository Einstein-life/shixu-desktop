const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../renderer/lab-core.js');

test('v1 data migrates without losing tasks, projects, summaries, or IDs', () => {
  const v1={version:3,slot:'30',capacity_hours:4,tasks:[{id:'t_1',title:'PCR',cat:'wetlab',time_spent:1.25}],projects:[{id:'p_1',title:'Study'}],summaries:[{text:'week'}]};
  const migrated=C.migrate(v1);
  assert.equal(migrated.version,4);
  assert.deepEqual(migrated.experiments,[]);
  assert.equal(migrated.tasks[0].id,'t_1');
  assert.equal(migrated.tasks[0].time_spent,1.25);
  assert.equal(migrated.projects[0].title,'Study');
  assert.equal(migrated.summaries[0].text,'week');
});

test('a readiness checklist gates starting, but never certifies experimental success', () => {
  const e=C.normalizeExperiment({id:'e',title:'Run',checklist:[{id:'c1',text:'Verify labels'}],steps:[{id:'s',title:'Incubate',kind:'wait',minutes:20}]});
  assert.throws(()=>C.transition(e,'start',1000000),{message:'CHECKLIST_REQUIRED'});
  e.checklist[0].done=true;
  const started=C.transition(e,'start',1000000);
  assert.equal(Date.parse(started.steps[0].dueAt),2200000);
  const complete=C.transition(started,'complete',2200000);
  assert.equal(complete.steps[0].status,'done');
  assert.equal(complete.completedAt,new Date(2200000).toISOString());
  assert.equal(complete.qc_passed,undefined);
});

test('timer state survives migration and distinguishes running, due, and late', () => {
  const data=C.migrate({tasks:[],experiments:[{id:'e',steps:[{id:'s',title:'Wait',status:'running',minutes:5,tolerance:2,startedAt:'2026-01-01T00:00:00.000Z',dueAt:'2026-01-01T00:05:00.000Z'}]}]});
  const s=data.experiments[0].steps[0];
  assert.equal(C.timing(s,Date.parse('2026-01-01T00:04:00Z')).phase,'running');
  assert.equal(C.timing(s,Date.parse('2026-01-01T00:06:00Z')).phase,'due');
  assert.equal(C.timing(s,Date.parse('2026-01-01T00:08:01Z')).phase,'late');
});

test('waiting recommendations fit before next hand-on step and reserve a return buffer', () => {
  const due=new Date(40*60000).toISOString();
  const data=C.migrate({
    experiments:[{id:'e',title:'Experiment',steps:[{id:'s',title:'Next action',kind:'wait',status:'running',minutes:40,startedAt:new Date(0).toISOString(),dueAt:due}]}],
    tasks:[{id:'fit',title:'Quick task',effort:'m30',score:15},{id:'no-fit',title:'Too long',effort:'h1',score:20}]
  });
  const r=C.recommendations(data,0);
  assert.equal(r.minutes,38);
  assert.deepEqual(r.tasks.map(t=>t.id),['fit']);
});

test('all overdue timers are surfaced and no task is suggested over a running hands-on step', () => {
  const data=C.migrate({
    experiments:[{id:'e',title:'Experiment',steps:[{id:'s',title:'Mix',kind:'active',status:'running',minutes:1,startedAt:new Date(0).toISOString(),dueAt:new Date(60000).toISOString()}]}],
    tasks:[{id:'t',title:'Task',effort:'m15',score:20}]
  });
  const r=C.recommendations(data,100000);
  assert.equal(r.due.length,1);
  assert.equal(r.tasks.length,0);
});

test('field-level merge preserves simultaneous changes in separate windows', () => {
  const base=C.migrate({tasks:[{id:'t',title:'Task',done:false}],experiments:[{id:'e',title:'PCR',sample:'S1',steps:[{id:'s',title:'Wait',status:'pending',minutes:10}]}]});
  const current=structuredClone(base);
  current.experiments[0].sample='S2';
  current.tasks[0].title='Renamed by board';
  const incoming=structuredClone(base);
  incoming.experiments[0].steps[0].status='done';
  const merged=C.mergeSnapshot(current,base,incoming);
  assert.equal(merged.experiments[0].sample,'S2');
  assert.equal(merged.experiments[0].steps[0].status,'done');
  assert.equal(merged.tasks[0].title,'Renamed by board');
});

test('concurrent updates keep a remotely edited record when another window deletes it', () => {
  const base=C.migrate({tasks:[{id:'t',title:'Task',done:false}]});
  const current=structuredClone(base); current.tasks[0].done=true;
  const incoming=structuredClone(base); incoming.tasks=[];
  assert.equal(C.mergeSnapshot(current,base,incoming).tasks[0].done,true);
});

test('dilution formula handles same-unit volumes and rejects invalid concentration inputs', () => {
  assert.deepEqual(C.dilution(10,1,100),{stockVolume:10,solventVolume:90});
  assert.throws(()=>C.dilution(1,2,100),{message:'INVALID_DILUTION'});
});

test('master mix includes entered excess and rejects invalid rows', () => {
  const result=C.masterMix(10,10,[{name:'Buffer',volume:5},{name:'Enzyme',volume:1}]);
  assert.equal(result.factor,11);
  assert.deepEqual(result.rows.map(r=>r.total),[55,11]);
  assert.equal(result.total,66);
  assert.throws(()=>C.masterMix(0,10,[{name:'Buffer',volume:5}]),{message:'INVALID_MIX'});
});

test('import migration validates collections instead of silently dropping malformed data', () => {
  assert.throws(()=>C.migrate({tasks:[],experiments:{}}),{message:'INVALID_DATA'});
  assert.throws(()=>C.migrate({tasks:[null]}),{message:'INVALID_DATA'});
  assert.throws(()=>C.migrate({tasks:[],experiments:[{steps:[null]}]}),{message:'INVALID_DATA'});
});
