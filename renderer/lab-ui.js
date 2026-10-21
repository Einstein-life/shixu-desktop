(function() {
  'use strict';
  const C = window.LabCore;
  const en = document.documentElement.lang === 'en';
  const L = (zh,eng) => en ? eng : zh;
  const $ = id => document.getElementById(id);
  const esc = x => String(x ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const demo = new URLSearchParams(location.search).get('demo') === '1';
  const key = demo ? 'shixu-v2-demo' : 'shixu-v2-store';
  let data = C.empty(), visible = false, editing = null, saving = Promise.resolve();
  let lastTick = '';
  const localDate = iso => new Date(iso).toLocaleString(en?'en-GB':'zh-CN',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  // These are scheduling scaffolds distilled from public protocol repositories. They intentionally
  // omit assay-specific concentrations, temperatures and instrument programs: the local SOP wins.
  const templates = [
    {id:'custom',group:'general',title:L('空白实验','Blank experiment'),steps:[{title:L('操作步骤','Hands-on step'),kind:'active',minutes:10,tolerance:0}]},
    {id:'pcr',group:'molecular',title:L('PCR / qPCR','PCR / qPCR'),steps:[{title:L('核对样本、引物与对照','Verify samples, primers and controls'),kind:'active',minutes:10,tolerance:0},{title:L('配液与分装','Prepare mix and dispense'),kind:'active',minutes:15,tolerance:0},{title:L('仪器运行（按已验证程序修改）','Instrument run (edit to match validated program)'),kind:'wait',minutes:60,tolerance:5},{title:L('导出与质控','Export results and review QC'),kind:'active',minutes:15,tolerance:0}]},
    {id:'dna-rna-extraction',group:'molecular',title:L('DNA / RNA 提取','DNA / RNA extraction'),steps:[{title:L('样本编号与裂解方案核对','Verify sample IDs and lysis plan'),kind:'active',minutes:10,tolerance:0},{title:L('裂解与均质化（按试剂盒 SOP）','Lyse and homogenize (follow kit SOP)'),kind:'active',minutes:20,tolerance:0},{title:L('柱纯化 / 磁珠纯化（按 SOP）','Column or bead purification (follow SOP)'),kind:'active',minutes:25,tolerance:0},{title:L('洗脱、定量与完整性检查','Elute, quantify and check integrity'),kind:'active',minutes:25,tolerance:5},{title:L('样本入库与原始文件记录','Register samples and raw files'),kind:'active',minutes:10,tolerance:0}]},
    {id:'gel',group:'molecular',title:L('琼脂糖凝胶电泳','Agarose gel electrophoresis'),steps:[{title:L('样本与泳道图核对','Check samples and lane map'),kind:'active',minutes:10,tolerance:0},{title:L('制胶、上样与运行准备','Cast gel, load samples and set up run'),kind:'active',minutes:25,tolerance:5},{title:L('电泳运行','Electrophoresis run'),kind:'wait',minutes:35,tolerance:5},{title:L('成像、条带判读与文件归档','Image, interpret bands and archive files'),kind:'active',minutes:20,tolerance:0}]},
    {id:'western-blot',group:'protein',title:L('Western blot','Western blot'),steps:[{title:L('样本与泳道核对','Check samples and lane map'),kind:'active',minutes:15,tolerance:0},{title:L('上样与电泳（按 SOP 修改）','Load and electrophorese (edit to SOP)'),kind:'wait',minutes:60,tolerance:5},{title:L('转膜与封闭（按 SOP 修改）','Transfer and block (edit to SOP)'),kind:'active',minutes:45,tolerance:5},{title:L('一抗孵育','Primary antibody incubation'),kind:'wait',minutes:480,tolerance:30},{title:L('洗膜、二抗与成像','Wash, secondary antibody and image'),kind:'active',minutes:75,tolerance:10},{title:L('原始图、曝光与归一化记录','Record raw image, exposure and normalization'),kind:'active',minutes:20,tolerance:0}]},
    {id:'elisa',group:'protein',title:L('ELISA','ELISA'),steps:[{title:L('板图、标准品与对照核对','Check plate map, standards and controls'),kind:'active',minutes:15,tolerance:0},{title:L('加样与孵育（按试剂盒 SOP）','Load samples and incubate (follow kit SOP)'),kind:'wait',minutes:90,tolerance:10},{title:L('洗板、加检测体系与显色','Wash, add detection reagents and develop'),kind:'active',minutes:40,tolerance:5},{title:L('读板、标准曲线与质控','Read plate, fit standard curve and review QC'),kind:'active',minutes:25,tolerance:0}]},
    {id:'cell-passaging',group:'cell',title:L('细胞培养传代','Cell culture passaging'),steps:[{title:L('细胞系、培养基与污染检查','Verify cell line, media and contamination check'),kind:'active',minutes:15,tolerance:0},{title:L('弃液、清洗与消化（按 SOP）','Aspirate, wash and dissociate (follow SOP)'),kind:'active',minutes:20,tolerance:0},{title:L('计数、活率与接种密度记录','Count cells and record viability and seeding density'),kind:'active',minutes:20,tolerance:0},{title:L('接种、标记与培养箱登记','Seed, label and register incubator position'),kind:'active',minutes:15,tolerance:0},{title:L('培养观察提醒','Culture observation reminder'),kind:'wait',minutes:1440,tolerance:60}]},
    {id:'transfection',group:'cell',title:L('细胞转染','Cell transfection'),steps:[{title:L('细胞状态、密度与对照核对','Check cell state, confluence and controls'),kind:'active',minutes:15,tolerance:0},{title:L('配制核酸与转染复合物（按 SOP）','Prepare nucleic acid and transfection complexes (follow SOP)'),kind:'active',minutes:25,tolerance:0},{title:L('加入细胞并开始培养','Add complexes and start culture'),kind:'active',minutes:15,tolerance:0},{title:L('表达 / 表型观察时间点','Expression or phenotype observation window'),kind:'wait',minutes:1440,tolerance:60},{title:L('收样、编号与原始记录','Collect samples, label and record raw observations'),kind:'active',minutes:20,tolerance:0}]},
    {id:'immunofluorescence',group:'imaging',title:L('免疫荧光染色','Immunofluorescence staining'),steps:[{title:L('样本固定与区域标记','Fix samples and mark regions of interest'),kind:'active',minutes:25,tolerance:0},{title:L('封闭与一抗孵育','Block and incubate primary antibody'),kind:'wait',minutes:480,tolerance:30},{title:L('洗涤、二抗与核染','Wash, add secondary antibody and counterstain'),kind:'active',minutes:60,tolerance:5},{title:L('封片、显微镜参数与采集','Mount, set microscope parameters and acquire'),kind:'active',minutes:45,tolerance:5},{title:L('图像质控与文件归档','Image QC and file archiving'),kind:'active',minutes:20,tolerance:0}]},
    {id:'flow-cytometry',group:'imaging',title:L('流式细胞术染色','Flow cytometry staining'),steps:[{title:L('实验设计、抗体面板与补偿对照核对','Check design, antibody panel and compensation controls'),kind:'active',minutes:20,tolerance:0},{title:L('制备单细胞悬液与计数','Prepare single-cell suspension and count'),kind:'active',minutes:30,tolerance:0},{title:L('染色与洗涤（按 SOP）','Stain and wash (follow SOP)'),kind:'wait',minutes:35,tolerance:5},{title:L('上机、质控与采集','Acquire data with instrument QC'),kind:'active',minutes:45,tolerance:5},{title:L('导出 FCS、样本表与备份','Export FCS, sample sheet and backup'),kind:'active',minutes:20,tolerance:0}]},
    {id:'library-prep',group:'sequencing',title:L('测序文库制备','Sequencing library preparation'),steps:[{title:L('样本表、索引与输入量核对','Verify sample sheet, indexes and input amount'),kind:'active',minutes:20,tolerance:0},{title:L('片段化 / 逆转录（按试剂盒 SOP）','Fragmentation or reverse transcription (follow kit SOP)'),kind:'wait',minutes:30,tolerance:5},{title:L('接头连接与扩增','Adapter ligation and amplification'),kind:'active',minutes:75,tolerance:10},{title:L('纯化、定量与片段分布检查','Cleanup, quantify and check fragment distribution'),kind:'active',minutes:60,tolerance:10},{title:L('混样、上机单与样本交接','Pool libraries, complete run sheet and hand off samples'),kind:'active',minutes:25,tolerance:0}]}
  ];
  const templateGroups = {
    general:L('通用','General'), molecular:L('核酸与电泳','Nucleic acid & gels'),
    protein:L('蛋白与免疫检测','Protein & immunoassays'), cell:L('细胞实验','Cell culture'),
    imaging:L('成像与细胞分析','Imaging & cell analysis'), sequencing:L('测序前处理','Sequencing prep')
  };
  const tabBar = document.querySelector('.tabs');
  const tab = document.createElement('button');
  tab.className='tab'; tab.id='labTab'; tab.type='button'; tab.role='tab'; tab.textContent=L('实验执行','Lab bench');
  tabBar.insertBefore(tab,tabBar.children[1]);
  const section = document.createElement('section'); section.id='view-lab'; section.hidden=true;
  document.querySelector('main').appendChild(section);
  const dialog=document.createElement('dialog'); dialog.className='lab-dialog'; dialog.id='labDialog'; document.body.appendChild(dialog);
  const message=document.createElement('div');message.setAttribute('role','status');message.id='labMessage';section.appendChild(message);
  function switchLab(on) {
    visible=on; section.hidden=!on;
    if(on) {
      document.querySelectorAll('main>section:not(#view-lab)').forEach(el=>el.hidden=true);
      document.querySelectorAll('.tab').forEach(el=>{el.classList.toggle('on',el===tab);el.setAttribute('aria-selected',el===tab?'true':'false');});
      render();
    }
  }
  tab.addEventListener('click',()=>switchLab(true));
  tabBar.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>switchLab(false)));
  async function load() {
    if(window.shixu && !demo) data=C.migrate(await window.shixu.load());
    else { const raw=localStorage.getItem(key);data=raw?C.migrate(JSON.parse(raw)):C.empty(); }
  }
  function save() {
    const snapshot=structuredClone(data);
    saving=saving.catch(()=>{}).then(async()=>{
      if(window.shixu && !demo) data=C.migrate(await window.shixu.save(snapshot));
      else {localStorage.setItem(key,JSON.stringify(snapshot));document.dispatchEvent(new CustomEvent('shixu-data',{detail:{source:'lab',data:snapshot}}));}
    });
    return saving;
  }
  function error(e) {
    const map={CHECKLIST_REQUIRED:L('先完成准备清单。','Complete the preparation checklist first.'),NOT_RUNNING:L('请先开始该步骤。','Start this step first.'),INVALID_DILUTION:L('浓度和体积必须大于 0，目标浓度不能高于原液浓度。','Enter positive values. Target concentration cannot exceed stock concentration.'),INVALID_MIX:L('请填写正整数反应数、0–100% 余量及有效组分体积。','Enter an integer reaction count, 0–100% extra volume, and valid component volumes.')};
    return map[e.message] || L('操作未保存，请重试：','Could not save. Please retry: ') + e.message;
  }
  function countdown(s) {
    const t=C.timing(s), seconds=Math.ceil(Math.abs(t.remaining)/1000);
    const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),sec=seconds%60;
    return `${t.remaining<=0?'+':''}${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }
  function phaseName(phase) {return ({running:L('计时中','Running'),due:L('已到时 · 请接手','Due · action needed'),late:L('超过设定窗口','Outside planned window')})[phase]||'';}
  function recommendation() {
    const r=C.recommendations(data);
    if(r.due.length) return `<div class="lab-notice urgent" role="status">${L('请优先接手：','Action needed: ')}${r.due.map(x=>esc(x.e.title)+' / '+esc(x.s.title)).join(' · ')}</div>`;
    if(r.active.length) return `<div class="lab-notice">${L('当前有人工操作步骤，请优先完成。','A hands-on step is running. Give it your attention first.')}</div>`;
    if(!r.waiting.length) return `<div class="lab-notice">${L('把实验拆成“人工操作”和“等待”步骤；等待时只推荐能在下一提醒前完成的事项，并预留 2 分钟返回。','Separate hands-on and waiting steps. During a wait, suggestions fit before the next alert, with a 2-minute return buffer.')}</div>`;
    return `<div class="lab-notice">${L('距下一接手点可用','Available before the next action: ')} ${r.minutes} ${L('分钟','min')}${r.tasks.length?'<br>'+L('可并行：','Fits this gap: ')+r.tasks.slice(0,2).map(t=>esc(t.title)).join(' / '):'<br>'+L('当前没有能放进这段空档的事项。','No task fits this gap right now.')}</div>`;
  }
  function card(e) {
    const current=C.currentStep(e),done=e.steps.filter(s=>s.status==='done').length;
    const running=current?.status==='running';
    const checklistReady=e.checklist.every(c=>c.done);
    const project=data.projects.find(p=>p.id===e.project_id);
    return `<article class="lab-card" data-exp="${esc(e.id)}"><div class="lab-status">${done}/${e.steps.length} ${L('步骤完成','steps complete')}</div><h2>${esc(e.title)}</h2>
      <div class="lab-meta">${L('样本 / 批次：','Sample / batch: ')}<span data-user-copy>${esc(e.sample)||'—'}</span>${e.lot?'<br>'+L('试剂批号：','Reagent lot: ')+'<span data-user-copy>'+esc(e.lot)+'</span>':''}${e.equipment?'<br>'+L('仪器：','Instrument: ')+'<span data-user-copy>'+esc(e.equipment)+'</span>':''}${project?'<br>'+L('项目：','Project: ')+'<span data-user-copy>'+esc(project.title)+'</span>':''}</div>
      ${e.checklist.length?`<details ${done===0?'open':''}><summary style="font-size:12px">${L('准备清单','Preparation checklist')}</summary>${e.checklist.map(c=>`<label class="lab-check"><input type="checkbox" data-check="${esc(c.id)}" ${c.done?'checked':''} ${running?'disabled':''}>${esc(c.text)}</label>`).join('')}</details>`:''}
      ${e.steps.map((s,i)=>`<div class="lab-step ${s.status}"><span class="lab-dot">${s.status==='done'?'✓':i+1}</span><div class="lab-step-body"><div class="lab-step-title">${esc(s.title)}</div><small>${s.kind==='wait'?L('等待','Wait'):L('人工操作','Hands-on')} · ${s.minutes} min · ${L('容许延迟','Allowed delay')} ${s.tolerance} min</small>
      ${s.status==='running'?`<div class="lab-clock" data-clock="${esc(e.id)}"></div><div class="lab-status" data-phase="${esc(e.id)}"></div><small>${L('预计结束：','Expected finish: ')}${localDate(s.dueAt)}</small>`:''}${s.status==='done'?`<small> · ${localDate(s.completedAt)}</small>`:''}</div></div>`).join('')}
      <div class="lab-row" style="margin-top:12px">${current?(running?`<button class="btn btn-primary" data-lab="complete">${L('确认完成此步','Confirm step complete')}</button><button class="btn btn-ghost" data-lab="cancel">${L('取消本次计时','Cancel timer')}</button>`:`<button class="btn btn-primary" data-lab="start" ${checklistReady?'':'disabled'}>${L('开始下一步','Start next step')}</button>${checklistReady?'':`<small>${L('请先完成准备清单。','Complete the preparation checklist first.')}</small>`}`):`<span class="lab-status">${L('实验已完成','Experiment complete')}</span>`}
      <button class="btn btn-ghost" data-lab="note">${L('记录结果','Record results')}</button><button class="btn btn-ghost" data-lab="edit" ${running?'disabled':''}>${L('编辑','Edit')}</button><button class="btn btn-ghost" data-lab="duplicate">${L('复制为新实验','Duplicate')}</button><button class="btn btn-ghost" data-lab="export">${L('导出记录','Export record')}</button><button class="btn btn-danger-ghost" data-lab="delete">${L('删除','Delete')}</button></div>
      ${e.notes?`<div class="lab-note-box" data-user-copy>${esc(e.notes)}</div>`:''}${project?`<button type="button" class="btn btn-soft btn-mini" data-lab-project="${esc(project.id)}">${L('在项目中查看分析与结果','View analysis & results in project')}</button>`:''}${e.artifacts.length?`<div class="lab-meta">${L('结果文件','Result files')}: ${e.artifacts.length}</div>`:''}
      ${e.events.length?`<details style="margin-top:10px"><summary style="font-size:12px">${L('执行记录','Execution history')} (${e.events.length})</summary>${e.events.slice().reverse().map(x=>`<div class="lab-log">${localDate(x.at)} · ${esc(({start:L('开始','Started'),complete:L('确认完成','Confirmed complete'),cancel:L('取消计时','Timer canceled'),note:L('记录','Note')})[x.action]||x.action)} · ${esc(x.stepTitle||'')}${x.detail?' · '+esc(x.detail):''}</div>`).join('')}</details>`:''}</article>`;
  }
  function render() {
    if(!visible)return;
    section.innerHTML=`<div class="lab-head"><div class="lab-eyebrow">SHIXU · AT THE BENCH</div><h1>${L('每一步，准时接手。','Be ready for the next step.')}</h1><p>${L('把实验、样本与接手时间放在一起。计时结束后，由你确认完成。','Keep experiments, samples and action times together. You confirm when each step is complete.')}</p><div class="lab-row"><button data-lab="new">＋ ${L('新建实验','New experiment')}</button><button class="secondary" data-lab="calculators">${L('配液计算','Solution calculators')}</button></div></div>
    <div id="labRecommendation">${recommendation()}</div><div class="lab-meta">${L('提醒需要桌面应用保持运行。系统睡眠时无法准时提醒，恢复后会显示逾时；此处记录不会证明实验通过质控。','Alerts require the desktop app to remain running. Sleep can delay alerts; overdue steps appear on resume. Completion records do not establish QC success.')}</div>
    <div class="lab-cards">${data.experiments.length?data.experiments.slice().sort((a,b)=>Number(!!a.completedAt)-Number(!!b.completedAt)).map(card).join(''):`<div class="lab-empty">${L('还没有实验。可从空白步骤或可编辑的流程框架开始。','No experiments yet. Start with a blank workflow or an editable planning scaffold.')}</div>`}</div><div id="labMessage" role="status" class="lab-error"></div>`;
    tick();
  }
  function tick() {
    if(!visible)return;
    data.experiments.forEach(e=>{
      const step=C.currentStep(e),el=document.querySelector(`[data-clock="${e.id}"]`),ph=document.querySelector(`[data-phase="${e.id}"]`);
      if(el&&step){const t=C.timing(step);el.textContent=countdown(step);el.className='lab-clock '+t.phase;ph.textContent=phaseName(t.phase);ph.className='lab-status '+t.phase;}
    });
    const r=$('labRecommendation');if(r) r.innerHTML=recommendation();
  }
  function stepEditor(s={}) {
    return `<div class="lab-step-edit"><input aria-label="${L('步骤名称','Step name')}" data-s-title placeholder="${L('步骤名称','Step name')}" value="${esc(s.title||'')}"><div class="lab-grid"><label>${L('方式','Mode')}<select data-s-kind><option value="active">${L('人工操作','Hands-on')}</option><option value="wait" ${s.kind==='wait'?'selected':''}>${L('等待','Wait')}</option></select></label><label>${L('时长（分钟）','Duration (min)')}<input data-s-min type="number" min="0.01" max="525600" step="any" value="${s.minutes||10}"></label><label>${L('容许延迟（分钟）','Allowed delay (min)')}<input data-s-tol type="number" min="0" max="10080" value="${s.tolerance||0}"></label><button type="button" class="btn btn-ghost" data-remove-step>${L('删除此步','Remove step')}</button></div></div>`;
  }
  function openEditor(id) {
    editing=id?data.experiments.find(e=>e.id===id):null;
    dialog.innerHTML=`<form id="labForm" class="lab-editor"><h2>${editing?L('编辑实验','Edit experiment'):L('新建实验','New experiment')}</h2>
      ${!editing?`<label for="labTemplate">${L('选择实验类型','Choose an experiment type')}</label><select id="labTemplate">${Object.entries(templateGroups).map(([group,label])=>`<optgroup label="${esc(label)}">${templates.filter(t=>t.group===group).map(t=>`<option value="${t.id}">${esc(t.title)}</option>`).join('')}</optgroup>`).join('')}</select><small>${L('流程参考公开实验室仓库整理，仅帮助排程和记录。时长为示例；请替换为本实验室已验证 SOP，核对试剂说明、设备要求、风险评估与对照设置。','Scaffolds are organized from public lab repositories for scheduling and record keeping only. Durations are examples. Follow your validated SOP, reagent instructions, equipment requirements, risk assessment and controls.')}</small>`:''}
      <label for="expTitle">${L('实验名称','Experiment name')}</label><input id="expTitle" required maxlength="200" value="${esc(editing?.title||'')}">
      <div class="lab-grid"><label>${L('样本 / 批次','Sample / batch')}<input id="expSample" maxlength="500" value="${esc(editing?.sample||'')}"></label><label>${L('试剂批号','Reagent lot')}<input id="expLot" maxlength="500" value="${esc(editing?.lot||'')}"></label></div>
      <label>${L('仪器 / 位置','Instrument / location')}<input id="expEquipment" value="${esc(editing?.equipment||'')}"></label>
      <label for="expProject">${L('关联项目','Project')}</label><select id="expProject"><option value="">${L('不关联','None')}</option>${data.projects.map(p=>`<option value="${esc(p.id)}" data-user-copy ${editing?.project_id===p.id?'selected':''}>${esc(p.title)}</option>`).join('')}</select>
      <label for="expChecklist">${L('准备清单（每行一项）','Preparation checklist (one item per line)')}</label><textarea id="expChecklist">${esc(editing?editing.checklist.map(c=>c.text).join('\n'):L('样本编号核对\n试剂与耗材就绪\n仪器可用、对照设置确认','Sample IDs verified\nReagents and consumables ready\nInstrument available and controls checked'))}</textarea>
      <label>${L('执行步骤（按顺序）','Steps (in order)')}</label><div id="stepEditors">${(editing?.steps||templates[0].steps).map(stepEditor).join('')}</div><button type="button" class="btn btn-soft" id="addLabStep">＋ ${L('增加步骤','Add step')}</button>
      <label for="expNotes">${L('结果 / 偏差 / 原始文件位置','Results / deviations / raw file location')}</label><textarea id="expNotes">${esc(editing?.notes||'')}</textarea><div id="labFormError" role="alert" class="lab-error"></div><div class="lab-actions"><button class="btn btn-ghost" type="button" data-close>${L('取消','Cancel')}</button><button class="btn btn-primary" type="submit">${L('保存实验','Save experiment')}</button></div></form>`;
    dialog.showModal();
    $('addLabStep').onclick=()=>$('stepEditors').insertAdjacentHTML('beforeend',stepEditor());
    const template=$('labTemplate');if(template)template.onchange=()=>{$('stepEditors').innerHTML=templates.find(t=>t.id===template.value).steps.map(stepEditor).join('');};
    $('labForm').onsubmit=async e=>{
      e.preventDefault();
      const rows=[...dialog.querySelectorAll('.lab-step-edit')];
      if(!rows.length){$('labFormError').textContent=L('请至少添加一个步骤。','Add at least one step.');return;}
      const steps=rows.map(row=>({id:C.uid(),title:row.querySelector('[data-s-title]').value.trim(),kind:row.querySelector('[data-s-kind]').value,minutes:Number(row.querySelector('[data-s-min]').value),tolerance:Number(row.querySelector('[data-s-tol]').value),status:'pending'}));
      if(steps.some(s=>!s.title||!Number.isFinite(s.minutes)||s.minutes<=0||!Number.isFinite(s.tolerance)||s.tolerance<0)){$('labFormError').textContent=L('步骤名称、时长与容许延迟不能为空或无效。','Enter valid step names, durations and allowed delays.');return;}
      if(editing?.steps.some(s=>s.status==='done')&&!confirm(L('修改步骤会重置步骤进度，历史记录仍保留。继续？','Editing resets step progress and keeps history. Continue?')))return;
      const checklist=$('expChecklist').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(text=>({id:C.uid(),text,done:editing?.checklist.some(c=>c.text===text&&c.done)||false}));
      const updated=C.normalizeExperiment({...editing,id:editing?.id||C.uid(),title:$('expTitle').value.trim(),sample:$('expSample').value.trim(),lot:$('expLot').value.trim(),equipment:$('expEquipment').value.trim(),project_id:$('expProject').value||null,checklist,steps,notes:$('expNotes').value,completedAt:null});
      if(!updated.title){$('labFormError').textContent=L('请填写实验名称。','Enter an experiment name.');return;}
      const old=structuredClone(data);data.experiments=editing?data.experiments.map(x=>x.id===editing.id?updated:x):[updated,...data.experiments];
      try{await save();dialog.close();render();}catch(err){data=old;$('labFormError').textContent=error(err);}
    };
  }
  function exportRecord(e) {
    const lines=[`# ${e.title}`,'',`${L('样本 / 批次','Sample / batch')}: ${e.sample}`,`${L('试剂批号','Reagent lot')}: ${e.lot}`,`${L('仪器','Instrument')}: ${e.equipment}`,'',`## ${L('步骤','Steps')}`,...e.steps.map(s=>`- [${s.status==='done'?'x':' '}] ${s.title} · ${s.minutes} min · ${s.kind} · ${s.startedAt||'—'} → ${s.completedAt||'—'}`),'',`## ${L('结果与偏差','Results and deviations')}`,e.notes,'',`## ${L('执行记录（用户可编辑的本地记录）','Execution history (editable local records)')}`,...e.events.map(x=>`- ${x.at} · ${x.action} · ${x.stepTitle||''} · ${x.detail||''}`)];
    lines.push('',`## ${L('原始文件与结果引用','Raw files and result references')}`,...e.artifacts.map(a=>`- ${a.name}: ${a.path}${a.note?' — '+a.note:''}`));
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/markdown;charset=utf-8'}));a.download='shixu-experiment-'+e.id+'.md';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  function openResults(e) {
    dialog.innerHTML=`<form id="labNoteForm" class="lab-editor"><h2>${L('记录结果并关联项目','Record results and link a project')}</h2><p class="lab-meta">${esc(e.title)}</p><label for="labNoteProject">${L('关联项目','Project')}</label><select id="labNoteProject"><option value="">${L('不关联','None')}</option>${data.projects.map(p=>`<option value="${esc(p.id)}" ${p.id===e.project_id?'selected':''}>${esc(p.title)}</option>`).join('')}</select><small>${L('保存后，结果和原始文件会自动显示在该项目的“分析与结果 → 结果证据”中。计时和步骤进度不会重置。','After saving, results and raw file references appear in the project’s Analysis & results → Result evidence. Timers and step progress are preserved.')}</small><label for="labNote">${L('结果、偏差或原始文件位置','Results, deviations or raw file location')}</label><textarea id="labNote" rows="5">${esc(e.notes)}</textarea><label for="labResultPaths">${L('结果文件 / 链接（每行一条）','Result files / URLs (one per line)')}</label><textarea id="labResultPaths" rows="4" placeholder="${L('本机绝对路径、网页链接或服务器路径','Absolute local paths, web URLs or server paths')}">${esc(e.artifacts.map(a=>a.path).join('\n'))}</textarea>${window.shixu?.pickResearchFiles?`<div class="lab-row"><button type="button" id="pickLabFiles" class="btn btn-ghost">${L('选择本机结果文件','Choose local result files')}</button></div>`:''}<small>${L('只保存文件引用；原文件留在原处，备份不包含文件内容。','Only file references are stored; files stay in place and are not included in backups.')}</small><div class="lab-error" id="noteError" role="alert"></div><div class="lab-actions"><button type="button" data-close class="btn btn-ghost">${L('取消','Cancel')}</button><button class="btn btn-primary" type="submit">${L('保存结果','Save results')}</button></div></form>`;
    dialog.showModal();
    const picker=$('pickLabFiles');if(picker)picker.onclick=async()=>{try{const ret=await window.shixu.pickResearchFiles('file');if(!ret.canceled)$('labResultPaths').value=Array.from(new Set([...$('labResultPaths').value.split(/\r?\n/).filter(Boolean),...ret.paths])).join('\n');}catch(err){$('noteError').textContent=error(err);}};
    $('labNoteForm').onsubmit=async ev=>{
      ev.preventDefault();const submit=dialog.querySelector('[type=submit]');submit.disabled=true;
      const old=structuredClone(data),current=data.experiments.find(x=>x.id===e.id);
      if(!current){$('noteError').textContent=L('实验记录已不存在，请关闭后重新打开。','This experiment no longer exists. Close and reopen the view.');submit.disabled=false;return;}
      const paths=Array.from(new Set($('labResultPaths').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)));
      current.notes=$('labNote').value;current.project_id=$('labNoteProject').value||null;
      current.artifacts=paths.map(path=>current.artifacts.find(a=>a.path===path)||{id:C.uid(),name:path.split(/[\\/]/).filter(Boolean).pop()||path,path,type:/^https?:/.test(path)?'link':'file',note:'',createdAt:new Date().toISOString()});
      current.events.push({id:C.uid(),at:new Date().toISOString(),action:'note',detail:current.notes});
      try{await save();dialog.close();render();}catch(err){data=old;$('noteError').textContent=error(err);}finally{submit.disabled=false;}
    };
  }
  async function perform(action,id) {
    if(action==='new'){openEditor();return;}if(action==='calculators'){calculators();return;}
    const e=data.experiments.find(x=>x.id===id);if(!e)return;
    if(action==='edit'){openEditor(id);return;}if(action==='export'){exportRecord(e);return;}
    if(action==='note'){
      openResults(e);return;
    }
    const old=structuredClone(data);
    if(action==='delete'){if(!confirm(L('删除此实验及其记录？','Delete this experiment and its records?')))return;data.experiments=data.experiments.filter(x=>x.id!==id);}
    else if(action==='duplicate'){const copy=C.normalizeExperiment({...e,id:C.uid(),title:e.title+L('（副本）',' (copy)'),createdAt:new Date().toISOString(),completedAt:null,events:[],notes:'',artifacts:[],checklist:e.checklist.map(c=>({...c,id:C.uid(),done:false})),steps:e.steps.map(s=>({...s,id:C.uid(),status:'pending',startedAt:null,dueAt:null,completedAt:null}))});data.experiments.unshift(copy);}
    else {
      if(action==='cancel'&&!confirm(L('取消本次计时并将此步恢复为未开始？','Cancel this timer and return this step to pending?')))return;
      try {data.experiments=data.experiments.map(x=>x.id===id?C.transition(x,action):x);}catch(err){$('labMessage').textContent=error(err);return;}
    }
    try{await save();render();}catch(err){data=old;render();$('labMessage').textContent=error(err);}
  }
  section.addEventListener('click',e=>{const b=e.target.closest('[data-lab]');if(b)perform(b.dataset.lab,b.closest('[data-exp]')?.dataset.exp);});
  section.addEventListener('click',ev=>{const b=ev.target.closest('[data-lab-project]');if(b)document.dispatchEvent(new CustomEvent('shixu-open-project',{detail:{id:b.dataset.labProject}}));});
  document.addEventListener('shixu-show-experiment',ev=>{const e=data.experiments.find(x=>x.id===ev.detail.id);if(!e)return;switchLab(true);if(dialog.open)dialog.close();openResults(e);});
  section.addEventListener('change',async ev=>{const cb=ev.target.closest('[data-check]');if(!cb)return;const exp=data.experiments.find(x=>x.id===cb.closest('[data-exp]').dataset.exp);const old=structuredClone(data);exp.checklist.find(x=>x.id===cb.dataset.check).done=cb.checked;try{await save();render();}catch(err){data=old;render();$('labMessage').textContent=error(err);}});
  dialog.addEventListener('click',ev=>{if(ev.target.closest('[data-close]'))dialog.close();const b=ev.target.closest('[data-remove-step]');if(b)b.closest('.lab-step-edit').remove();});
  function calculators() {
    dialog.innerHTML=`<div class="lab-calcs"><h2>${L('配液计算','Solution calculators')}</h2><p class="lab-meta">${L('按你输入的参数计算；使用前核对浓度单位、体系与实验室 SOP。','Calculated from your inputs. Verify concentration units, assay design and your lab SOP before use.')}</p>
    <details open><summary>${L('稀释 · C₁V₁ = C₂V₂','Dilution · C₁V₁ = C₂V₂')}</summary><div class="lab-grid"><label>${L('原液浓度 C₁','Stock C₁')}<input id="stock" type="number" min="0" step="any" value="10"></label><label>${L('目标浓度 C₂（与 C₁ 同单位）','Target C₂ (same units as C₁)')}<input id="target" type="number" min="0" step="any" value="1"></label><label>${L('终体积 V₂','Final volume V₂')}<input id="volume" type="number" min="0" step="any" value="100"></label><label>${L('体积单位','Volume unit')}<select id="volumeUnit"><option>µL</option><option>mL</option><option>L</option></select></label></div><div class="lab-calc-result" id="dilutionResult" role="status"></div></details>
    <details open><summary>${L('Master mix · 多反应配液','Master mix · multiple reactions')}</summary><div class="lab-grid"><label>${L('反应数（包含对照）','Reactions (include controls)')}<input id="reactions" type="number" min="1" max="100000" step="1" value="8"></label><label>${L('额外余量 %','Extra volume %')}<input id="extra" type="number" min="0" max="100" value="10"></label></div><small>${L('仅汇总加入混合液的组分；样本或不同处理单独加入。所有体积为 µL。','List shared components only; add samples or variable treatments separately. All volumes are µL.')}</small><table class="lab-table"><thead><tr><th>${L('组分','Component')}</th><th>${L('每反应 µL','µL / reaction')}</th><th>${L('总量 µL','Total µL')}</th></tr></thead><tbody>${[1,2,3,4].map(i=>`<tr><td><input data-mix-name placeholder="${L('组分','Component')} ${i}" aria-label="${L('组分名称','Component name')} ${i}"></td><td><input data-mix-volume type="number" min="0" step="any" aria-label="${L('每反应体积','Volume per reaction')} ${i}"></td><td data-mix-total>—</td></tr>`).join('')}</tbody></table><div class="lab-calc-result" id="mixResult" role="status"></div></details><div class="lab-actions"><button data-close class="btn btn-primary">${L('关闭','Close')}</button></div></div>`;
    dialog.showModal();
    function calculate() {
      try {const d=C.dilution($('stock').value,$('target').value,$('volume').value),unit=$('volumeUnit').value;$('dilutionResult').textContent=L('原液：','Stock: ')+d.stockVolume.toFixed(3)+' '+unit+'\n'+L('稀释剂：','Diluent: ')+d.solventVolume.toFixed(3)+' '+unit;}catch(err){$('dilutionResult').textContent=error(err);}
      const rows=[...dialog.querySelectorAll('.lab-table tbody tr')];rows.forEach(r=>r.lastElementChild.textContent='—');
      const filled=rows.filter(r=>r.querySelector('[data-mix-name]').value||r.querySelector('[data-mix-volume]').value);
      if(!filled.length){$('mixResult').textContent=L('填入组分及每反应体积后自动计算。','Enter components and volumes per reaction to calculate.');return;}
      try {const m=C.masterMix($('reactions').value,$('extra').value,filled.map(r=>({name:r.querySelector('[data-mix-name]').value,volume:r.querySelector('[data-mix-volume]').value})));filled.forEach((r,i)=>r.lastElementChild.textContent=m.rows[i].total.toFixed(3));$('mixResult').textContent=L('混合液合计：','Total shared mix: ')+m.total.toFixed(3)+' µL · '+L('计算份数：','Effective reactions: ')+m.factor.toFixed(2);}catch(err){$('mixResult').textContent=error(err);}
    }
    dialog.oninput=calculate;dialog.onchange=calculate;calculate();
    dialog.addEventListener('close',()=>{dialog.oninput=null;dialog.onchange=null;},{once:true});
  }
  document.addEventListener('shixu-data',ev=>{if(ev.detail.source!=='lab'){data=C.migrate(ev.detail.data);render();}});
  if(window.shixu && !demo)window.shixu.onUpdate(raw=>{data=C.migrate(raw);if(visible)render();});
  else window.addEventListener('storage',async ev=>{if(ev.key===key){await load();render();}});
  setInterval(tick,1000);
  load().then(()=>{if(new URLSearchParams(location.search).get('tab')==='lab')switchLab(true);}).catch(err=>{section.hidden=false;section.textContent=error(err);});
})();
