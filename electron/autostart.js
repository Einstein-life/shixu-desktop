const path=require('node:path');

function createAutoStart({app,platform=process.platform,execPath=process.execPath,saveSettings}) {
  const available=platform==='win32'||(platform==='darwin'&&app.isPackaged);
  const reason=platform==='darwin'?'INSTALL_REQUIRED':'UNSUPPORTED';
  // Development Electron must receive the project path, or it opens Electron's welcome screen.
  // Reading with identical arguments is required for Windows openAtLogin to be accurate.
  const identity=platform==='win32'?{path:execPath,args:app.isPackaged?[]:[path.resolve(app.getAppPath())]}:{};
  function get() {
    if(!available)return {available:false,openAtLogin:false,reason};
    let info;
    try {info=app.getLoginItemSettings(identity);}catch(cause){throw new Error('AUTOSTART_READ_FAILED',{cause});}
    const registered=!!info.openAtLogin;
    let blocked=false;
    if(platform==='win32'&&registered&&Array.isArray(info.launchItems)) {
      const normalize=value=>path.win32.normalize(String(value)).toLowerCase();
      const match=info.launchItems.filter(item=>item.name==='Shixu Desktop'&&normalize(item.path)===normalize(identity.path)&&JSON.stringify(item.args||[])===JSON.stringify(identity.args));
      blocked=match.length>0&&match.every(item=>!item.enabled);
    }
    const pendingApproval=platform==='darwin'&&info.status==='requires-approval';
    return {available:true,openAtLogin:registered&&!blocked&&!pendingApproval,registered,blocked,pendingApproval};
  }
  function set(value) {
    if(!available)throw new Error('AUTOSTART_'+reason);
    const requested=!!value;
    try {app.setLoginItemSettings({...identity,openAtLogin:requested,...(platform==='win32'?{name:'Shixu Desktop',enabled:requested}:{})});}
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
