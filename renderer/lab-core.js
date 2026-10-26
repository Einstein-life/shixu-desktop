/* Shared, deterministic workflow rules. Runs in Node and isolated renderers. */
(function(root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./research-core.js') : root.ResearchCore);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LabCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(ResearchCore) {
  'use strict';
  const clone = x => JSON.parse(JSON.stringify(x));
  const uid = () => 'lab_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  const finite = (x, fallback = 0) => Number.isFinite(Number(x)) ? Number(x) : fallback;
  const cleanId = id => typeof id === 'string' && /^[a-zA-Z0-9_.-]+$/.test(id) ? id : uid();
  function ensureIds(items, prefix) {
    const seen=new Set();
    return items.map(item=>{
      let id=cleanId(item.id);
      while(seen.has(id))id=prefix+'_'+uid();
      seen.add(id);
      return {...item,id};
    });
  }
  function normalizeExperiment(raw) {
    const e = raw && typeof raw === 'object' ? raw : {};
    const steps = ensureIds((Array.isArray(e.steps) ? e.steps : []).filter(s => s && typeof s === 'object').map(s => ({
      ...s, id: cleanId(s.id), title: String(s.title || ''), kind: s.kind === 'wait' ? 'wait' : 'active',
      minutes: Math.max(0.01, Math.min(525600, finite(s.minutes, 10))),
      tolerance: Math.max(0, Math.min(10080, finite(s.tolerance, 0))),
      status: ['pending','running','done'].includes(s.status) ? s.status : 'pending',
      startedAt: s.startedAt && Number.isFinite(Date.parse(s.startedAt)) ? s.startedAt : null,
      dueAt: s.dueAt && Number.isFinite(Date.parse(s.dueAt)) ? s.dueAt : null,
      completedAt: s.completedAt || null
    })), 'step');
    return { ...e, id: cleanId(e.id), title: String(e.title || ''), sample: String(e.sample || ''),
      project_id: e.project_id || null, lot: String(e.lot || ''), equipment: String(e.equipment || ''),
      notes: String(e.notes || ''), steps, createdAt: e.createdAt || new Date().toISOString(),
      artifacts: ResearchCore.normalizeArtifacts(e.artifacts),
      checklist: ensureIds((Array.isArray(e.checklist) ? e.checklist : []).filter(c => c && typeof c === 'object').map(c => ({id:cleanId(c.id), text:String(c.text || ''), done:!!c.done})), 'check'),
      events: Array.isArray(e.events) ? e.events : [], completedAt: e.completedAt || null };
  }
  function migrate(raw) {
    if (Array.isArray(raw)) raw = { tasks: raw };
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.tasks)) throw new Error('INVALID_DATA');
    for (const key of ['projects','summaries','experiments']) {
      if (raw[key] !== undefined && !Array.isArray(raw[key])) throw new Error('INVALID_DATA');
    }
    if (raw.tasks.some(t => !t || typeof t !== 'object') || (raw.projects || []).some(p => !p || typeof p !== 'object') || (raw.summaries || []).some(s => !s || typeof s !== 'object') || (raw.experiments || []).some(e => !e || typeof e !== 'object')) throw new Error('INVALID_DATA');
    for(const e of raw.experiments || []) {
      ResearchCore.validateProject({artifacts:e.artifacts});
      if((e.steps!==undefined&&!Array.isArray(e.steps))||(e.checklist!==undefined&&!Array.isArray(e.checklist))||(e.events!==undefined&&!Array.isArray(e.events)))throw new Error('INVALID_DATA');
      if((e.steps||[]).some(s=>!s||typeof s!=='object')||(e.checklist||[]).some(c=>!c||typeof c!=='object'))throw new Error('INVALID_DATA');
    }
    (raw.projects || []).forEach(ResearchCore.validateProject);
    const projects=ensureIds(clone(raw.projects || []),'p').map(p=>({
      ...ResearchCore.normalizeProject(p),
      milestones:Array.isArray(p.milestones)?ensureIds(p.milestones,'m'):p.milestones
    }));
    return { ...raw, version:4, slot:raw.slot || '60', capacity_hours:finite(raw.capacity_hours,6),
      tasks:ensureIds(clone(raw.tasks),'t'), projects, summaries:ensureIds(clone(raw.summaries || []),'s'),
      experiments:ensureIds((raw.experiments || []).map(normalizeExperiment),'e') };
  }
  function empty() { return migrate({tasks:[],projects:[],summaries:[],experiments:[]}); }
  function currentStep(e) { return e.steps.find(s => s.status !== 'done') || null; }
  function timing(step, now = Date.now()) {
    if (!step || step.status !== 'running' || !step.dueAt) return {phase:'idle', remaining:0};
    const remaining = Date.parse(step.dueAt) - now;
    return { remaining, phase:remaining > 0 ? 'running' : remaining >= -step.tolerance*60000 ? 'due' : 'late' };
  }
  function transition(experiment, action, now = Date.now(), detail = '') {
    const e = normalizeExperiment(clone(experiment));
    const step = currentStep(e);
    if (!step) throw new Error('FINISHED');
    const at = new Date(now).toISOString();
    if (action === 'start') {
      if (step.status !== 'pending') throw new Error('ALREADY_RUNNING');
      if (e.checklist.some(c => !c.done)) throw new Error('CHECKLIST_REQUIRED');
      step.status = 'running'; step.startedAt = at;
      step.dueAt = new Date(now + step.minutes * 60000).toISOString();
    } else if (action === 'complete') {
      if (step.status !== 'running') throw new Error('NOT_RUNNING');
      step.status = 'done'; step.completedAt = at;
      if (e.steps.every(s => s.status === 'done')) e.completedAt = at;
    } else if (action === 'cancel') {
      if (step.status !== 'running') throw new Error('NOT_RUNNING');
      step.status = 'pending'; step.startedAt = null; step.dueAt = null;
    } else throw new Error('INVALID_ACTION');
    e.events.push({id:uid(), at, action, stepId:step.id, stepTitle:step.title, detail:String(detail)});
    return e;
  }
  function recommendations(data, now = Date.now()) {
    const running = data.experiments.map(e => ({e, s:currentStep(e)})).filter(x => x.s?.status === 'running');
    const due = running.filter(x => timing(x.s,now).phase !== 'running').sort((a,b)=>Date.parse(a.s.dueAt)-Date.parse(b.s.dueAt));
    const waiting = running.filter(x => x.s.kind === 'wait');
    const active = running.filter(x => x.s.kind === 'active');
    const next = running.map(x=>Date.parse(x.s.dueAt)).sort((a,b)=>a-b)[0];
    const minutes = next === undefined ? null : Math.max(0, Math.floor((next-now)/60000)-2);
    const effort = {m15:15,m30:30,h1:60,h2:120,half:210,day:480};
    const tasks = due.length || active.length ? [] : data.tasks.filter(t => !t.done && !t.run_state && !t.blocker && (minutes === null || (effort[t.effort] || 60) <= minutes)).sort((a,b)=>(b.score||0)-(a.score||0));
    return {due, waiting, active, minutes, tasks};
  }
  function dilution(stock, target, volume) {
    stock=Number(stock); target=Number(target); volume=Number(volume);
    if (![stock,target,volume].every(x=>Number.isFinite(x)&&x>0) || target>stock) throw new Error('INVALID_DILUTION');
    const stockVolume=target*volume/stock;
    return {stockVolume, solventVolume:volume-stockVolume};
  }
  function masterMix(reactions, extraPercent, components) {
    reactions=Number(reactions); extraPercent=Number(extraPercent);
    if (!Number.isInteger(reactions)||reactions<1||reactions>100000||!Number.isFinite(extraPercent)||extraPercent<0||extraPercent>100||!Array.isArray(components)||!components.length) throw new Error('INVALID_MIX');
    const factor=reactions*(1+extraPercent/100);
    const rows=components.map(c=>{
      const volume=Number(c.volume);
      if (!String(c.name || '').trim()||!Number.isFinite(volume)||volume<=0) throw new Error('INVALID_MIX');
      return {name:String(c.name), volume, total:volume*factor};
    });
    return {factor, rows, total:rows.reduce((s,r)=>s+r.total,0)};
  }
  // Three-way merge: a dock edit must not erase a newer experiment or another window's edits.
  function mergeSnapshot(current, base, incoming) {
    const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
    const out = clone(current);
    const collections = ['tasks','projects','summaries','experiments'];
    for (const key of Object.keys(incoming)) {
      if (['__proto__','prototype','constructor','version'].includes(key)) continue;
      if (collections.includes(key)) {
        if (!Array.isArray(incoming[key])) continue;
        const prev = new Map((base[key] || []).map(x=>[x.id,x]));
        const next = new Map(incoming[key].map(x=>[x.id,x]));
        const live = new Map((current[key] || []).map(x=>[x.id,clone(x)]));
        for (const id of prev.keys()) if (!next.has(id) && equal(live.get(id),prev.get(id))) live.delete(id);
        for (const [id, value] of next) {
          if (equal(prev.get(id),value)) continue;
          if (!prev.has(id)) live.set(id,clone(value));
          else if (live.has(id)) {
            const merged=live.get(id);
            for (const field of Object.keys(value)) {
              if (['__proto__','prototype','constructor'].includes(field)) continue;
              if (!equal(prev.get(id)[field],value[field])) merged[field]=clone(value[field]);
            }
          } else live.set(id,clone(value));
        }
        // Keep the submitting snapshot's order (new experiments are prepended
        // by the editor), then retain concurrent records not in that snapshot.
        out[key]=[
          ...Array.from(next.keys()).filter(id=>live.has(id)).map(id=>live.get(id)),
          ...Array.from(live.entries()).filter(([id])=>!next.has(id)).map(([,value])=>value)
        ];
      } else if (!equal(base[key],incoming[key])) out[key]=clone(incoming[key]);
    }
    return migrate(out);
  }
  return {uid, cleanId, normalizeExperiment, migrate, empty, currentStep, timing, transition, recommendations, dilution, masterMix, mergeSnapshot};
});
