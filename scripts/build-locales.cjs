const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..','renderer');
const translations=JSON.parse(fs.readFileSync(path.join(root,'translations.json'),'utf8'));
fs.writeFileSync(path.join(root,'translations.js'),'window.SHIXU_TRANSLATIONS = '+JSON.stringify(translations)+';\n');
const keys=Object.keys(translations).filter(k=>k!==translations[k]).sort((a,b)=>b.length-a.length);
const pattern=new RegExp(keys.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
const codeOrStyle=/(<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>)/gi;
const translateMarkup=markup=>markup.split(codeOrStyle).map((part,i)=>i%2?part:part.replace(pattern,match=>translations[match])).join('');
for(const name of ['index','dock']){
  let source=fs.readFileSync(path.join(root,name+'.html'),'utf8');
  source=source.replace('lang="zh-CN"','lang="en"');
  source=source.replace(/<!--[\s\S]*?-->/g,'');
  if(name==='index')source=source.replace('<title>时序 · 科研调度与实验执行</title>','<title>Shixu · Research & Lab Workflows</title>');
  else source=source.replace('<title>时序悬浮窗</title>','<title>Shixu floating panel</title>');
  if(!source.includes('src="translations.js"'))source=source.replace('<script src="locale.js"></script>','<script src="locale.js"></script>\n  <script src="translations.js"></script>\n  <script src="i18n.js"></script>');
  source=translateMarkup(source);
  // Translate only the bundled demo fixture, never user-authored experiment/task data.
  const start=source.indexOf('if (new URLSearchParams(location.search).get("demo") === "1")');
  const end=source.indexOf('const isDemoShot',start);
  if(start>=0&&end>start){
    const fixture=source.slice(start,end).replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g,(literal,value)=>translations[value]?JSON.stringify(translations[value]):literal);
    source=source.slice(0,start)+fixture+source.slice(end);
  }
  fs.writeFileSync(path.join(root,name+'.en.html'),source);
}
console.log('Generated English main window and floating panel.');
