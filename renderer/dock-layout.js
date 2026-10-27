/* Serialize floating-panel geometry changes so edge reveal and expansion cannot overwrite each other. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.DockLayout=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function createDockLayoutController(source){
    let queue=Promise.resolve();
    const getApi=()=>typeof source==='function'?(source()||{}):(source||{});
    const enqueue=work=>{
      const next=queue.catch(()=>{}).then(work);
      queue=next;
      return next;
    };
    return {
      resize(expanded){
        return enqueue(async()=>{
          const api=getApi();
          if(expanded&&api.dockSetBall)await api.dockSetBall(false);
          if(api.dockSetSize)await api.dockSetSize(!!expanded);
        });
      },
      show(homePos){
        return enqueue(async()=>{
          const api=getApi();
          if(api.dockSetBall)await api.dockSetBall(false);
          if(api.dockSlide&&homePos)await api.dockSlide({mode:'show',x:homePos.x,y:homePos.y});
        });
      },
      hide(){
        return enqueue(async()=>{
          const api=getApi();
          if(api.dockSlide)await api.dockSlide({mode:'hide-edge'});
          if(api.dockSetBall)await api.dockSetBall(true);
        });
      }
    };
  }
  return {createDockLayoutController};
});
