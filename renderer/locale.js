(function(){
  'use strict';
  const english=document.documentElement.lang==='en';
  const current=english?'en':'zh-CN';
  const key='shixu-v2-language';
  const params=new URLSearchParams(location.search);
  const requested=params.get('lang');
  let preferred=requested || localStorage.getItem(key) || 'en';
  function navigate(lang){
    const next=lang==='en'?'en':'zh-CN';
    localStorage.setItem(key,next);
    if(next===current)return;
    const url=new URL(location.href);
    url.pathname=url.pathname.replace(/(index|dock)(\.en)?\.html$/,(_,page)=>page+(next==='en'?'.en':'')+'.html');
    url.searchParams.delete('lang');
    location.replace(url.href);
  }
  function toggle(){
    const next=current==='en'?'zh-CN':'en';
    if(window.shixu)window.shixu.setLocale(next).then(()=>navigate(next));
    else navigate(next);
  }
  if(requested)localStorage.setItem(key,preferred);
  if(!window.shixu)navigate(preferred);
  document.addEventListener('DOMContentLoaded',async()=>{
    const select=document.getElementById('languageSelect');
    if(select){select.value=current;select.onchange=async()=>{select.disabled=true;try{if(window.shixu)await window.shixu.setLocale(select.value);navigate(select.value);}catch(err){select.disabled=false;}};}
    document.querySelectorAll('[data-lang-toggle]').forEach(btn=>btn.addEventListener('click',toggle));
    if(window.shixu){
      window.shixu.onLocale(navigate);
      if(window.shixu.onOpenLab)window.shixu.onOpenLab(()=>document.getElementById('labTab')?.click());
      const saved=await window.shixu.getLocale();
      if(requested&&requested!==saved)await window.shixu.setLocale(requested);
      else navigate(saved);
    }
  });
})();
