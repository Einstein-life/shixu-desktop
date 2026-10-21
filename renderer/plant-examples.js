/* Bundled, fictional plant research records. No jobs or timers start automatically. */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./lab-core.js'):root.LabCore,typeof module==='object'&&module.exports?require('./research-core.js'):root.ResearchCore);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.PlantExamples=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C,R){
  'use strict';
  const SET='plant-research-v1';
  function create(lang='zh-CN',now=Date.now(),variant=''){
    const L=(zh,en)=>lang==='en'?en:zh;
    const at=new Date(now).toISOString();
    const date=days=>{const d=new Date(now);d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
    const warning=L('模拟示例，非真实研究结果。文件为占位引用，请替换为自己的数据。','Fictional example, not a real research finding. File references are placeholders; replace them with your own data.');
    const specs=[
      {
        key:'arabidopsis-salt',workflow:'rnaseq',cat:'analysis',deadline:'later',
        title:L('拟南芥盐胁迫的转录响应与 qPCR 验证','Arabidopsis salt-stress transcription and qPCR validation'),
        question:L('盐处理后，候选响应基因的表达变化能否在独立批次中复现？','Can candidate salt-response expression changes be reproduced in an independent batch?'),
        design:L('示例设计：Col-0 同龄植株，对照与盐处理；每组4个独立生物学重复作为演示。随机分配培养位置，平衡取样与建库批次；验证另用独立批次，正式样本量按效应与方差评估。','Example design: age-matched Col-0 plants, control and salt treatment, with four independent biological replicates per group for demonstration. Randomize positions and balance collection/library batches. Validate in an independent batch; assess the actual sample size using expected effects and variance.'),
        inputs:L('叶片样本表、处理时间、RNA-seq 原始文件；样本编号贯通 qPCR 板图。','Leaf sample sheet, treatment times and RNA-seq raw files; carry sample IDs into the qPCR plate map.'),
        reference:L('填写实际使用的拟南芥基因组、注释 release 与文件校验值。','Record the Arabidopsis assembly, annotation release and file checksums actually used.'),
        parameters:L('设计公式示例：~ batch + treatment；先检查批次与处理是否混杂。保存 contrast、脚本版本、效应量和 FDR。','Example design: ~ batch + treatment; first check treatment/batch confounding. Preserve contrasts, script versions, effect sizes and FDR.'),
        observation:L('演示记录：已整理候选基因与验证板图；真实 Ct、扩增效率、参考基因稳定性和质控结论待填写。','Example record: candidate list and validation plate map organized. Actual Ct values, amplification efficiency, reference-gene stability and QC conclusions remain to be recorded.'),
        finding:L('候选表达响应进入独立验证阶段','Candidate expression responses move to independent validation'),
        limitation:L('候选清单只是演示；尚不能据此确认表达差异或耐盐机制。需真实效应量、重复与验证结果。','The candidate list is illustrative. Expression differences or salt-tolerance mechanisms require real effect sizes, replicates and validation results.'),
        next:L('复核 qPCR 原始数据与内参稳定性','Review qPCR raw data and reference-gene stability'),
        assay:L('盐响应候选基因 qPCR 验证','qPCR validation of salt-response candidates'),
        sample:'SALT-C01..04 / SALT-T01..04',file:'qpcr-review.tsv',finished:true,
        analysis:L('复核 PCA、批次与盐处理 contrast','Review PCA, batches and the salt-treatment contrast'),
        quick:L('整理盐胁迫项目组会图注与局限','Prepare salt-stress figure captions and limitations'),
        milestones:[L('样本与比较设计核对','Verify samples and contrasts'),L('表达分析与质控复核','Review expression analysis and QC'),L('独立批次验证与组会整理','Validate independently and prepare lab meeting')]
      },
      {
        key:'rice-drought',workflow:'methylseq',cat:'project',deadline:'later',
        title:L('水稻干旱响应的甲基化—表达联合分析','Rice drought response: methylation and expression integration'),
        question:L('干旱相关 DMR 与表达变化有何关联，哪些候选值得进一步验证？','How do drought-associated DMRs relate to expression changes, and which candidates merit validation?'),
        design:L('示例设计：同一水稻遗传背景的对照与干旱处理，匹配叶片时期；同一生物学样本分装用于 WGBS 与 RNA-seq。记录独立植株、区组、土壤含水量和取样批次。','Example design: control and drought treatment in one rice genetic background, matched leaf stages; split the same biological samples for WGBS and RNA-seq. Record independent plants, blocks, soil moisture and collection batches.'),
        inputs:L('WGBS 与 RNA-seq 样本映射、表型记录、甲基化覆盖计数及表达计数。','Matched WGBS/RNA-seq sample map, phenotype records, methylation coverage counts and expression counts.'),
        reference:L('两组学统一水稻 assembly、基因/TE 注释和坐标体系；填写实际 release。','Use a consistent rice assembly, gene/TE annotations and coordinate system across omics; record the actual releases.'),
        parameters:L('分别评估 CG、CHG、CHH、转换率和覆盖；保存 DMR 定义与多重检验方法。结合生物学重复与区组建模。','Assess CG, CHG, CHH, conversion and coverage separately; preserve DMR definitions and multiple-testing methods. Model biological replicates and blocks.'),
        observation:L('演示记录：叶片核酸共提取的样本映射已建立；尚无可供判定的真实覆盖、转换率或表达结果。','Example record: sample mapping for leaf nucleic-acid co-extraction is prepared. No real coverage, conversion or expression results are available for interpretation.'),
        finding:L('先统一样本与坐标，再开展 DMR–DEG 关联','Harmonize samples and coordinates before DMR–DEG integration'),
        limitation:L('甲基化与表达相关性不能证明调控因果；组织组成、发育时期及干旱程度均可能影响结果。','Methylation-expression associations do not establish causality; tissue composition, developmental stage and drought severity may affect the results.'),
        next:L('完成 WGBS 与 RNA-seq 样本配对核对','Verify WGBS and RNA-seq sample pairing'),
        assay:L('干旱处理叶片核酸提取与送样核对','Drought-treated leaf nucleic-acid extraction and sample handoff'),
        sample:'RICE-B1..B4 / control-drought',file:'sample-pairing.tsv',finished:false,
        analysis:L('检查甲基化转换率、覆盖与 CG/CHG/CHH','Review conversion, coverage and CG/CHG/CHH contexts'),
        quick:L('阅读植物 DMR–表达关联的方法与因果局限','Review plant DMR-expression methods and causal limitations'),
        milestones:[L('多组学样本与坐标统一','Harmonize multi-omics samples and coordinates'),L('甲基化与表达独立质控','Review methylation and expression QC separately'),L('候选区域关联与验证设计','Associate candidate regions and design validation')]
      },
      {
        key:'tomato-rhizosphere',workflow:'amplicon',cat:'analysis',deadline:'later',
        title:L('番茄根际微生物与低磷响应','Tomato rhizosphere microbiota and low-phosphorus response'),
        question:L('低磷条件下，番茄根际群落变化与植株磷状态是否相关？','Are rhizosphere community changes associated with tomato phosphorus status under low phosphorus?'),
        design:L('示例设计：正常供磷与低磷，在随机区组中分配独立盆栽。根际土、植株表型和磷指标一一对应；加入提取空白与扩增阴性对照，避免把同一盆分装当作独立重复。','Example design: normal and low phosphorus, with independent pots assigned within randomized blocks. Match rhizosphere soil, plant phenotypes and phosphorus measurements; include extraction blanks and PCR negatives. Aliquots from one pot are not independent replicates.'),
        inputs:L('盆栽—根际土—植株表型映射、16S 原始数据、提取批次与阴性对照。','Pot/rhizosphere/phenotype mapping, raw 16S data, extraction batches and negative controls.'),
        reference:L('记录实际扩增区域、引物序列、分类数据库及训练集版本。','Record the amplified region, primer sequences, taxonomy database and classifier training release.'),
        parameters:L('依据读长与质量确定去噪参数；记录污染判定、组成性方法、PERMANOVA 区组约束及组间离散度检查。','Choose denoising settings from read lengths and quality; record contamination criteria, compositional methods, blocked PERMANOVA and dispersion checks.'),
        observation:L('演示记录：根际样本、提取空白和植株编号已配对；真实 DNA 质控与测序结果待录入。','Example record: rhizosphere samples, extraction blanks and plant IDs are paired. Actual DNA QC and sequencing results remain to be recorded.'),
        finding:L('保留空白对照与区组信息用于群落比较','Retain blanks and block information for community comparisons'),
        limitation:L('16S 组成不能直接代表绝对丰度或功能；与磷指标的关联仍需独立实验支持。','16S composition does not directly measure absolute abundance or function; associations with phosphorus measurements require independent experimental support.'),
        next:L('核对根际样本、空白对照和植株磷指标','Match rhizosphere samples, blanks and plant phosphorus measurements'),
        assay:L('番茄根际 DNA 提取与阴性对照登记','Tomato rhizosphere DNA extraction and negative-control registration'),
        sample:'TOM-P01..08 / BLANK-01..02',file:'rhizosphere-sample-map.tsv',finished:false,
        analysis:L('复核 ASV 去噪、阴性对照与污染筛查','Review ASV denoising, negatives and contamination screening'),
        quick:L('整理低磷项目的样本交接清单','Prepare the low-phosphorus sample handoff checklist'),
        milestones:[L('根际—植株—对照编号核对','Verify rhizosphere/plant/control IDs'),L('ASV 与分类注释复核','Review ASVs and taxonomy'),L('群落比较与磷指标关联','Compare communities and phosphorus measurements')]
      }
    ];
    specs.push(
      {
        key:'maize-heat',workflow:'rnaseq',cat:'analysis',deadline:'later',
        title:L('玉米高温胁迫与花粉活力','Maize heat stress and pollen viability'),
        question:L('开花期高温响应的候选基因是否与花粉活力和结实表型共同变化？','Do candidate flowering-stage heat-response genes covary with pollen viability and seed-set traits?'),
        design:L('示例设计：同一玉米遗传背景，在区组中分配常温与高温处理；记录花期、穗位和实际冠层温度。以植株为独立重复，按授粉批次平衡采样。','Example design: assign ambient and heat treatments within blocks in one maize genetic background. Record flowering stage, ear position and canopy temperature. Treat plants as biological replicates and balance collection across pollination batches.'),
        inputs:L('花粉活力、结实率、穗粒数、叶/花序 RNA-seq 样本映射。','Pollen viability, seed set, kernels per ear and leaf/inflorescence RNA-seq sample map.'),
        reference:L('填写实际玉米参考基因组、注释、转录本和性状测定 SOP 版本。','Record the maize genome, annotation, transcript and phenotype-assay SOP releases actually used.'),
        parameters:L('处理×基因型设计应按实际因子指定；检查区组、采样时段与热处理是否混杂。保存对比、效应量、FDR 和温度记录。','Specify treatment-by-genotype terms for the actual design. Check confounding among blocks, collection time and heat exposure. Preserve contrasts, effects, FDR and temperature records.'),
        observation:L('演示记录：花粉活力测定表与样本映射已准备；真实温度曲线、活力读数及表达结果待录入。','Example record: pollen-viability sheet and sample map prepared. Actual temperature traces, viability readings and expression results remain to be entered.'),
        finding:L('将花期、温度暴露和花粉表型一起整理','Organize flowering stage, heat exposure and pollen phenotypes together'),
        limitation:L('高温同时影响发育进程与花器官；未匹配花期和授粉条件前，表达差异不能归因于耐热机制。','Heat can alter development and floral organs. Expression differences cannot be attributed to a tolerance mechanism until flowering stage and pollination conditions are matched.'),
        next:L('核对热处理温度曲线与花粉样本编号','Verify heat-treatment traces and pollen sample IDs'),
        assay:L('玉米花粉活力与结实性状记录','Maize pollen viability and seed-set phenotyping'),
        sample:'MAIZE-A01..08 / HEAT-A01..08',file:'pollen-phenotype.tsv',finished:false,
        analysis:L('检查热处理组间花期和区组分布','Review flowering stage and block balance across heat treatments'),
        quick:L('整理高温处理与花粉活力测定 SOP 版本','Record heat treatment and pollen viability SOP versions'),
        milestones:[L('处理温度与开花时期核对','Verify treatment temperature and flowering stage'),L('表型和表达数据质控','QC phenotype and expression data'),L('候选基因与独立验证计划','Prioritize candidates and plan validation')]
      },
      {
        key:'wheat-rust',workflow:'rnaseq',cat:'project',deadline:'later',
        title:L('小麦叶锈菌互作与抗性候选基因','Wheat leaf-rust interaction and resistance candidates'),
        question:L('接种后宿主表达变化在何时出现，哪些候选与抗性表型相伴？','When do host expression changes emerge after inoculation, and which candidates track resistance phenotypes?'),
        design:L('示例设计：明确小麦品种、菌株/小种、接种批次与时间点；设置匹配 mock 对照与独立植株重复。记录病程评分和取样叶位，并按接种批次平衡。','Example design: define wheat cultivar, isolate/race, inoculation batch and time points. Include matched mock controls and independent plant replicates. Record disease scores and sampled leaf positions, balancing across inoculation batches.'),
        inputs:L('宿主 RNA-seq、病程评分、接种与 mock 样本映射、病原体材料来源记录。','Host RNA-seq, disease scores, inoculated/mock sample map and pathogen-material provenance.'),
        reference:L('记录小麦参考组装、基因注释、菌株身份及宿主/病原比对策略。','Record wheat assembly, gene annotation, isolate identity and host/pathogen read-classification strategy.'),
        parameters:L('先核对时间点、批次与接种成功；保存宿主与病原 reads 处理、设计公式、效应量和 FDR。','Verify time points, batches and inoculation success first. Preserve host/pathogen read handling, design formula, effects and FDR.'),
        observation:L('演示记录：接种与 mock 编号及病程评分模板已建立；菌株鉴定、病情数据和序列表达结果仍待真实记录。','Example record: inoculated/mock IDs and disease-scoring sheet prepared. Isolate identity, disease data and sequencing results still require real records.'),
        finding:L('按时间点保留宿主反应与病程评分的对应关系','Preserve the alignment between host responses and disease scores over time'),
        limitation:L('感染进程和接种均一性可能驱动表达差异；时间点或病原身份未核实前不推断抗性机制。','Infection progress and inoculation uniformity may drive expression differences. Do not infer resistance mechanisms before time points and pathogen identity are verified.'),
        next:L('复核接种批次、mock 对照和病程评分','Review inoculation batches, mock controls and disease scores'),
        assay:L('小麦叶锈菌接种批次与病程调查','Wheat leaf-rust inoculation and disease scoring'),
        sample:'WHEAT-R01..06 / MOCK-R01..06',file:'infection-timepoints.tsv',finished:false,
        analysis:L('整理感染时间点并检查宿主/病原 reads 分类','Organize infection time points and review host/pathogen read classification'),
        quick:L('核对菌株/小种来源及病程调查记录','Verify isolate/race provenance and disease-scoring records'),
        milestones:[L('菌株与接种设计确认','Confirm isolate and inoculation design'),L('病程与时间序列数据核对','Review disease and time-course data'),L('抗性候选与验证路线整理','Prioritize resistance candidates and validation')]
      },
      {
        key:'soybean-nodulation',workflow:'amplicon',cat:'analysis',deadline:'later',
        title:L('大豆根瘤共生与根际群落','Soybean nodulation and rhizosphere communities'),
        question:L('接种处理与土壤条件如何关联根瘤表型、固氮指标和根际群落？','How are inoculation and soil conditions associated with soybean nodulation, nitrogen-fixation traits and rhizosphere communities?'),
        design:L('示例设计：设置接种与 mock 及明确的氮素条件，在随机区组中使用独立盆栽。记录大豆品种、菌株身份、培养基质、植株生长阶段和采样盆号；根瘤与根际样本一一映射。','Example design: include inoculated/mock and defined nitrogen conditions using independent pots in randomized blocks. Record soybean cultivar, strain identity, substrate, growth stage and pot IDs; map nodules and rhizosphere samples one-to-one.'),
        inputs:L('根瘤数量/质量、植株氮指标、根际 16S 数据、接种株身份及盆栽区组。','Nodule count/mass, plant nitrogen traits, rhizosphere 16S data, inoculant identity and pot blocks.'),
        reference:L('记录扩增区域、引物、分类数据库版本、菌株身份鉴定方法与氮素测定 SOP。','Record amplicon region, primers, taxonomy database, strain-identification method and nitrogen-assay SOP.'),
        parameters:L('保留空白、阴性对照和接种验证；按盆栽而非技术重复进行推断，检查区组、基质批次和氮条件。','Retain blanks, negatives and inoculation checks. Infer at pot level rather than from technical replicates; review blocks, substrate batches and nitrogen conditions.'),
        observation:L('演示记录：盆栽—根瘤—根际样本编号表已建立；真实结瘤、氮指标与测序结果待录入。','Example record: pot/nodule/rhizosphere ID map prepared. Actual nodulation, nitrogen traits and sequencing results remain to be entered.'),
        finding:L('统一盆栽编号后再整合结瘤和根际数据','Harmonize pot IDs before integrating nodulation and rhizosphere data'),
        limitation:L('16S 相对组成不等同于固氮功能或绝对菌量；关联需结合接种验证、氮指标和对照解释。','16S relative composition is not nitrogen-fixation function or absolute abundance. Interpret associations with inoculation checks, nitrogen traits and controls.'),
        next:L('核对根瘤表型与根际样本的盆栽映射','Verify the pot-level mapping between nodule phenotypes and rhizosphere samples'),
        assay:L('大豆根瘤表型与根际样本采集','Soybean nodule phenotyping and rhizosphere sampling'),
        sample:'SOY-B01..08 / MOCK-B01..08',file:'pot-nodule-rhizosphere-map.tsv',finished:false,
        analysis:L('复核阴性对照、菌株身份与盆栽区组','Review negative controls, inoculant identity and pot blocks'),
        quick:L('整理大豆根瘤取样和氮指标交接清单','Prepare soybean nodule sampling and nitrogen-trait handoff checklist'),
        milestones:[L('菌株、盆栽与样本映射核对','Verify strain, pots and sample mapping'),L('结瘤和群落数据质控','QC nodulation and community data'),L('关联分析与独立验证规划','Plan association analysis and independent validation')]
      }
    );
    const additionKeys=new Set(['maize-heat','wheat-rust','soybean-nodulation']);
    const activeSpecs=variant==='english-additions'?specs.filter(s=>additionKeys.has(s.key)):specs;
    const exampleSet=SET;
    const data=C.empty();
    for(const [index,s] of activeSpecs.entries()){
      const prefix='example_plant_'+(variant==='english-additions'?'en_':'')+s.key,pid=prefix+'_project',eid=prefix+'_experiment';
      const workflow=R.instantiate(s.workflow,lang);
      workflow.steps.forEach((step,i)=>{step.id=prefix+'_analysis_'+i;if(i===0){step.status='done';step.note=warning;step.updatedAt=at;}});
      const root='researcher@cluster:/example-data/'+s.key;
      const artifact={id:prefix+'_samplefile',name:L('样本表（示例路径）','Sample sheet (placeholder)'),path:root+'/samples.tsv',type:'remote',note:warning,stepId:workflow.steps[0].id,createdAt:at};
      const nextId=prefix+'_next';
      data.projects.push({
        id:pid,example_set:exampleSet,example_key:s.key,example_locale:lang,title:L('[示例] ','[Example] ')+s.title,cat:s.cat,deadline:s.deadline,deadline_date:date(21+index*7),status:'active',time_planned_hours:24+index*8,time_spent_hours:0,createdAt:now,
        summary:warning,blocker:'',analysis_workflow:workflow,artifacts:[artifact],linked_experiment_ids:[],
        research_context:{question:s.question,design:s.design,inputs:s.inputs,reference:s.reference,software:L('填写真实流程 release、软件版本、容器或环境文件；当前未执行分析。','Record actual workflow releases, software versions and container/environment files; no analysis has been executed.'),parameters:s.parameters,conclusion:warning+' '+L('当前仅展示记录链路，尚未形成生物学结论。','This demonstrates record linkage; no biological conclusion has been established.')},
        milestones:s.milestones.map((title,i)=>({id:prefix+'_milestone_'+i,title,done:i===0,doneAt:i===0?at:null,deadline:date(3+i*7+index*3)})),
        evidence:[
          {id:prefix+'_finding',kind:'finding',title:s.finding,detail:warning+' '+s.observation,status:'planned',sourceIds:[artifact.id,'exp:'+eid],createdAt:at},
          {id:prefix+'_limitation',kind:'limitation',title:L('局限与待验证事项','Limitations and validation needs'),detail:s.limitation,status:'planned',sourceIds:[workflow.steps[0].id],createdAt:at},
          {id:nextId,kind:'next_step',title:s.next,detail:L('先核对样本身份和原始记录，保留检查依据后再更新结论。','Verify sample identity and raw records; retain review evidence before updating conclusions.'),status:'planned',sourceIds:['exp:'+eid],createdAt:at}
        ]
      });
      const steps=[
        {title:L('核对样本、批次和对照','Verify samples, batches and controls'),kind:'active',minutes:10},
        {title:L('按本实验室已验证 SOP 执行（时长为演示）','Follow the validated local SOP (demonstration duration)'),kind:'active',minutes:30},
        {title:L('记录质控、偏差与原始文件','Record QC, deviations and raw files'),kind:'active',minutes:15}
      ].map((step,i)=>({...step,id:prefix+'_labstep_'+i,tolerance:0,status:s.finished?'done':'pending',startedAt:null,dueAt:null,completedAt:s.finished?at:null}));
      data.experiments.push({id:eid,example_set:exampleSet,example_key:s.key,example_locale:lang,title:L('[示例] ','[Example] ')+s.assay,project_id:pid,sample:s.sample,lot:L('示例：请填写真实试剂批号','Example: enter actual reagent lots'),equipment:L('示例：请填写仪器与位置','Example: enter instrument and location'),notes:warning+' '+s.observation,createdAt:at,completedAt:s.finished?at:null,
        checklist:[{id:prefix+'_check_1',text:L('核对独立生物学样本、批次与对照','Verify independent biological samples, batches and controls'),done:s.finished},{id:prefix+'_check_2',text:L('替换为本实验室 SOP，核对时长与设备','Use the local SOP and verify timing and equipment'),done:s.finished}],steps,
        artifacts:[{id:prefix+'_labfile',name:L('原始记录（示例路径）','Raw record (placeholder)'),path:root+'/'+s.file,type:'remote',note:warning,createdAt:at}],
        events:[{id:prefix+'_event',at,action:'note',detail:warning+' '+L('此记录为内置模拟示例。','This is a bundled fictional record.')}]
      });
      const tasks=[
        {suffix:'analysis',title:s.analysis,cat:'analysis',effort:'h1',focus:'deep',deadline:'this_week',analysis_step_id:workflow.steps[2].id,run_state:index===1?'waiting':'',wait_note:index===1?L('模拟等待：请替换为真实作业号；应用没有提交计算任务。','Simulated waiting: replace with a real job ID; the app has submitted no compute job.'):'',progress:index===0?25:0},
        {suffix:'next',title:s.next,cat:'wetlab',effort:'m30',focus:'shallow',deadline:'today',analysis_step_id:'action_'+nextId},
        {suffix:'quick',title:s.quick,cat:index===1?'literature':index===0?'meeting':'admin',effort:'m15',focus:'shallow',deadline:'this_week',done:index===0,progress:index===0?100:0,result_note:index===0?warning+' '+L('示例图注与局限清单已整理。','Example captions and limitations organized.'):''}
      ];
      tasks.forEach(t=>{const {suffix,...fields}=t;data.tasks.push({id:prefix+'_task_'+suffix,example_set:exampleSet,example_key:s.key,example_locale:lang,project_id:pid,impact:'mild',flex:'only_me',time_spent:0,createdAt:now,completedAt:t.done?at:null,...fields,title:L('[示例] ','[Example] ')+t.title});});
    }
    return C.migrate(data);
  }
  function add(current,lang='zh-CN',now=Date.now()){
    const out=C.migrate(current),sample=create(lang,now);
    for(const key of ['projects','tasks','experiments']){
      const ids=new Set(out[key].map(x=>x.id));
      out[key].push(...sample[key].filter(x=>!ids.has(x.id)));
    }
    return C.migrate(out);
  }
  function addEnglish(current,now=Date.now()){
    const out=C.migrate(current),sample=create('en',now,'english-additions');
    const represented=new Set(out.projects.filter(p=>p.example_locale==='en'&&p.example_key).map(p=>p.example_key));
    const missing=new Set(sample.projects.filter(p=>!represented.has(p.example_key)).map(p=>p.example_key));
    for(const key of ['projects','tasks','experiments']){
      const ids=new Set(out[key].map(x=>x.id));
      out[key].push(...sample[key].filter(x=>missing.has(x.example_key)&&!ids.has(x.id)));
    }
    return C.migrate(out);
  }
  return {SET,create,add,addEnglish};
});
