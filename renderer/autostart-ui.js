(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.AutoStartUI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function create({button,api,lang,toast}) {
    const L=(zh,en)=>lang==='en'?en:zh;
    let busy=false,info=null;
    function show(value) {
      info=value;
      button.dataset.on=value.openAtLogin?'1':'0';
      button.setAttribute('aria-pressed',String(!!value.openAtLogin));
      if(value.available===false) {
        button.textContent=value.reason==='INSTALL_REQUIRED'?L('开机自启：需安装桌面版','Launch at login: install the desktop app'):L('开机自启：当前系统不支持','Launch at login: unsupported on this system');
        button.disabled=true;return;
      }
      button.textContent=value.pendingApproval?L('开机自启：待系统批准','Launch at login: awaiting system approval'):value.blocked?L('开机自启：系统已禁用','Launch at login: disabled by system'):value.openAtLogin?L('开机自启：开','Launch at login: on'):L('开机自启：关','Launch at login: off');
      button.disabled=false;
    }
    function error(err) {
      const message=String(err?.message||err);
      if(message.includes('AUTOSTART_NOT_APPLIED'))return L('系统未应用开机自启设置，请检查系统启动项权限后重试。','The system did not apply the login setting. Check startup permissions and retry.');
      if(message.includes('AUTOSTART_READ_FAILED'))return L('无法读取系统开机自启状态，请重试。','Could not read the system login setting. Please retry.');
      if(message.includes('AUTOSTART_SAVE_FAILED'))return L('系统设置已修改，但本地设置保存失败。','The system setting changed, but local settings could not be saved.');
      return L('开机自启设置失败，请检查系统权限后重试。','Could not change launch at login. Check system permissions and retry.');
    }
    async function refresh() {
      if(!button||busy)return;
      if(!api?.getAutoStart){button.textContent=L('开机自启：仅桌面版','Launch at login: desktop app only');button.disabled=true;return;}
      busy=true;button.disabled=true;
      try {show(await api.getAutoStart());}
      catch {info=null;button.textContent=L('开机自启：未知（点击重试）','Launch at login: unknown (click to retry)');button.disabled=false;}
      finally {busy=false;}
    }
    async function toggle() {
      if(busy||!api?.setAutoStart)return;
      // A failed initial read must not be interpreted as an off state.
      if(!info){await refresh();return;}
      if(info.available===false)return;
      const requested=!info.openAtLogin;
      busy=true;button.disabled=true;button.setAttribute('aria-busy','true');
      button.textContent=L('开机自启：正在设置…','Launch at login: updating…');
      try {
        const actual=await api.setAutoStart(requested);show(actual);
        if(actual.pendingApproval)toast(L('请在系统“登录项”中批准时序启动。','Approve Shixu in your system Login Items settings.'));
        else if(actual.blocked)toast(L('系统已禁用此启动项，请在系统启动应用设置中检查。','The system disabled this startup item. Check your system startup apps settings.'));
        else if(!!actual.openAtLogin!==requested)toast(error(new Error('AUTOSTART_NOT_APPLIED')));
        else toast(actual.openAtLogin?L('已开启开机自启','Launch at login enabled'):L('已关闭开机自启','Launch at login disabled'));
      } catch(err) {
        // Refresh after a failed write: the OS may have changed even if saving settings failed.
        try {show(await api.getAutoStart());}catch {info=null;button.textContent=L('开机自启：未知（点击重试）','Launch at login: unknown (click to retry)');button.disabled=false;}
        toast(error(err));
      } finally {busy=false;button.setAttribute('aria-busy','false');}
    }
    if(button)button.addEventListener('click',toggle);
    return {refresh,toggle};
  }
  return {create};
});
