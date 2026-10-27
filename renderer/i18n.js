(function(){
  'use strict';
  const map={...(window.SHIXU_TRANSLATIONS||{}),
    '时序 2.0 · 科研调度与实验执行':'Shixu · Research & Lab Workflows',
    '时序 2.0 · 科研调度':'Shixu · Research Scheduler',
    '时序 2.0 · 研究排程与实验执行':'Shixu · Research Scheduler & Lab Workflows',
    '时序 2.0 · 科研调度与项目进度':'Shixu · Research Scheduling & Projects'};
  const ignored='script,style,.task-name,.proj-title,.ms-item,.tl-title,.summary-box,.lab-note-box,.lab-check,.lab-step-title,[data-user-copy],input,textarea,pre,[contenteditable="true"],.lab-card h2';
  const prefixes=Object.entries(map).filter(([zh,en])=>zh&&zh!==en).sort((a,b)=>b[0].length-a[0].length);
  function text(value){
    const t=value.trim();if(!t||!/[\u3400-\u9fff]/.test(t))return value;
    const status=t.match(/^([●○]\s*)(.*)$/u);
    let out=map[t] || (status && map[status[2]] ? status[1]+map[status[2]] : undefined);
    if(!out){
      const prefix=prefixes.find(([zh])=>zh.length>=2&&t.startsWith(zh)&&/[\s：:·]$/.test(zh));
      if(prefix)out=prefix[1]+t.slice(prefix[0].length);
    }
    if(!out){
      for(const [zh,en] of prefixes){
        if(zh.length<2)continue;
        const i=t.indexOf(zh);if(i<0)continue;
        const before=t.slice(0,i),after=t.slice(i+zh.length);
        if((!before||/[·：:/]\s*$/.test(before))&&(!after||/^\s*[\d%]/.test(after))){out=before+en+after;break;}
      }
    }
    if(!out)return value;
    return value.slice(0,value.indexOf(t))+out+value.slice(value.indexOf(t)+t.length);
  }
  function node(n){
    if(n.nodeType===Node.TEXT_NODE){
      if(!n.parentElement?.closest(ignored)){const next=text(n.nodeValue);if(next!==n.nodeValue)n.nodeValue=next;}
    }else if(n.nodeType===Node.ELEMENT_NODE){
      for(const attr of ['placeholder','title','aria-label'])if(n.hasAttribute(attr)){const old=n.getAttribute(attr),next=text(old);if(next!==old)n.setAttribute(attr,next);}
      if(n.matches(ignored))return;
      n.childNodes.forEach(node);
    }
  }
  function boot(){
    document.title=map[document.title]||document.title;
    node(document.body);
    let active=false;
    const observer=new MutationObserver(records=>{
      if(active)return;active=true;
      for(const r of records){
        if(r.type==='characterData')node(r.target);
        else r.addedNodes.forEach(node);
        if(r.type==='attributes')node(r.target);
      }
      active=false;
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});
    const select=document.getElementById('languageSelect');if(select)select.value='en';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
