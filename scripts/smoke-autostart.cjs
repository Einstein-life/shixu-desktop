// Run with Electron on Windows; creates and removes only its own random startup entry.
const {app}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const [targetArg,archiveArg,reportArg]=process.argv.slice(2);
if(process.platform!=='win32'||!targetArg||!archiveArg||!reportArg)throw Error('Use Electron smoke-autostart.cjs EXECUTABLE APP_ASAR REPORT on Windows');
const target=path.resolve(targetArg),archive=path.resolve(archiveArg),reportFile=path.resolve(reportArg);
if(!fs.existsSync(target)||!fs.existsSync(archive))throw Error('Packaged application missing');
const name='Shixu startup verification '+randomUUID();
app.setName('Shixu startup verification');
app.setAppUserModelId('app.shixu.startup-verification.'+randomUUID());
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'shixu-startup-verification-')));
const report={electron:process.versions.electron,packagedModule:true,temporaryEntry:name,checks:[],checkedAt:new Date().toISOString()};
app.whenReady().then(()=>{
 let code=0;
 try{
  const {createAutoStart}=require(path.join(archive,'electron/autostart.js'));
  const proxy={isPackaged:true,getAppPath:()=>archive,getLoginItemSettings:v=>app.getLoginItemSettings(v),setLoginItemSettings:v=>app.setLoginItemSettings(v)};
  const saved=[];
  const control=createAutoStart({app:proxy,platform:'win32',execPath:target,entryName:name,saveSettings:v=>saved.push(v)});
  assert.equal(control.get().openAtLogin,false);
  assert.equal(control.set(true).openAtLogin,true);
  assert.equal(control.get().openAtLogin,true);
  report.checks.push('Enable and reread the custom startup entry');
  const native=app.getLoginItemSettings({path:'"'+target+'"',args:[]});
  assert.equal(native.openAtLogin,false,'The default AppUserModelID flag must not determine the custom entry state');
  const item=native.launchItems.find(v=>v.name===name);
  assert.ok(item);assert.equal(path.win32.normalize(item.path).toLowerCase(),path.win32.normalize(target).toLowerCase());
  assert.deepEqual(item.args,[]);assert.equal(item.enabled,true);
  report.checks.push('Parse the full executable path containing spaces without extra arguments');
  app.setLoginItemSettings({name,path:'"'+target+'"',args:[],openAtLogin:true,enabled:false});
  assert.equal(control.get().blocked,true);assert.equal(control.get().openAtLogin,false);
  report.checks.push('Recognize a Windows-disabled startup item');
  assert.equal(control.set(true).openAtLogin,true);
  report.checks.push('Re-enable after Windows disables the item');
  assert.equal(control.set(false).openAtLogin,false);assert.equal(control.get().registered,false);
  report.checks.push('Disable and remove the startup entry');
  report.savedStates=saved;
  report.passed=true;
 }catch(error){report.error=error.stack;report.passed=false;code=1;}
 finally{
  app.setLoginItemSettings({name,path:'"'+target+'"',args:[],openAtLogin:false});
  report.temporaryEntryRemoved=!app.getLoginItemSettings({path:'"'+target+'"',args:[]}).launchItems.some(v=>v.name===name);
  if(!report.temporaryEntryRemoved){report.passed=false;code=1;}
  report.scope='Uses a random temporary per-user startup entry and the packaged module; no reboot or production entry modification.';
  fs.mkdirSync(path.dirname(reportFile),{recursive:true});fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));app.exit(code);
 }
});
