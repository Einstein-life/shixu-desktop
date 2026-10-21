/* Research planning and evidence records. No analysis commands are executed. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ResearchCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const uid = () => 'r_' + Date.now().toString(36) + Math.random().toString(36).slice(2,10);
  const str = x => String(x ?? '');
  const pair = (zh,en) => ({zh,en});
  const step = (zh,en,output,qc) => ({title:pair(zh,en),output:pair(...output),qc:pair(...qc)});
  const design = step('研究设计与样本表','Study design and sample sheet',['分组、重复、批次、协变量与主要比较','Groups, replicates, batches, covariates and primary contrasts'],['确认独立生物学重复；检查混杂与配对关系','Verify independent biological replicates; assess confounding and pairing']);
  const rawqc = step('原始数据质控','Raw data QC',['FastQC / fastp 与 MultiQC 报告','FastQC / fastp and MultiQC reports'],['检查接头、质量分布、污染及样本一致性；记录排除理由','Review adapters, quality, contamination and sample identity; record exclusions']);
  const report = step('图表、方法与结果归档','Figures, methods and result archive',['主图、结果表、脚本、运行日志、Methods 草稿','Figures, result tables, scripts, run logs and Methods draft'],['保留参数、软件版本、参考资源版本及对照定义；记录支持与不支持的结论','Preserve parameters, software and reference versions, contrasts, and supported or unsupported conclusions']);
  const templates = [
    {id:'rnaseq',title:pair('Bulk RNA-seq 差异表达','Bulk RNA-seq differential expression'),source:'https://github.com/nf-core/rnaseq',steps:[design,rawqc,
      step('比对或伪比对与定量','Alignment or pseudoalignment and quantification',['STAR / Salmon 基因或转录本定量矩阵','STAR / Salmon gene or transcript quantification matrix'],['核对链特异性、参考基因组与注释版本；检查比对与覆盖情况','Verify strandedness and matching genome/annotation releases; review mapping and coverage']),
      step('样本关系与统计设计','Sample relationships and statistical design',['PCA、样本距离、设计公式与 contrasts','PCA, sample distances, design formula and contrasts'],['检查批次、离群与配对；不能用批次校正替代可识别的设计','Assess batches, outliers and pairing; batch correction cannot fix an unidentifiable design']),
      step('差异表达与功能解释','Differential expression and functional interpretation',['DESeq2 / edgeR 结果、FDR、富集与基因集结果','DESeq2 / edgeR results, FDR, enrichment and gene-set results'],['使用适配的输入计数和模型；记录效应量、多重检验与背景基因集','Use appropriate counts and models; record effect sizes, multiple testing and background gene sets']),report]},
    {id:'scrnaseq',title:pair('单细胞 RNA-seq','Single-cell RNA-seq'),source:'https://github.com/nf-core/scrnaseq',steps:[design,rawqc,
      step('计数矩阵与细胞质控','Count matrix and cell QC',['基因×细胞矩阵、细胞元数据与过滤表','Gene-by-cell matrix, cell metadata and filtering table'],['按样本检查低质量细胞、双细胞及环境 RNA；阈值需有依据','Assess low-quality cells, doublets and ambient RNA per sample; justify thresholds']),
      step('归一化、整合与聚类','Normalization, integration and clustering',['Seurat / Scanpy 对象、嵌入与聚类结果','Seurat / Scanpy objects, embeddings and clusters'],['保留原始计数；检查整合是否掩盖生物差异','Preserve raw counts; check that integration does not remove biological effects']),
      step('细胞注释与样本层面比较','Cell annotation and sample-level comparisons',['标记基因、注释依据、pseudobulk / 组成比较','Markers, annotation evidence, pseudobulk or composition comparisons'],['以生物学样本而非单个细胞作为独立重复；标明不确定注释','Use biological samples rather than individual cells as independent replicates; mark uncertain annotations']),report]},
    {id:'atacseq',title:pair('ATAC-seq 染色质可及性','ATAC-seq chromatin accessibility'),source:'https://github.com/nf-core/atacseq',steps:[design,rawqc,
      step('比对、过滤与文库评估','Alignment, filtering and library assessment',['过滤 BAM、片段长度、TSS 富集与重复率','Filtered BAM, fragment lengths, TSS enrichment and duplication metrics'],['核对线粒体比例、blacklist 与文库复杂度；区分单端和双端策略','Review mitochondrial fraction, blacklist and complexity; distinguish single-end and paired-end strategies']),
      step('峰检测与共识峰集','Peak calling and consensus peaks',['MACS 峰、重复一致性与共识峰计数','MACS peaks, replicate concordance and consensus-peak counts'],['避免只用一组定义峰集造成偏倚；记录峰集合并方法','Avoid group-biased peak selection; document consensus construction']),
      step('差异可及性、注释与 motif','Differential accessibility, annotation and motifs',['差异峰、效应量、注释与 motif 结果','Differential peaks, effect sizes, annotations and motif results'],['记录统计设计、FDR 和背景；峰邻近关系不能直接证明调控','Record design, FDR and background; peak proximity alone does not establish regulation']),report]},
    {id:'chipseq',title:pair('ChIP-seq / CUT&Tag 富集分析','ChIP-seq / CUT&Tag enrichment'),source:'https://github.com/nf-core/chipseq',steps:[design,rawqc,
      step('比对与背景评估','Alignment and background assessment',['过滤 BAM、覆盖轨道与背景报告','Filtered BAM, coverage tracks and background report'],['根据实验类型核对 input / IgG / spike-in 对照及归一化方案','Choose input, IgG or spike-in controls and normalization for the assay']),
      step('峰检测与重复一致性','Peak calling and replicate concordance',['宽峰或窄峰、FRiP 与重复比较','Broad or narrow peaks, FRiP and replicate comparisons'],['依据靶标和实验选择峰模型；CUT&Tag 需单独验证参数','Choose peak models for the target and assay; validate CUT&Tag parameters separately']),
      step('差异富集与功能注释','Differential enrichment and functional annotation',['共识峰计数、差异结果、注释与可视化','Consensus counts, differential results, annotations and visualization'],['检查全局变化的归一化假设与对照；记录背景区域','Check normalization assumptions for global changes and controls; record background regions']),report]},
    {id:'methylseq',title:pair('WGBS / RRBS DNA 甲基化','WGBS / RRBS DNA methylation'),source:'https://github.com/nf-core/methylseq',steps:[design,rawqc,
      step('亚硫酸氢盐比对与甲基化提取','Bisulfite alignment and methylation extraction',['Bismark / bwa-meth 比对、位点覆盖与甲基化计数','Bismark / bwa-meth alignment, coverage and methylation counts'],['核对文库方向性、转换率、M-bias 和 CpG / CHG / CHH 背景','Verify directionality, conversion, M-bias and CpG / CHG / CHH contexts']),
      step('覆盖过滤与差异甲基化','Coverage filtering and differential methylation',['覆盖过滤表、DMC / DMR、效应量与 FDR','Coverage filters, DMC / DMR, effect sizes and FDR'],['区分 WGBS / RRBS 覆盖；模型考虑生物重复、配对和协变量','Account for WGBS / RRBS coverage; model replicates, pairing and covariates']),
      step('区域注释与表达联合分析','Region annotation and expression integration',['启动子、基因体、TE 注释及 DMR–DEG 关联表','Promoter, gene-body and TE annotations and DMR–DEG associations'],['统一参考版本与区域定义；相关方向不能直接证明因果','Match reference releases and region definitions; association is not causation']),report]},
    {id:'variants',title:pair('WGS / WES 变异分析','WGS / WES variant analysis'),source:'https://github.com/nf-core/sarek',steps:[design,rawqc,
      step('比对与覆盖评估','Alignment and coverage assessment',['BAM / CRAM、覆盖报告与样本一致性报告','BAM / CRAM, coverage and sample concordance reports'],['确认参考 build、捕获区域、重复率、污染与样本身份','Verify reference build, capture regions, duplication, contamination and identity']),
      step('变异检测与过滤','Variant calling and filtering',['VCF、过滤规则与检测流程版本','VCF, filtering rules and caller/workflow version'],['区分胚系与体细胞、倍性及配对策略；保留过滤前记录','Distinguish germline/somatic, ploidy and pairing; preserve prefilter records']),
      step('注释、优先级与验证计划','Annotation, prioritization and validation plan',['注释 VCF、候选变异表与验证计划','Annotated VCF, candidate variants and validation plan'],['核对数据库与转录本版本；研究候选结果需独立验证','Record database and transcript versions; independently validate research candidates']),report]},
    {id:'smrnaseq',title:pair('small RNA / miRNA 测序','Small RNA / miRNA sequencing'),source:'https://github.com/nf-core/smrnaseq',steps:[design,rawqc,
      step('接头去除与长度分布','Adapter trimming and length distribution',['去接头 reads 与长度分布报告','Trimmed reads and read-length reports'],['核对试剂盒接头、UMI 结构与目标 small RNA 长度分布','Verify kit adapters, UMI structure and target small-RNA lengths']),
      step('分层注释与定量','Hierarchical annotation and quantification',['miRNA / siRNA / tRNA / rRNA / TE 等计数表','miRNA / siRNA / tRNA / rRNA / TE count tables'],['记录多重比对、重复序列与注释优先级策略','Document multimapping, repetitive sequences and annotation hierarchy']),
      step('差异 small RNA 与靶标关联','Differential small RNAs and target associations',['差异表、靶标预测与表达关联','Differential results, target predictions and expression associations'],['预测靶标需注明工具和证据等级；区分预测与实验验证','Record prediction tools and evidence strength; distinguish predictions from validation']),report]},
    {id:'amplicon',title:pair('16S / ITS 扩增子分析','16S / ITS amplicon analysis'),source:'https://github.com/nf-core/ampliseq',steps:[design,rawqc,
      step('引物去除、去噪与 ASV','Primer removal, denoising and ASVs',['ASV 表、代表序列与去噪统计','ASV table, representative sequences and denoising statistics'],['核对扩增区域、负对照、截断参数与嵌合体去除','Check target region, negative controls, trimming and chimera removal']),
      step('分类注释与多样性','Taxonomic assignment and diversity',['分类表、alpha / beta 多样性与排序图','Taxonomy, alpha/beta diversity and ordination'],['记录分类库版本、测序深度及距离定义','Record taxonomy database version, depth and distance metrics']),
      step('群落差异与混杂评估','Community differences and confounding',['组成差异、统计结果与协变量敏感性分析','Composition differences, statistics and covariate sensitivity analysis'],['考虑组成性、批次、配对、多重检验与离散度差异','Consider compositionality, batches, pairing, multiple testing and dispersion']),report]},
    {id:'metagenomics',title:pair('宏基因组分析','Shotgun metagenomics'),source:'https://github.com/nf-core/mag',steps:[design,rawqc,
      step('宿主过滤与分类 / 功能概览','Host filtering and taxonomic/functional overview',['去宿主 reads、物种与功能丰度','Host-filtered reads, taxonomic and functional abundances'],['记录宿主参考和数据库版本；核对阴性对照与污染','Record host reference and databases; review negatives and contamination']),
      step('组装与分箱（按研究目的选择）','Assembly and binning (when appropriate)',['组装 contigs、MAG 与质量报告','Assembled contigs, MAGs and quality reports'],['区分 read-based 与 assembly-based 路径；记录完整度和污染度','Distinguish read-based and assembly-based paths; record completeness and contamination']),
      step('比较分析与功能解释','Comparative analysis and functional interpretation',['差异丰度、通路与候选功能表','Differential abundance, pathways and candidate functions'],['控制批次与组成性；数据库注释不等同于功能验证','Address batches and compositionality; annotation does not establish function']),report]},
    {id:'proteomics',title:pair('定量蛋白质组学','Quantitative proteomics'),source:'https://github.com/nf-core/quantms',steps:[design,
      step('原始谱图与鉴定质控','Raw spectra and identification QC',['原始 MS 文件、PSM / 肽段 / 蛋白鉴定','Raw MS files, PSM/peptide/protein identifications'],['区分 DDA / DIA / 标记定量；记录搜索库、污染物、修饰与各层 FDR','Distinguish DDA/DIA/labeled quantification; record database, contaminants, modifications and FDR levels']),
      step('定量矩阵与缺失值评估','Quantification matrix and missingness assessment',['蛋白丰度矩阵、样本质控与缺失模式','Protein abundance matrix, sample QC and missingness patterns'],['记录归一化与插补假设；区分生物重复与技术重复','Document normalization and imputation assumptions; separate biological and technical replicates']),
      step('差异蛋白与功能解释','Differential proteins and functional interpretation',['效应量、FDR、通路与候选蛋白','Effect sizes, FDR, pathways and candidate proteins'],['保留蛋白分组与共享肽段信息；验证关键候选','Preserve protein groups and shared-peptide information; validate key candidates']),report]},
    {id:'metabolomics',title:pair('代谢组学分析','Metabolomics analysis'),source:'https://github.com/sneumann/xcms',steps:[design,
      step('原始数据与峰提取','Raw data and peak extraction',['原始谱图、峰表、空白与混合 QC 记录','Raw spectra, peak table, blanks and pooled-QC records'],['区分靶向与非靶向、离子模式、内标及采集顺序','Distinguish targeted/untargeted, ion modes, internal standards and acquisition order']),
      step('峰对齐、过滤与漂移评估','Alignment, filtering and drift assessment',['对齐特征表、QC 变异与漂移报告','Aligned features, QC variability and drift report'],['依据 QC / 空白制定过滤；记录归一化、漂移校正及缺失处理','Use QC/blanks to justify filters; document normalization, drift correction and missingness']),
      step('差异分析与代谢物鉴定','Differential analysis and metabolite identification',['统计结果、谱库匹配与鉴定等级','Statistics, spectral-library matches and identification confidence'],['检查模型过拟合与多重检验；m/z 匹配不等于确证鉴定','Assess overfitting and multiple testing; m/z matches alone do not confirm identity']),report]},
    {id:'multiomics',title:pair('多组学联合与机制验证','Multi-omics integration and validation'),source:'https://github.com/bioFAM/MOFA2',steps:[design,
      step('各组学独立质控与标识统一','Per-omics QC and identifier harmonization',['通过各自质控的数据、样本映射与特征映射','Per-omics QC outputs, sample and feature mappings'],['核对同一样本、时间点、参考版本和缺失样本；防止信息泄漏','Match samples, time points, references and missing samples; prevent data leakage']),
      step('整合建模与敏感性分析','Integration modeling and sensitivity analysis',['关联 / 潜变量 / 网络模型与稳定性结果','Association, latent-factor or network models and stability results'],['控制批次、样本量与混杂；记录训练/验证划分和模型选择','Address batches, sample size and confounding; document train/validation splits and model selection']),
      step('证据汇总与验证路线','Evidence synthesis and validation plan',['候选机制、相反证据、验证优先级与实验设计','Candidate mechanisms, contradictory evidence, priorities and validation design'],['明确相关性与因果性；保留阴性结果并安排独立验证','Separate association and causation; retain negative results and plan independent validation']),report]}
  ];
  const local = (value,lang) => typeof value === 'string' ? value : value[lang==='en'?'en':'zh'];
  function instantiate(id,lang='zh-CN') {
    const t=templates.find(x=>x.id===id);
    if(!t)throw new Error('UNKNOWN_TEMPLATE');
    return {id:t.id,title:local(t.title,lang),source:t.source,steps:t.steps.map(s=>({id:uid(),title:local(s.title,lang),output:local(s.output,lang),qc:local(s.qc,lang),status:'pending',note:'',updatedAt:null}))};
  }
  function items(value) {return Array.isArray(value)?value.filter(x=>x&&typeof x==='object'&&!Array.isArray(x)):[];}
  function unique(rows) {
    const ids=new Set();
    return rows.map(row=>{let id=typeof row.id==='string'&&/^[\w.-]+$/.test(row.id)?row.id:uid();while(ids.has(id))id=uid();ids.add(id);return {...row,id};});
  }
  function normalizeWorkflow(raw) {
    const w=raw&&typeof raw==='object'?raw:{};
    return {...w,id:str(w.id||'custom'),title:str(w.title),source:str(w.source),
      steps:unique(items(w.steps)).map(s=>({...s,title:str(s.title),output:str(s.output),qc:str(s.qc),note:str(s.note),status:['pending','running','done','blocked'].includes(s.status)?s.status:'pending',updatedAt:s.updatedAt||null})).filter(s=>s.title.trim())};
  }
  function normalizeArtifacts(raw) {
    return unique(items(raw)).map(a=>({...a,name:str(a.name),path:str(a.path),type:['file','folder','link','remote'].includes(a.type)?a.type:'file',note:str(a.note),stepId:str(a.stepId),createdAt:a.createdAt||new Date().toISOString()})).filter(a=>a.name.trim()||a.path.trim());
  }
  const contextFields=['question','design','inputs','reference','software','parameters','conclusion'];
  function normalizeEvidenceRows(raw) {
    return unique(items(raw)).map((x,i)=>({
      id:typeof x.id==='string'&&/^[\w.-]+$/.test(x.id)?x.id:uid(),
      title:str(x.title),kind:['finding','limitation','next_step'].includes(x.kind)?x.kind:'finding',
      detail:str(x.detail),status:['planned','in_progress','done','blocked'].includes(x.status)?x.status:'planned',
      sourceIds:Array.from(new Set(Array.isArray(x.sourceIds)?x.sourceIds.filter(id=>typeof id==='string'):[])),
      createdAt:x.createdAt||new Date().toISOString(),updatedAt:x.updatedAt||null
    })).filter(x=>x.title.trim()||x.detail.trim());
  }
  function evidenceFromExperiment(experiment) {
    const e=experiment||{},key='exp:'+str(e.id),notes=str(e.notes).trim();
    if(!e.id)return null;
    return {id:key,title:str(e.title)||key,kind:'experiment',detail:notes,status:e.completedAt?'done':'in_progress',sourceIds:[key],createdAt:e.createdAt||null,updatedAt:e.events?.slice(-1)[0]?.at||e.completedAt||null,metadata:{sample:e.sample||'',lot:e.lot||'',equipment:e.equipment||'',steps:(e.steps||[]).map(s=>({title:s.title,status:s.status,minutes:s.minutes,completedAt:s.completedAt})),eventCount:(e.events||[]).length}};
  }
  function analysisEvidence(project,experiments=[]) {
    const p=normalizeProject(project),linked=new Set(p.linked_experiment_ids);
    const selected=experiments.filter(e=>e.project_id===p.id||linked.has(e.id));
    const derived=selected.map(evidenceFromExperiment).filter(Boolean);
    const sources=[...p.artifacts.map(a=>({id:a.id,kind:'artifact',title:a.name||a.path,detail:a.note,path:a.path})),...p.analysis_workflow.steps.map(s=>({id:s.id,kind:'analysis_step',title:s.title,detail:s.note})),...derived.map(x=>({...x,kind:'experiment'})),...selected.flatMap(e=>normalizeArtifacts(e.artifacts).map(a=>({id:`exp:${e.id}:file:${a.id}`,kind:'experiment_file',title:a.name||a.path,detail:a.note,path:a.path,experimentId:e.id})))];
    const sourceIds=new Set(sources.map(s=>s.id));
    return {items:p.evidence.map(x=>({...x,missingSourceIds:x.sourceIds.filter(id=>!sourceIds.has(id))})),linkedExperimentIds:selected.map(e=>e.id),missingExperimentIds:p.linked_experiment_ids.filter(id=>!selected.some(e=>e.id===id)),sources};
  }
  function normalizeProject(raw) {
    const p=raw||{},context=p.research_context||{};
    return {...p,analysis_workflow:normalizeWorkflow(p.analysis_workflow),artifacts:normalizeArtifacts(p.artifacts),evidence:normalizeEvidenceRows(p.evidence),linked_experiment_ids:Array.from(new Set((Array.isArray(p.linked_experiment_ids)?p.linked_experiment_ids:[]).filter(id=>typeof id==='string'))),research_context:Object.fromEntries(contextFields.map(k=>[k,str(context[k])]))};
  }
  function validateProject(raw) {
    for(const p of [raw]) {
      if(p.analysis_workflow!==undefined&&(!p.analysis_workflow||typeof p.analysis_workflow!=='object'||Array.isArray(p.analysis_workflow)))throw new Error('INVALID_DATA');
      for(const list of [p.artifacts,p.analysis_workflow?.steps])if(list!==undefined&&(!Array.isArray(list)||list.some(x=>!x||typeof x!=='object'||Array.isArray(x))))throw new Error('INVALID_DATA');
      if(p.evidence!==undefined&&(!Array.isArray(p.evidence)||p.evidence.some(x=>!x||typeof x!=='object'||Array.isArray(x)||x.sourceIds!==undefined&&(!Array.isArray(x.sourceIds)||x.sourceIds.some(id=>typeof id!=='string')))))throw new Error('INVALID_DATA');
      if(p.linked_experiment_ids!==undefined&&(!Array.isArray(p.linked_experiment_ids)||p.linked_experiment_ids.some(id=>typeof id!=='string')))throw new Error('INVALID_DATA');
    }
  }
  function target(value) {
    const v=str(value).trim();
    if(!v||/[\x00-\x1f]/.test(v))return {kind:'invalid'};
    if(/^https?:\/\//i.test(v)) {try {const u=new URL(v);return u.username||u.password?{kind:'invalid'}:{kind:'web',value:u.href};}catch{return {kind:'invalid'};}}
    if(/^[a-zA-Z]:[\\/]/.test(v)||/^\\\\[^\\]+\\[^\\]+/.test(v)||v.startsWith('/'))return {kind:'local',value:v};
    if(/^([\w.-]+@)?[\w.-]+:\/(?!\/)/.test(v)||/^s(?:sh|ftp):\/\//i.test(v))return {kind:'remote',value:v};
    return {kind:'invalid'};
  }
  function evidenceMarkdown(p,lang,experiments=[],section='conclusions') {
    const L=(zh,en)=>lang==='en'?en:zh,e=analysisEvidence(p,experiments),lines=[];
    const kinds={finding:L('结论','Conclusion'),limitation:L('局限 / 相反证据','Limitation / contradictory evidence'),next_step:L('下一步','Next step')};
    if(section!=='results'){
      for(const kind of section==='next'?['next_step']:['finding','limitation']){
        lines.push(`### ${kinds[kind]}`);
        for(const x of e.items.filter(x=>x.kind===kind)){lines.push(`#### ${x.title}`,x.detail,`${L('进度','Status')}: ${{planned:L('计划中','Planned'),in_progress:L('进行中','In progress'),done:L('已完成','Done'),blocked:L('受阻','Blocked')}[x.status]}`);for(const s of e.sources.filter(s=>x.sourceIds.includes(s.id)))lines.push(`- ${L('依据','Evidence')}: ${s.title}${s.path?' — '+s.path:''}${s.detail?' — '+s.detail:''}`);if(x.missingSourceIds.length)lines.push(L('部分证据来源已移除，请复核。','Some evidence sources were removed. Review this record.'));}
      }
      return lines;
    }
    lines.push(`### ${L('实验结果证据','Experiment result evidence')}`);
    for(const s of e.sources.filter(s=>s.kind==='experiment')){lines.push(`### ${s.title}`,s.detail||L('尚未填写实验结果','No experiment results recorded yet'),`${L('样本 / 批次','Sample / batch')}: ${s.metadata.sample}`,`${L('试剂批号','Reagent lot')}: ${s.metadata.lot}`,`${L('仪器','Instrument')}: ${s.metadata.equipment}`,...s.metadata.steps.map(x=>`- [${x.status==='done'?'x':' '}] ${x.title} · ${x.minutes} min${x.completedAt?' · '+x.completedAt:''}`));}
    for(const s of e.sources.filter(s=>s.kind==='experiment_file'))lines.push(`- ${s.title}: ${s.path}`);
    if(e.missingExperimentIds.length)lines.push(L('部分关联实验已不存在，请复核证据。','Some linked experiments no longer exist. Review the evidence.'));
    return lines;
  }
  function markdown(p,lang='zh-CN',experiments=[]) {
    p=normalizeProject(p);const L=(zh,en)=>lang==='en'?en:zh,w=p.analysis_workflow;
    const labels={design:L('设计与比较','Design and contrasts'),inputs:L('数据与样本','Inputs and samples'),reference:L('参考资源版本','Reference releases'),software:L('软件与环境版本','Software and environment'),parameters:L('参数与运行记录','Parameters and run records')};
    const lines=[`# ${p.title}`,'',`## 1. ${L('研究问题','Research question')}`,p.research_context.question,...Object.keys(labels).filter(k=>p.research_context[k]).flatMap(k=>[`### ${labels[k]}`,p.research_context[k],'']),`## 2. ${L('分析流程','Analysis workflow')}`,w.title];
    if(w.source)lines.push(`${L('参考','Reference')}: ${w.source}`);
    for(const s of w.steps)lines.push(`- [${s.status==='done'?'x':' '}] ${s.title} (${({pending:L('未开始','Pending'),running:L('进行中','Running'),done:L('已完成','Done'),blocked:L('受阻','Blocked')})[s.status]})`,s.output?`  ${L('产出','Output')}: ${s.output}`:'',s.qc?`  ${L('检查','Review')}: ${s.qc}`:'',s.note?`  ${L('记录','Notes')}: ${s.note}`:'',s.updatedAt?`  ${L('更新','Updated')}: ${s.updatedAt}`:'');
    lines.push('',`## 3. ${L('结果证据','Result evidence')}`,`### ${L('关联文件与结果','Linked files and results')}`);
    for(const a of p.artifacts){const s=w.steps.find(s=>s.id===a.stepId);lines.push(`- ${a.name||a.path} (${a.type})`, `  ${a.path}`,s?`  ${L('步骤','Step')}: ${s.title}`:'',a.note?`  ${a.note}`:'');}
    lines.push('',...evidenceMarkdown(p,lang,experiments,'results'),'',`## 4. ${L('结论','Conclusion')}`,p.research_context.conclusion,...evidenceMarkdown(p,lang,experiments),`## 5. ${L('下一步','Next steps')}`,...evidenceMarkdown(p,lang,experiments,'next'),`### ${L('里程碑计划','Milestone plan')}`,...(p.milestones||[]).map(m=>`- [${m.done?'x':' '}] ${m.title}${m.deadline?' — '+m.deadline:''}`));
    lines.push('',`## ${L('项目总结','Project summary')}`,str(p.summary),'',L('以上路径为引用；导出文件不包含被关联文件的内容。','Paths are references; this export does not contain the linked files.'));
    return lines.join('\n');
  }
  function proposal(p,lang='zh-CN',experiments=[]) {
    p=normalizeProject(p);const L=(zh,en)=>lang==='en'?en:zh,c=p.research_context,w=p.analysis_workflow,missing=L('待补充','To be specified');
    const lines=[`# ${p.title} — ${L('研究方案草稿','Research plan draft')}`,'',L('由项目记录组织生成。方法、假设、预算及可行性需由研究者核实补充。','Organized from project records. Methods, hypotheses, budget and feasibility require researcher review.'),'',`## 1. ${L('研究问题与假设','Research question and hypothesis')}`,c.question||missing,'',`### ${L('研究设计与数据基础','Design and data')}`,c.design||missing,c.inputs||missing,'',`## 2. ${L('分析流程与预期产出','Analysis workflow and expected outputs')}`,w.title||missing];
    for(const [i,s] of w.steps.entries())lines.push(`### ${i+1}. ${s.title}`,`${L('预期产出','Expected output')}: ${s.output||missing}`,`${L('质量控制与风险检查','Quality control and risk review')}: ${s.qc||missing}`,'');
    lines.push(`### ${L('可复现性记录','Reproducibility')}`,`${L('参考资源','References')}: ${c.reference||missing}`,`${L('软件环境','Software environment')}: ${c.software||missing}`,`${L('参数与运行记录','Parameters and run records')}: ${c.parameters||missing}`,`### ${L('方法参考资源','Method reference resources')}`,w.source||missing,'',`## 3. ${L('结果证据','Result evidence')}`,...p.artifacts.map(a=>`- ${a.name||a.path}: ${a.note||missing}\n  ${a.path}`),...evidenceMarkdown(p,lang,experiments,'results'),'',`## 4. ${L('结论与局限','Conclusion and limitations')}`,c.conclusion||p.summary||missing,...evidenceMarkdown(p,lang,experiments),'',`## 5. ${L('下一步与验证计划','Next steps and validation plan')}`,...evidenceMarkdown(p,lang,experiments,'next'),`### ${L('阶段计划','Milestone plan')}`,...(p.milestones||[]).map(m=>`- ${m.title}${m.deadline?' — '+m.deadline:''}`));
    return lines.join('\n');
  }
  return {uid,templates,local,instantiate,normalizeWorkflow,normalizeArtifacts,normalizeEvidenceRows,evidenceFromExperiment,analysisEvidence,normalizeProject,validateProject,target,markdown,proposal};
});
