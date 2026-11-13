const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const asar=require('@electron/asar');
const [appDir,label]=process.argv.slice(2),archive=path.join(appDir,'Contents/Resources/app.asar');
const backup=archive+'.diagnostic-original';
if(!fs.existsSync(backup))fs.copyFileSync(archive,backup);
fs.copyFileSync(backup,archive);
(async()=>{
 if(label!=='current'){
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'shixu-variant-'));asar.extractAll(archive,folder);
  const file=path.join(folder,'electron/main.js');let source=fs.readFileSync(file,'utf8');
  if(label==='borderless')source=source.replace("    backgroundColor: '#00000000',","    backgroundColor: '#00000000',\n    roundedCorners: false,");
  else if(label==='panel')source=source.replace("    backgroundColor: '#00000000',","    backgroundColor: '#00000000',\n    roundedCorners: false,\n    type: 'panel',");
  else if(label==='skiptransform')source=source.replace('visibleOnFullScreen: true','visibleOnFullScreen: true, skipTransformProcessType: true');
  else if(label==='readyclear')source=source.replace("  dockWindow.loadFile(pagePath('dock'));","  dockWindow.webContents.on('did-finish-load',()=>dockWindow.setBackgroundColor('#00000000'));\n  dockWindow.on('show',()=>dockWindow.setBackgroundColor('#00000000'));\n  dockWindow.loadFile(pagePath('dock'));");
  else throw Error('Unknown package variant');
  fs.writeFileSync(file,source);await asar.createPackage(folder,archive);
 }
 const hash=crypto.createHash('sha256').update(asar.getRawHeader(archive).headerString).digest('hex');
 execFileSync('/usr/libexec/PlistBuddy',['-c','Set :ElectronAsarIntegrity:Resources/app.asar:hash '+hash,path.join(appDir,'Contents/Info.plist')]);
 execFileSync('/usr/bin/codesign',['--force','--deep','--sign','-','--timestamp=none',appDir],{stdio:'inherit'});
 console.log('Prepared signed diagnostic application variant '+label);
})().catch(error=>{console.error(error);process.exitCode=1;});
