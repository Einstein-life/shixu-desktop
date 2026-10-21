(function(){
  'use strict';
  const R=window.ResearchCore,en=document.documentElement.lang==='en',L=(zh,eng)=>en?eng:zh;
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const kinds={finding:L('结果结论','Finding'),limitation:L('局限 / 相反证据','Limitation / conflicting evidence'),next_step:L('下一步行动','Next action')};
  const states={planned:L('计划中','Planned'),in_progress:L('进行中','In progress'),done:L('已完成','Done'),blocked:L('受阻','Blocked')};
  const sourceKinds={artifact:L('项目文件','Project file'),analysis_step:L('分析步骤','Analysis step'),experiment:L('实验结果','Experiment result'),experiment_file:L('实验文件','Experiment file')};
  function row(x,sources){
    const missing=x.sourceIds.filter(id=>!sources.some(s=>s.id===id));
    return `<article class="research-evidence-row" data-evidence-id="${esc(x.id)}"><div class="lab-grid"><label>${L('记录类型','Record type')}<select data-e-kind>${Object.entries(kinds).map(([v,label])=>`<option value="${v}" ${x.kind===v?'selected':''}>${label}</option>`).join('')}</select></label><label>${L('行动进度','Action status')}<select data-e-status>${Object.entries(states).map(([v,label])=>`<option value="${v}" ${x.status===v?'selected':''}>${label}</option>`).join('')}</select></label></div><label>${L('简短标题','Short title')}<input data-e-title value="${esc(x.title)}"></label><label>${L('内容、局限与决策依据','Details, limitations and rationale')}<textarea data-e-detail rows="3">${esc(x.detail)}</textarea></label><fieldset class="research-source-list"><legend>${L('关联依据（可多选）','Link evidence (select any)')}</legend>${sources.map(s=>`<label class="research-source-choice"><input type="checkbox" data-e-source="${esc(s.id)}" ${x.sourceIds.includes(s.id)?'checked':''}><span><b>${sourceKinds[s.kind]}:</b> <span data-user-copy>${esc(s.title)}</span>${s.detail?`<small data-user-copy>${esc(s.detail)}</small>`:''}</span></label>`).join('')||`<p class="research-hint">${L('先添加分析步骤、实验或结果文件，再点“刷新证据来源”。','Add an analysis step, experiment or file, then select Refresh evidence sources.')}</p>`}${missing.map(id=>`<label class="research-source-choice research-warning"><input type="checkbox" data-e-source="${esc(id)}" checked><span>${L('来源已移除，请复核','Source removed; review required')} (${esc(id)})</span></label>`).join('')}</fieldset><div class="research-actions">${x.kind==='next_step'?`<button type="button" class="btn btn-soft btn-mini" data-e-task="${esc(x.id)}">${L('生成今日事项','Create task for today')}</button>`:''}<button type="button" class="btn btn-danger-ghost btn-mini" data-e-remove="${esc(x.id)}">${L('删除记录','Remove record')}</button></div></article>`;
  }
  function experimentPanel(p,experiments){
    const e=R.analysisEvidence(p,experiments),linked=new Set(e.linkedExperimentIds);
    const candidates=experiments.filter(x=>x.project_id!==p.id);
    return `<div class="research-experiment-panel"><h4>${L('实验结果与原始文件','Experiment results and raw files')}</h4><p class="research-hint">${L('实验的“关联项目”指向本项目时，结果自动显示在这里并随原记录更新。也可勾选其他实验作为补充依据；这不会改变实验原项目。','Results appear automatically when an experiment is assigned to this project and stay linked to the original record. Select other experiments as additional evidence without changing their project.')}</p><details class="research-exp-picker"><summary>${L('选择补充关联的实验','Select additional experiments')}</summary>${candidates.map(x=>`<label class="research-source-choice"><input type="checkbox" data-link-experiment="${esc(x.id)}" ${p.linked_experiment_ids.includes(x.id)?'checked':''}><span data-user-copy>${esc(x.title)}${x.sample?' · '+esc(x.sample):''}</span></label>`).join('')||`<p>${L('暂无其他实验','No other experiments')}</p>`}${e.missingExperimentIds.map(id=>`<label class="research-source-choice research-warning"><input type="checkbox" data-link-experiment="${esc(id)}" checked><span>${L('关联实验已不存在','Linked experiment unavailable')} (${esc(id)})</span></label>`).join('')}</details>${experiments.filter(x=>linked.has(x.id)).map(x=>`<article class="research-linked-exp"><strong data-user-copy>${esc(x.title)}</strong><p class="research-hint">${L('样本 / 批次','Sample / batch')}: <span data-user-copy>${esc(x.sample||'—')}</span> · ${L('已完成步骤','Completed steps')}: ${(x.steps||[]).filter(s=>s.status==='done').length}/${(x.steps||[]).length}</p><p data-user-copy>${esc(x.notes||L('尚未记录实验结果','No experiment results recorded yet'))}</p>${(x.artifacts||[]).map(a=>`<div class="research-source-file"><strong data-user-copy>${esc(a.name||a.path)}</strong><code data-user-copy>${esc(a.path)}</code><small data-user-copy>${esc(a.note)}</small><button type="button" class="btn btn-ghost btn-mini" data-open-exp-file="${esc(x.id)}" data-exp-file="${esc(a.id)}">${L('查看位置 / 打开链接','Show location / open link')}</button></div>`).join('')}<button type="button" class="btn btn-ghost btn-mini" data-open-experiment="${esc(x.id)}">${L('查看 / 编辑实验记录','View / edit experiment record')}</button></article>`).join('')||`<p class="research-hint">${L('尚未关联实验；可在“实验执行 → 记录结果”中选择本项目。','No linked experiments. Choose this project in Lab bench → Record results.')}</p>`}<button type="button" class="btn btn-ghost btn-mini" data-e-refresh>${L('刷新证据来源','Refresh evidence sources')}</button></div>`;
  }
  function mount(dialog,p,hooks){
    const form=dialog.querySelector('form'),context=dialog.querySelector('.research-context');
    const headings=[...form.querySelectorAll('h3')];
    const workflow=headings[0],files=headings[1],summary=form.querySelector('#researchSummary').closest('label');
    const stage=(n,title)=>{const h=document.createElement('h3');h.className='research-stage-heading';h.innerHTML=`<span>${n}</span>${title}`;return h;};
    context.before(stage(1,L('研究问题','Research question')));
    workflow.className='research-stage-heading';workflow.innerHTML=`<span>2</span>${L('分析流程','Analysis workflow')}`;
    files.className='research-stage-heading';files.innerHTML=`<span>3</span>${L('结果证据','Result evidence')}`;
    files.insertAdjacentHTML('afterend',experimentPanel(p,hooks.getExperiments()));
    const evidence=R.analysisEvidence(p,hooks.getExperiments());
    const controls=(kind,title)=>`<button type="button" class="btn btn-soft btn-mini" data-e-add="${kind}">${title}</button>`;
    const resultRows=document.createElement('section');resultRows.className='research-evidence-group';resultRows.innerHTML=`<h4>${L('结果结论与局限','Findings and limitations')}</h4><p class="research-hint">${L('为结论关联文件、分析步骤或实验结果。局限和相反结果可独立保留。','Link each conclusion to result files, analysis steps or experiment records. Preserve limitations and contradictory evidence.')}</p>${p.evidence.filter(x=>x.kind!=='next_step').map(x=>row(x,evidence.sources)).join('')}<div class="research-actions">${controls('finding',L('添加结果结论','Add finding'))}${controls('limitation',L('添加局限 / 反例','Add limitation / counter-evidence'))}</div>`;
    const conclusion=document.createElement('label');conclusion.className='research-conclusion-field';conclusion.innerHTML=`${L('项目结论 / 阶段性解释（选填）','Project conclusion / interim interpretation (optional)')}<textarea id="researchConclusion" rows="3">${esc(p.research_context.conclusion)}</textarea>`;
    const nextRows=document.createElement('section');nextRows.className='research-evidence-group research-next-group';nextRows.innerHTML=`<p class="research-hint">${L('记录待验证、补做或继续分析的行动，可直接生成今日事项。','Record validation, follow-up experiments or further analyses, then create a task for today.')}${(p.milestones||[]).filter(m=>!m.done).slice(0,3).map(m=>`<br>· ${esc(m.title)}`).join('')}</p>${p.evidence.filter(x=>x.kind==='next_step').map(x=>row(x,evidence.sources)).join('')}<div class="research-actions">${controls('next_step',L('添加下一步行动','Add next step'))}</div>`;
    summary.before(stage(4,L('结论','Conclusion')),conclusion,resultRows,stage(5,L('下一步','Next steps')),nextRows);
    dialog.querySelector('.research-heading').insertAdjacentHTML('afterend',`<p class="research-chain">${L('研究问题 → 分析流程 → 结果证据 → 结论 → 下一步','Research question → analysis workflow → result evidence → conclusion → next step')}</p>`);
  }
  function collect(dialog,p){
    const old=new Map(p.evidence.map(x=>[x.id,x]));
    p.evidence=[...dialog.querySelectorAll('[data-evidence-id]')].map(el=>{
      const prev=old.get(el.dataset.evidenceId)||{},x={...prev,id:el.dataset.evidenceId,title:el.querySelector('[data-e-title]').value.trim(),detail:el.querySelector('[data-e-detail]').value.trim(),kind:el.querySelector('[data-e-kind]').value,status:el.querySelector('[data-e-status]').value,sourceIds:[...el.querySelectorAll('[data-e-source]:checked')].map(input=>input.dataset.eSource)};
      if(JSON.stringify({...x,updatedAt:null})!==JSON.stringify({...prev,updatedAt:null}))x.updatedAt=new Date().toISOString();return x;
    });
    p.linked_experiment_ids=[...dialog.querySelectorAll('[data-link-experiment]:checked')].map(input=>input.dataset.linkExperiment);
  }
  function card(p,experiments=[]){
    const e=R.analysisEvidence(p,experiments),next=e.items.find(x=>x.kind==='next_step'&&x.status!=='done');
    return `<div class="research-card-evidence"><strong>${L('实验证据','Experimental evidence')} ${e.linkedExperimentIds.length} · ${L('结论','Conclusions')} ${e.items.filter(x=>x.kind==='finding').length}</strong>${e.sources.filter(s=>s.kind==='experiment').slice(0,2).map(s=>`<p data-user-copy>${esc(s.title)} · ${esc(s.detail||L('待记录结果','Results pending'))}</p>`).join('')}${next?`<p><b>${L('下一步','Next step')}:</b> <span data-user-copy>${esc(next.title)}</span></p>`:''}</div>`;
  }
  document.addEventListener('click',async ev=>{
    const b=ev.target.closest('[data-open-experiment],[data-open-exp-file]');if(!b)return;
    if(b.dataset.openExperiment){if(b.closest('dialog'))return;document.dispatchEvent(new CustomEvent('shixu-show-experiment',{detail:{id:b.dataset.openExperiment}}));}
    else {try{const res=await window.shixu?.openExperimentArtifact(b.dataset.openExpFile,b.dataset.expFile);if(res&&!res.ok)alert(res.error);else if(!window.shixu)alert(L('请在桌面应用中查看关联文件位置。','Use the desktop app to locate linked files.'));}catch(err){alert(err.message);}}
  });
  window.ResearchEvidenceUI={mount,collect,card};
})();
