(function() {
  'use strict';
  const R=window.ResearchCore;
  const en=document.documentElement.lang==='en', L=(zh,eng)=>en?eng:zh;
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stateLabels={pending:L('未开始','Pending'),running:L('进行中','Running'),done:L('已完成','Done'),blocked:L('受阻','Blocked')};
  const typeLabels={file:L('文件','File'),folder:L('目录','Folder'),link:L('网页 / 报告链接','Web / report link'),remote:L('服务器路径','Server path')};
  const fields={question:L('研究问题 / 假设','Research question / hypothesis'),design:L('实验设计与主要比较','Study design and primary contrasts'),inputs:L('数据、样本表与分组','Inputs, sample sheet and groups'),reference:L('参考基因组 / 注释 / 数据库版本','Genome / annotation / database releases'),software:L('软件、流程与环境版本','Software, workflow and environment versions'),parameters:L('关键参数、命令 / 脚本与作业号','Key parameters, command / script and job ID'),conclusion:L('结论、局限、阴性结果与下一步','Conclusions, limitations, negative results and next steps')};
  let hooks,dialog,draft;
  const options=()=>R.templates.map(t=>`<option value="${t.id}">${esc(R.local(t.title,en?'en':'zh-CN'))}</option>`).join('');
  function formFields(p) {
    const r=R.normalizeProject(p);
    return `<div class="field"><label for="p_question">${fields.question}</label><textarea id="p_question" rows="2">${esc(r.research_context.question)}</textarea></div>
      <div class="field"><label for="p_pipeline">${L('嵌入生信流程','Embed a bioinformatics workflow')}</label><select id="p_pipeline"><option value="">${r.analysis_workflow.steps.length?L('保留现有流程','Keep existing workflow'):L('暂不选择','Choose later')}</option>${options()}</select><p class="research-hint">${L('选择后将追加可编辑的分析步骤；保存项目后进入“分析与结果”补充参数、结论和文件。','Selecting a template appends editable steps. After saving, open Analysis & results to add parameters, conclusions and files.')}</p></div>
      <div class="field"><label for="p_research_summary">${L('项目总结 / 阶段结论','Project summary / interim findings')}</label><textarea id="p_research_summary" rows="3">${esc(p?.summary||'')}</textarea></div>`;
  }
  function appendTemplate(p,id) {
    if(!id)return p;
    const next=R.instantiate(id,en?'en':'zh-CN'),w=p.analysis_workflow;
    if(!w.steps.length)p.analysis_workflow=next;
    else {w.steps.push(...next.steps);w.title=[w.title,next.title].filter(Boolean).join(' + ');w.id='custom';w.source=[w.source,next.source].filter(Boolean).join('\n');}
    return p;
  }
  function collectForm(p) {
    const next=R.normalizeProject(p),$=id=>document.getElementById(id);
    next.research_context.question=$('p_question').value.trim();
    next.summary=$('p_research_summary').value.trim();
    return appendTemplate(next,$('p_pipeline').value);
  }
  function baseCard(raw) {
    const p=R.normalizeProject(raw),w=p.analysis_workflow,done=w.steps.filter(s=>s.status==='done').length;
    return `<div class="research-overview"><div class="research-hint">${L('分析步骤','Analysis steps')} ${done}/${w.steps.length} · ${L('文件与结果','Files & results')} ${p.artifacts.length}</div>${p.research_context.question?`<p data-user-copy>${esc(p.research_context.question)}</p>`:''}${p.research_context.conclusion?`<p data-user-copy>${esc(p.research_context.conclusion)}</p>`:''}<div class="research-actions"><button type="button" class="btn btn-soft btn-mini" data-research-open="${esc(p.id)}">${L('分析与结果','Analysis & results')}</button><button type="button" class="btn btn-ghost btn-mini" data-research-export="${esc(p.id)}">${L('导出项目记录','Export project record')}</button><button type="button" class="btn btn-ghost btn-mini" data-research-proposal="${esc(p.id)}">${L('导出研究方案草稿','Export research plan draft')}</button></div></div>`;
  }
  function card(raw,experiments=[]) {return baseCard(raw)+ResearchEvidenceUI.card(raw,experiments);}
  function stepRow(s) {
    return `<details class="research-step" data-research-step="${esc(s.id)}" ${s.status==='running'||s.status==='blocked'?'open':''}><summary><span data-user-copy>${esc(s.title)}</span> <span class="research-badge ${s.status}">${stateLabels[s.status]}</span></summary><label>${L('步骤名称','Step name')}<input data-rs-title value="${esc(s.title)}" required></label><label>${L('状态','Status')}<select data-rs-status>${Object.entries(stateLabels).map(([key,label])=>`<option value="${key}" ${s.status===key?'selected':''}>${label}</option>`).join('')}</select></label><label>${L('预期产出','Expected output')}<textarea data-rs-output rows="2">${esc(s.output)}</textarea></label><label>${L('方法与质控检查点','Method and QC review points')}<textarea data-rs-qc rows="2">${esc(s.qc)}</textarea></label><label>${L('本次结果 / 偏差 / 决策依据','Results / deviations / decision rationale')}<textarea data-rs-note rows="3">${esc(s.note)}</textarea></label><div class="research-actions"><button type="button" class="btn btn-ghost btn-mini" data-rs-task>${L('生成今日分析事项','Create analysis task for today')}</button><button type="button" class="btn btn-danger-ghost btn-mini" data-rs-remove>${L('删除步骤','Remove step')}</button></div></details>`;
  }
  function artifactRow(a) {
    return `<div class="research-artifact" data-research-artifact="${esc(a.id)}"><label>${L('文件 / 结果名称','File / result name')}<input data-ra-name value="${esc(a.name)}"></label><label>${L('文件路径或链接','File path or URL')}<input data-ra-path value="${esc(a.path)}" placeholder="${L('粘贴本机路径、https 链接或服务器路径','Paste a local path, https URL or server path')}"></label><div class="lab-grid"><label>${L('类型','Type')}<select data-ra-type>${Object.entries(typeLabels).map(([key,label])=>`<option value="${key}" ${a.type===key?'selected':''}>${label}</option>`).join('')}</select></label><label>${L('关联分析步骤','Related analysis step')}<select data-ra-step><option value="">${L('整个项目','Whole project')}</option>${draft.analysis_workflow.steps.map(s=>`<option value="${esc(s.id)}" ${a.stepId===s.id?'selected':''}>${esc(s.title)}</option>`).join('')}</select></label></div><label>${L('结论 / 版本 / 这份文件说明什么','Finding / version / what this file shows')}<textarea data-ra-note rows="2">${esc(a.note)}</textarea></label><div class="research-actions"><button type="button" class="btn btn-ghost btn-mini" data-ra-copy>${L('复制路径','Copy path')}</button><button type="button" class="btn btn-danger-ghost btn-mini" data-ra-remove>${L('移除关联','Remove reference')}</button></div></div>`;
  }
  function collectDraft() {
    ResearchEvidenceUI.collect(dialog,draft);
    for(const key of Object.keys(fields))if(key!=='conclusion'){const input=dialog.querySelector(`[data-context="${key}"]`);if(input)draft.research_context[key]=input.value;}
    const conclusion=dialog.querySelector('#researchConclusion');if(conclusion)draft.research_context.conclusion=conclusion.value;
    draft.analysis_workflow.title=dialog.querySelector('#researchWorkflowTitle').value;
    const old=new Map(draft.analysis_workflow.steps.map(s=>[s.id,s]));
    draft.analysis_workflow.steps=[...dialog.querySelectorAll('[data-research-step]')].map(el=>{
      const prev=old.get(el.dataset.researchStep)||{},s={...prev,id:el.dataset.researchStep};
      for(const [key,attr] of [['title','title'],['status','status'],['output','output'],['qc','qc'],['note','note']])s[key]=el.querySelector(`[data-rs-${attr}]`).value;
      if(['title','status','output','qc','note'].some(k=>s[k]!==prev[k]))s.updatedAt=new Date().toISOString();
      return s;
    });
    const prior=new Map(draft.artifacts.map(a=>[a.id,a]));
    draft.artifacts=[...dialog.querySelectorAll('[data-research-artifact]')].map(el=>{
      const a={...prior.get(el.dataset.researchArtifact),id:el.dataset.researchArtifact};
      for(const [key,attr] of [['name','name'],['path','path'],['type','type'],['stepId','step'],['note','note']])a[key]=el.querySelector(`[data-ra-${attr}]`).value;
      if(!draft.analysis_workflow.steps.some(s=>s.id===a.stepId))a.stepId='';
      return a;
    });
    draft.summary=dialog.querySelector('#researchSummary').value;
    return draft;
  }
  function savedLinks(p) {
    return p.artifacts.map(a=>`<div class="research-file" data-user-copy><strong>${esc(a.name||a.path)}</strong><span>${esc(a.path)}</span>${a.note?`<p>${esc(a.note)}</p>`:''}<button type="button" class="btn btn-ghost btn-mini" data-ra-access="${esc(a.id)}">${L('查看位置 / 打开链接','Show location / open link')}</button></div>`).join('');
  }
  function contextMarkup(p) {
    const field=key=>`<label>${fields[key]}<textarea data-context="${key}" rows="${key==='conclusion'?3:2}">${esc(p.research_context[key])}</textarea></label>`;
    const advanced=['design','inputs','reference','software','parameters'];
    return field('question')+`<details class="research-advanced" ${advanced.some(k=>p.research_context[k])?'open':''}><summary>${L('实验设计与可复现性（选填）','Study design & reproducibility (optional)')}</summary><div class="research-context">${advanced.map(field).join('')}</div></details>`;
  }
  function draw() {
    const p=draft,w=p.analysis_workflow;
    dialog.innerHTML=`<form id="researchForm" class="research-editor"><div class="research-heading"><div><p class="research-hint">${L('项目研究记录','Project research record')}</p><h2 data-user-copy>${esc(p.title)}</h2></div><button type="button" class="btn btn-ghost btn-mini" data-r-close>${L('关闭','Close')}</button></div><p class="research-hint">${L('流程用于设计、记录与复盘。请结合物种、样本量和实验设计调整方法；运行任务仍在你的分析环境完成。','Use these workflows to plan, record and review. Adapt methods to the organism, sample size and design; run analyses in your own environment.')}</p><div class="research-context">${contextMarkup(p)}</div><h3>${L('分析流程','Analysis workflow')}</h3><label>${L('流程名称','Workflow name')}<input id="researchWorkflowTitle" value="${esc(w.title)}"></label><div class="research-actions"><select aria-label="${L('添加流程模板','Add workflow template')}" id="researchTemplate">${options()}</select><button type="button" class="btn btn-soft btn-mini" data-r-add-template>${L('追加模板步骤','Append template steps')}</button><button type="button" class="btn btn-ghost btn-mini" data-r-add-step>${L('增加自定义步骤','Add custom step')}</button></div><p class="research-hint">${L('模板含预期产出及质控要点。状态只表示工作进度，完成后仍需记录质控结论。','Templates include expected outputs and QC review points. Status tracks work progress; record QC conclusions separately.')}</p><div id="researchSteps">${w.steps.map(stepRow).join('')||`<p class="research-hint">${L('尚未添加分析流程','No analysis workflow yet')}</p>`}</div>${w.source?`<details class="research-sources"><summary>${L('流程参考资源','Workflow reference resources')}</summary><pre data-user-copy>${esc(w.source)}</pre></details>`:''}<h3>${L('关联文件与结果','Linked files and results')}</h3><p class="research-hint">${L('只保存路径和说明，文件保留在原处。JSON / Markdown 备份不包含这些文件。服务器路径可记录和复制。','Only paths and notes are stored; files stay in place. JSON / Markdown backups do not include these files. Server paths can be recorded and copied.')}</p>${savedLinks(hooks.getProject(p.id))}<div id="researchArtifacts">${p.artifacts.map(artifactRow).join('')}</div><div class="research-actions"><button type="button" class="btn btn-soft btn-mini" data-r-add-artifact>${L('添加路径 / 链接','Add path / link')}</button>${window.shixu?.pickResearchFiles?`<button type="button" class="btn btn-ghost btn-mini" data-r-pick="file">${L('选择本机文件','Choose local files')}</button><button type="button" class="btn btn-ghost btn-mini" data-r-pick="folder">${L('选择本机目录','Choose local folder')}</button>`:''}</div><label>${L('项目总结 / 阶段结论','Project summary / interim findings')}<textarea rows="3" id="researchSummary">${esc(p.summary||'')}</textarea></label><div id="researchError" role="alert" class="lab-error"></div><footer class="research-footer"><button type="button" class="btn btn-ghost" data-r-close>${L('取消','Cancel')}</button><button type="submit" class="btn btn-primary">${L('保存研究记录','Save research record')}</button></footer></form>`;
    ResearchEvidenceUI.mount(dialog,draft,hooks);
    dialog.querySelector('form').onsubmit=async ev=>{
      ev.preventDefault();collectDraft();const submit=dialog.querySelector('[type=submit]');submit.disabled=true;
      try{await hooks.saveProject(draft);dialog.close();hooks.toast(L('研究记录已保存','Research record saved'));}catch(err){showError(L('保存失败，记录仍保留在此窗口：','Save failed; your draft remains here: ')+err.message);}finally{submit.disabled=false;}
    };
  }
  function showError(text){dialog.querySelector('#researchError').textContent=text;}
  async function copy(text) {try{await navigator.clipboard.writeText(text);hooks.toast(L('已复制路径','Path copied'));}catch{showError(L('复制失败，请在路径框中选择并复制。','Could not copy. Select and copy the text in the path field.'));}}
  function close() {
    collectDraft();
    if(JSON.stringify(draft)!==JSON.stringify(R.normalizeProject(hooks.getProject(draft.id)))&&!confirm(L('放弃尚未保存的研究记录？','Discard unsaved research record changes?')))return;
    dialog.close();
  }
  async function click(ev) {
    const b=ev.target.closest('button');if(!b)return;
    try{
      if(b.hasAttribute('data-r-close')){close();return;}
      if(b.hasAttribute('data-open-experiment')){collectDraft();await hooks.saveProject(draft);dialog.close();document.dispatchEvent(new CustomEvent('shixu-show-experiment',{detail:{id:b.dataset.openExperiment}}));return;}
      if(b.hasAttribute('data-ra-copy')){await copy(b.closest('[data-research-artifact]').querySelector('[data-ra-path]').value);return;}
      if(b.hasAttribute('data-ra-access')){
        const a=hooks.getProject(draft.id).artifacts.find(a=>a.id===b.dataset.raAccess),t=R.target(a?.path);
        if(t.kind==='remote'||(t.kind==='local'&&!window.shixu)){await copy(a.path);return;}
        if(t.kind==='invalid'){showError(L('请填写绝对路径或 http(s) 链接。','Enter an absolute path or an http(s) URL.'));return;}
        if(window.shixu){const result=await window.shixu.openResearchArtifact(draft.id,a.id);if(!result.ok)showError(L('无法打开：','Could not open: ')+result.error);}
        else if(t.kind==='web')window.open(t.value,'_blank','noopener,noreferrer');
        return;
      }
      collectDraft();
      if(b.hasAttribute('data-e-add')){
        draft.evidence.push({id:R.uid(),title:L('新记录','New record'),detail:'',kind:b.dataset.eAdd,status:'planned',sourceIds:[],createdAt:new Date().toISOString(),updatedAt:null});draw();
        dialog.querySelector('[data-evidence-id]:last-child')?.scrollIntoView({block:'center'});return;
      }
      if(b.hasAttribute('data-e-remove')){draft.evidence=draft.evidence.filter(x=>x.id!==b.dataset.eRemove);draw();return;}
      if(b.hasAttribute('data-e-task')){
        const item=draft.evidence.find(x=>x.id===b.dataset.eTask);
        if(!item?.title?.trim()){showError(L('请先填写行动标题。','Enter an action title first.'));return;}
        await hooks.saveProject(draft);const created=await hooks.createTask(draft,{id:'action_'+item.id,title:item.title,note:item.detail});if(created!==false)hooks.toast(L('已创建今日事项；可在调度中查看','Task created for today; view it in Schedule'));return;
      }
      if(b.hasAttribute('data-e-refresh')){draw();return;}
      if(b.hasAttribute('data-r-add-template')){appendTemplate(draft,dialog.querySelector('#researchTemplate').value);draw();return;}
      if(b.hasAttribute('data-r-add-step')){draft.analysis_workflow.steps.push({id:R.uid(),title:L('自定义分析步骤','Custom analysis step'),status:'pending',output:'',qc:'',note:'',updatedAt:null});draw();return;}
      if(b.hasAttribute('data-r-add-artifact')){draft.artifacts.push({id:R.uid(),name:'',path:'',type:'file',note:'',stepId:'',createdAt:new Date().toISOString()});draw();return;}
      if(b.hasAttribute('data-r-pick')){
        const result=await window.shixu.pickResearchFiles(b.dataset.rPick);if(result.canceled)return;
        for(const path of result.paths||[])draft.artifacts.push({id:R.uid(),name:path.split(/[\\/]/).filter(Boolean).pop(),path,type:b.dataset.rPick==='folder'?'folder':'file',note:'',stepId:'',createdAt:new Date().toISOString()});draw();return;
      }
      if(b.hasAttribute('data-rs-remove')){const id=b.closest('[data-research-step]').dataset.researchStep;if(!confirm(L('移除此分析步骤？文件关联会保留到整个项目。','Remove this analysis step? File references will remain with the project.')))return;draft.analysis_workflow.steps=draft.analysis_workflow.steps.filter(s=>s.id!==id);draft.artifacts.forEach(a=>{if(a.stepId===id)a.stepId='';});draw();return;}
      if(b.hasAttribute('data-ra-remove')){draft.artifacts=draft.artifacts.filter(a=>a.id!==b.closest('[data-research-artifact]').dataset.researchArtifact);draw();return;}
      if(b.hasAttribute('data-rs-task')){
        const s=draft.analysis_workflow.steps.find(s=>s.id===b.closest('[data-research-step]').dataset.researchStep);
        await hooks.saveProject(draft);const created=await hooks.createTask(draft,s);if(created!==false)hooks.toast(L('已创建今日分析事项；可在调度中设置运行等待','Analysis task created; set its waiting status in Schedule'));
      }
    }catch(err){showError(L('操作未完成：','Action failed: ')+err.message);}
  }
  function open(id) {
    draft=structuredClone(R.normalizeProject(hooks.getProject(id)));
    if(!dialog){dialog=document.createElement('dialog');dialog.className='research-dialog';document.body.appendChild(dialog);dialog.addEventListener('click',click);dialog.addEventListener('cancel',ev=>{ev.preventDefault();close();});}
    draw();dialog.showModal();
  }
  function setup(config) {
    hooks=config;
    document.addEventListener('click',ev=>{
      const b=ev.target.closest('[data-research-open],[data-research-export],[data-research-proposal]');if(!b)return;
      const id=b.dataset.researchOpen||b.dataset.researchExport||b.dataset.researchProposal;
      if(b.dataset.researchOpen)open(id);
      else if(b.dataset.researchProposal)hooks.download('shixu-research-plan-'+id+'.md',R.proposal(hooks.getProject(id),en?'en':'zh-CN',hooks.getExperiments()),'text/markdown');
      else hooks.download('shixu-project-'+id+'.md',R.markdown(hooks.getProject(id),en?'en':'zh-CN',hooks.getExperiments()),'text/markdown');
    });
    document.addEventListener('shixu-open-project',ev=>{if(dialog?.open)dialog.close();document.querySelector('[data-tab="projects"]')?.click();open(ev.detail.id);});
  }
  function summaryLines(raw,experiments=[]) {
    const p=R.normalizeProject(raw),w=p.analysis_workflow,e=R.analysisEvidence(p,experiments),kindLabels={finding:L('结论','Conclusion'),limitation:L('局限','Limitation'),next_step:L('下一步','Next step')};
    return [p.research_context.question?`  - ${L('研究问题','Research question')}: ${p.research_context.question}`:'',w.steps.length?`  - ${L('分析流程','Analysis workflow')}: ${w.title} (${w.steps.filter(s=>s.status==='done').length}/${w.steps.length})`:'',...e.sources.filter(x=>x.kind==='experiment'||x.kind==='experiment_file').map(x=>`  - ${L('实验结果证据','Experimental evidence')}: ${x.title} — ${x.detail||''}${x.path?' — '+x.path:''}`),p.research_context.conclusion?`  - ${L('项目结论','Conclusion')}: ${p.research_context.conclusion}`:'',...e.items.map(x=>`  - ${kindLabels[x.kind]}: ${x.title} — ${x.detail}${x.sourceIds.length?' ('+L('依据','Evidence')+': '+x.sourceIds.map(id=>e.sources.find(s=>s.id===id)?.title||L('来源已移除','Source removed')).join('; ')+')':''}`),...p.artifacts.map(a=>`  - ${L('结果引用','Result reference')}: ${a.name} — ${a.path}${a.note?' — '+a.note:''}`)].filter(Boolean);
  }
  window.ResearchUI={setup,card,formFields,collectForm,summaryLines};
})();
