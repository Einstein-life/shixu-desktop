const path=require('node:path');

function createAutoStart({app,platform=process.platform,execPath=process.execPath,saveSettings,entryName='Shixu Desktop'}) {
  const available=platform==='win32'||(platform==='darwin'&&app.isPackaged);
  const reason=platform==='darwin'?'INSTALL_REQUIRED':'UNSUPPORTED';
  // Development Electron must receive the project path, or it opens Electron's welcome screen.
  // Electron 33 joins this command line without quoting paths for us.
  const launchArgs=platform==='win32'&&!app.isPackaged?[path.resolve(app.getAppPath())]:[];
  const quote=value=>'"'+value+'"';
  const identity=platform==='win32'?{path:quote(execPath),args:launchArgs.map(quote)}:{};
  const normalize=value=>path.win32.normalize(String(value).replace(/^"(.*)"$/,'$1')).toLowerCase();
  function get() {
    if(!available)return {available:false,openAtLogin:false,reason};
    let info;
    try {info=app.getLoginItemSettings(identity);}catch(cause){throw new Error('AUTOSTART_READ_FAILED',{cause});}
    let registered=!!info.openAtLogin;
    let blocked=false;
    if(platform==='win32') {
      // openAtLogin checks AppUserModelID, not the custom registry name used by set().
      // Match our per-user record and its parsed executable/arguments instead.
      const items=Array.isArray(info.launchItems)?info.launchItems:[];
      const match=items.filter(item=>item.name===entryName&&(item.scope==='user'||item.scope==null)&&
        normalize(item.path)===normalize(execPath)&&Array.isArray(item.args)&&
        item.args.length===launchArgs.length&&item.args.every((arg,i)=>normalize(arg)===normalize(launchArgs[i])));
      registered=match.length>0;
      blocked=match.length>0&&match.every(item=>!item.enabled);
    }
    const pendingApproval=platform==='darwin'&&info.status==='requires-approval';
    return {available:true,openAtLogin:registered&&!blocked&&!pendingApproval,registered,blocked,pendingApproval};
  }
  function set(value) {
    if(!available)throw new Error('AUTOSTART_'+reason);
    const requested=!!value;
    try {app.setLoginItemSettings({...identity,openAtLogin:requested,...(platform==='win32'?{name:entryName,enabled:requested}:{})});}
    catch(cause){throw new Error('AUTOSTART_SET_FAILED',{cause});}
    const actual=get();
    if(actual.openAtLogin!==requested&&!actual.pendingApproval&&!actual.blocked)throw new Error('AUTOSTART_NOT_APPLIED');
    // Settings mirror the verified state, never an unverified request.
    try {saveSettings({openAtLogin:actual.openAtLogin});}catch(cause){throw new Error('AUTOSTART_SAVE_FAILED',{cause});}
    return actual;
  }
  return {get,set};
}

module.exports={createAutoStart};
