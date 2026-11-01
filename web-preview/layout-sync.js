'use strict';
window.LayoutSync=(()=>{
 const versions=new Map();let inflight=null,lastScope=null,lastAt=0;
 const id=context=>JSON.stringify([context.subject,context.grade,context.type,context.variant||'standard']);
 function apply(scope,row){const key=LayoutPreferences.key(scope,row.context);if(row.config===null)localStorage.removeItem(key);else localStorage.setItem(key,JSON.stringify(LayoutPreferences.pick(row.config)));versions.set(scope+':'+id(row.context),row.version);}
 async function refresh(force=false){
  const scope=WorkbookAccount.scope();if(!scope)return;
  if(!force&&scope===lastScope&&Date.now()-lastAt<15000)return;
  if(inflight?.scope===scope)return inflight.promise;
  const promise=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);let result;try{result=await WorkbookAccount.request('/api/layout-preferences',{signal:controller.signal});}finally{clearTimeout(timer);}if(scope!==WorkbookAccount.scope())return;for(const row of result.layouts)apply(scope,row);lastScope=scope;lastAt=Date.now();})();
  inflight={scope,promise};try{await promise;}finally{if(inflight?.promise===promise)inflight=null;}
 }
 async function save(context,config){
  const scope=WorkbookAccount.scope();if(!scope)return false;
  const result=await WorkbookAccount.request('/api/layout-preferences',{method:'PUT',body:JSON.stringify({context,config,version:versions.get(scope+':'+id(context))||0})});
  if(scope!==WorkbookAccount.scope())throw Error('孩子档案已切换，请重新打开常用排版。');
  apply(scope,result.layout);return true;
 }
 return {refresh,save};
})();
