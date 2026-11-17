// Used only by smoke-dock-compositor.cjs inside a disposable CI application copy.
module.exports=async function({window:win}){
 const fs=require('node:fs'),path=require('node:path');
 const dir=process.env.SHIXU_DATA_DIR,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const phaseFile=path.join(dir,'capture-phase.json'),ackFile=path.join(dir,'capture-ack.json');
 async function capture(phase){
  const rendered=await win.webContents.executeJavaScript(`(async()=>{
   for(let n=0;n<100&&(innerWidth!==56||innerHeight!==56);n++)await new Promise(resolve=>setTimeout(resolve,50));
   if(innerWidth!==56||innerHeight!==56)throw Error('Renderer viewport has not reached ball bounds');
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const shell=document.getElementById('shell');
   if(!shell.classList.contains('ball-only'))throw Error('Renderer did not paint the ball-only state');
   return {width:innerWidth,height:innerHeight,shell:shell.className};
  })()`);
  await pause(500);fs.writeFileSync(phaseFile,JSON.stringify({phase,bounds:win.getBounds(),rendered}));
  for(let n=0;n<160;n++){
   try{if(JSON.parse(fs.readFileSync(ackFile,'utf8')).phase===phase)return;}catch{}
   await pause(50);
  }
  throw Error('Desktop screenshot acknowledgement timed out');
 }
 try{
  for(let n=0;n<140&&!win.isVisible();n++)await pause(50);
  if(!win.isVisible())throw Error('Floating window did not reveal after first frame');
  await win.webContents.executeJavaScript('window.__shixuCaptureInit');
  await win.webContents.executeJavaScript('pointerOverDock=()=>false;void 0;');
  await win.webContents.executeJavaScript('setDisplayMode("edge").then(()=>hideToEdge());');
  await capture('normal-startup');
  for(let n=0;n<6;n++){
   await win.webContents.executeJavaScript('setExpanded(true);');await pause(70);
   await win.webContents.executeJavaScript('hideToEdge();');await pause(70);
  }
  await capture('after-six-resizes');
  fs.writeFileSync(path.join(dir,'capture-done.json'),JSON.stringify({
   done:true,renderer:await win.webContents.executeJavaScript('({shell:document.getElementById("shell").className,colors:["html","body","#shell","#ballWrap"].map(s=>getComputedStyle(document.querySelector(s)).backgroundColor)})')
  }));
 }catch(error){fs.writeFileSync(path.join(dir,'capture-done.json'),JSON.stringify({error:error.stack}));}
};
