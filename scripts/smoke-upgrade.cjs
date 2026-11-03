// Uses only an explicitly supplied isolated profile and synthetic records.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const Lab=require('../renderer/lab-core.js');
const Plants=require('../renderer/plant-examples.js');
const [mode,first,second,third]=process.argv.slice(2);
const profile=path.resolve(mode==='prepare'?first:second);
const file=path.join(profile,'shixu-data.json');
const canonical=value=>{if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;};
function capture(data){
 return canonical({
  tasks:data.tasks.map(t=>({id:t.id,title:t.title,done:!!t.done,run_state:t.run_state||'',project_id:t.project_id||null,result_note:t.result_note||'',wait_note:t.wait_note||''})),
  projects:data.projects.map(p=>({id:p.id,title:p.title,summary:p.summary,research_context:p.research_context,artifacts:p.artifacts,milestones:p.milestones,evidence:p.evidence,linked_experiment_ids:p.linked_experiment_ids})),
  experiments:data.experiments.map(e=>({id:e.id,title:e.title,sample:e.sample,lot:e.lot,equipment:e.equipment,notes:e.notes,project_id:e.project_id,artifacts:e.artifacts,checklist:e.checklist,steps:e.steps})),
  summaries:data.summaries
 });
}
async function main(){
 if(mode==='prepare'){
  if(fs.existsSync(file))throw Error('Refusing to replace an existing profile');
  fs.mkdirSync(profile,{recursive:true});
  const data=Lab.migrate(Plants.create('en',Date.parse('2026-11-02T01:00:00Z')));
  data.tasks[0].title='Upgrade retention check / 保留任务';
  data.tasks[0].run_state='waiting';data.tasks[0].wait_note='Retain waiting note';
  data.tasks[1].run_state='ready';data.tasks[1].result_note='Retain result note';
  data.projects[0].summary='Retain edited project summary';
  data.projects[0].research_context.question='Retain edited research question';
  data.experiments[0].notes='Retain edited experiment observations';
  data.summaries=[{id:'upgrade-review',text:'Retain weekly review'}];
  const linkedFile=path.join(profile,'linked-evidence.txt');fs.writeFileSync(linkedFile,'Synthetic evidence file retained across upgrade.');
  data.projects[0].artifacts[0].path=linkedFile;data.projects[0].artifacts[0].type='file';
  fs.writeFileSync(file,JSON.stringify(data,null,2));
  fs.writeFileSync(path.join(profile,'expected-records.json'),JSON.stringify(capture(data),null,2));
  const settings={locale:'en',dockVisible:false,autoStart:false,dockDisplayMode:'edge',dockBallPosition:{x:347,y:263}};
  fs.writeFileSync(path.join(profile,'shixu-settings.json'),JSON.stringify(settings));
  fs.writeFileSync(path.join(profile,'expected-settings.json'),JSON.stringify(settings));
  console.log('Prepared isolated synthetic upgrade profile');return;
 }
 if(mode!=='check')throw Error('Use prepare PROFILE or check EXECUTABLE PROFILE REPORT');
 const exe=path.resolve(first),report=path.resolve(third);
 if(!fs.existsSync(file)||!fs.existsSync(exe))throw Error('Missing profile or executable');
 const env={...process.env,SHIXU_DATA_DIR:profile};delete env.ELECTRON_RUN_AS_NODE;
 const child=spawn(exe,[],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
 let exited=false,exitCode=null,spawnError=null,output='';
 child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
 child.on('error',err=>{spawnError=err;});child.on('exit',code=>{exited=true;exitCode=code;});
 try{
  await new Promise(resolve=>setTimeout(resolve,6000));
  if(spawnError)throw spawnError;if(exited)throw Error('Application exited: '+exitCode+' '+output.slice(-1500));
  const expected=JSON.parse(fs.readFileSync(path.join(profile,'expected-records.json'),'utf8'));
  const actual=JSON.parse(fs.readFileSync(file,'utf8'));assert.deepEqual(capture(actual),expected);
  const expectedSettings=JSON.parse(fs.readFileSync(path.join(profile,'expected-settings.json'),'utf8'));
  const actualSettings=JSON.parse(fs.readFileSync(path.join(profile,'shixu-settings.json'),'utf8'));
  assert.deepEqual(canonical(actualSettings),canonical(expectedSettings));
  assert.equal(fs.readFileSync(path.join(profile,'linked-evidence.txt'),'utf8'),'Synthetic evidence file retained across upgrade.');
  fs.mkdirSync(path.dirname(report),{recursive:true});
  fs.writeFileSync(report,JSON.stringify({started:true,recordsRetained:true,settingsRetained:true,dockBallPositionRetained:actualSettings.dockBallPosition.x===347&&actualSettings.dockBallPosition.y===263,externalFileRetained:true,syntheticData:true,projects:actual.projects.length,tasks:actual.tasks.length,experiments:actual.experiments.length,checkedAt:new Date().toISOString(),limits:'Tests process survival and selected records using an isolated profile; no real user profile is touched.'},null,2)+String.fromCharCode(10));
  console.log('Application started and synthetic records retained');
 }finally{child.kill();await new Promise(resolve=>{if(exited)return resolve();child.once('exit',resolve);setTimeout(resolve,3000);});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
