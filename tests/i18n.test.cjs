const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

test('English UI translates labels while preserving user-authored task and experiment text',()=>{
  const attrs=new Map();
  const text=value=>({nodeType:3,nodeValue:value,parentElement:null});
  function element(tag,values={},children=[]){
    const el={nodeType:1,tagName:tag.toUpperCase(),className:values.class||'',childNodes:children,attrs:new Map(Object.entries(values.attrs||{})),parentElement:null,
      hasAttribute(k){return this.attrs.has(k)},getAttribute(k){return this.attrs.get(k)},setAttribute(k,v){this.attrs.set(k,v)},
      matches(selector){return selector.split(',').some(s=>{s=s.trim();if(s.startsWith('.'))return this.className.split(/\s+/).includes(s.slice(1));if(s.startsWith('['))return this.attrs.has(s.slice(1,-1));if(s==='input'||s==='textarea'||s==='pre'||s==='script'||s==='style')return this.tagName===s.toUpperCase();return false;})},
      closest(selector){let n=this;while(n){if(n.matches(selector))return n;n=n.parentElement;}return null;}};
    for(const child of children)child.parentElement=el;
    return el;
  }
  const taskText=text('实验步骤名称 / 运行结果');
  const userCopy=text('样本：A-01');
  const scriptText=text('const label = "实验步骤名称";');
  const input=element('input',{attrs:{placeholder:'标题'}});
  const lang=element('select');lang.value='';
  const root=element('body',{},[
    element('button',{},[text('调度')]),
    element('div',{class:'task-name'},[taskText]),
    element('span',{attrs:{'data-user-copy':''}},[userCopy]),
    element('div',{},[text('提醒：2')]),input,
    element('script',{},[scriptText]),
    element('div',{},[text('● 桌面应用 · 数据自动同步')]),
    element('div',{},[text('○ 浏览器本地预览 · 数据仅存此浏览器')])
  ]);
  const listeners={};
  const document={title:'时序悬浮窗',documentElement:{lang:'en'},body:root,readyState:'loading',addEventListener:(event,cb)=>listeners[event]=cb,getElementById:id=>id==='languageSelect'?lang:null};
  class MutationObserver{observe(){}}
  const window={SHIXU_TRANSLATIONS:{...JSON.parse(fs.readFileSync(path.join(__dirname,'../renderer/translations.json'),'utf8')),'调度':'Schedule','时序悬浮窗':'Shixu floating panel','提醒：':'Alert: ','标题':'Title'}};
  const context={window,document,Node:{TEXT_NODE:3,ELEMENT_NODE:1},MutationObserver};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../renderer/i18n.js'),'utf8'),context);
  listeners.DOMContentLoaded();
  assert.equal(document.title,'Shixu floating panel');
  assert.equal(root.childNodes[0].childNodes[0].nodeValue,'Schedule');
  assert.equal(taskText.nodeValue,'实验步骤名称 / 运行结果');
  assert.equal(userCopy.nodeValue,'样本：A-01');
  assert.equal(root.childNodes[3].childNodes[0].nodeValue,'Alert: 2');
  assert.equal(input.getAttribute('placeholder'),'Title');
  assert.equal(scriptText.nodeValue,'const label = "实验步骤名称";');
  assert.equal(lang.value,'en');
  assert.equal(root.childNodes[6].childNodes[0].nodeValue,'● Desktop app · data syncs automatically');
  assert.equal(root.childNodes[7].childNodes[0].nodeValue,'○ Browser preview · data stays in this browser');
});

test('sync status is rendered immediately in the selected language',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../renderer/index.html'),'utf8');
  const fn=source.match(/  function setDeskStatus\(ok, text\) \{[\s\S]*?\n  \}/)[0];
  for(const lang of ['en','zh-CN']){
    const context={document:{documentElement:{lang}},els:{deskStatus:{style:{}}}};
    vm.createContext(context);
    vm.runInContext(fn,context);
    for(const [ok,input,english] of [
      [true,'桌面应用 · 数据自动同步','Desktop app · data syncs automatically'],
      [false,'浏览器本地预览 · 数据仅存此浏览器','Browser preview · data stays in this browser'],
      [false,'保存失败，请检查磁盘权限','Save failed. Check disk permissions.']
    ]){
      context.input=input;context.ok=ok;
      vm.runInContext('setDeskStatus(ok,input)',context);
      assert.equal(context.els.deskStatus.textContent,(ok?'● ':'○ ')+(lang==='en'?english:input));
    }
  }
});
