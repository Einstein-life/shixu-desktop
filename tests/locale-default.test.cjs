const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

async function page({lang='zh-CN',saved,desktop=false,desktopLocale='en',query=''}={}) {
  const values=new Map(saved?[['shixu-v2-language',saved]]:[]),listeners={},replaced=[],writes=[];
  const select={value:lang,disabled:false};
  const document={documentElement:{lang},addEventListener:(event,fn)=>listeners[event]=fn,getElementById:id=>id==='languageSelect'?select:null,querySelectorAll:()=>[]};
  const location={href:'http://localhost/index'+(lang==='en'?'.en':'')+'.html'+query,search:query,replace:url=>replaced.push(url)};
  const window=desktop?{shixu:{onLocale:()=>{},getLocale:async()=>desktopLocale,setLocale:async value=>writes.push(value)}}:{};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../renderer/locale.js'),'utf8'),{document,location,window,URL,URLSearchParams,localStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)}});
  await listeners.DOMContentLoaded();
  return {values,replaced,writes,select};
}

test('fresh browser defaults to English and explicit Chinese persists across navigation and restart',async()=>{
  const fresh=await page();assert.match(fresh.replaced[0],/index\.en\.html$/);
  const english=await page({lang:'en'});assert.equal(english.replaced.length,0);
  english.select.value='zh-CN';await english.select.onchange();
  assert.equal(english.values.get('shixu-v2-language'),'zh-CN');assert.match(english.replaced[0],/index\.html$/);
  const again=await page({lang:'en',saved:'zh-CN'});assert.match(again.replaced[0],/index\.html$/);
  const zh=await page({saved:'zh-CN'});assert.equal(zh.replaced.length,0);
});

test('desktop language uses main-process preference and changes only after an explicit selection',async()=>{
  const english=await page({lang:'en',desktop:true,saved:'zh-CN'});
  assert.equal(english.replaced.length,0);assert.equal(english.writes.length,0);
  english.select.value='zh-CN';await english.select.onchange();assert.deepEqual(english.writes,['zh-CN']);
  const chinese=await page({desktop:true,desktopLocale:'zh-CN'});assert.equal(chinese.replaced.length,0);
  const source=fs.readFileSync(path.join(__dirname,'../electron/main.js'),'utf8');
  const assignment=source.match(/locale=loadSettings\(\)\.locale[^;]+;/)[0];
  for(const [saved,expected] of [[undefined,'en'],['en','en'],['zh-CN','zh-CN'],['invalid','en']]){
    assert.equal(vm.runInNewContext('let locale;'+assignment+'locale',{loadSettings:()=>({locale:saved})}),expected);
  }
});
