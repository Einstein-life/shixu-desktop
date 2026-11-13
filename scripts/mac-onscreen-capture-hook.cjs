// Injected only into disposable, re-signed CI diagnostic copies of the application.
module.exports=async function({window:win}){
 const fs=require('node:fs'),path=require('node:path');
 const folder=process.env.SHIXU_DATA_DIR,pause=ms=>new Promise(r=>setTimeout(r,ms));
 const phaseFile=path.join(folder,'capture-phase.json'),ackFile=path.join(folder,'capture-ack.json');
 async function capture(phase){
  await pause(600);
  fs.writeFileSync(phaseFile,JSON.stringify({phase,bounds:win.getBounds()}));
  for(let n=0;n<160;n++){
   try{if(JSON.parse(fs.readFileSync(ackFile,'utf8')).phase===phase)return;}catch{}
   await pause(50);
  }
  throw Error('Screen-capture acknowledgement timed out');
 }
 try{
  await win.webContents.executeJavaScript('pointerOverDock=()=>false;void 0;');
  await win.webContents.executeJavaScript('setDisplayMode("edge").then(()=>hideToEdge());');
  await capture('normal-startup');
  for(let n=0;n<6;n++){
   await win.webContents.executeJavaScript('setExpanded(true);');await pause(70);
   await win.webContents.executeJavaScript('hideToEdge();');await pause(70);
  }
  await capture('after-resizes');
  fs.writeFileSync(path.join(folder,'capture-done.json'),JSON.stringify({done:true,renderer:await win.webContents.executeJavaScript('({shell:document.getElementById("shell").className,colors:["html","body","#shell","#ballWrap"].map(s=>getComputedStyle(document.querySelector(s)).backgroundColor)})')}));
 }catch(error){fs.writeFileSync(path.join(folder,'capture-done.json'),JSON.stringify({error:error.stack}));}
};
