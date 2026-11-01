const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const storage=new Map(),context={subject:'cn',grade:3,type:'cizu',variant:'standard'};let scope='1:default',response,resolve;
 const sandbox={window:{},Map,Date,JSON,Error,AbortController,setTimeout,clearTimeout,LayoutPreferences:require('./layout-preferences.js'),localStorage:{setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},WorkbookAccount:{scope:()=>scope,request:()=>response}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/layout-sync.js','utf8'),sandbox);const sync=sandbox.window.LayoutSync,key=sandbox.LayoutPreferences.key(scope,context);
 response=Promise.resolve({layouts:[{context,config:{size:12},version:1}]});await sync.refresh(true);assert.equal(JSON.parse(storage.get(key)).size,12);
 response=Promise.resolve({layouts:[{context,config:null,version:2}]});await sync.refresh(true);assert.equal(storage.has(key),false);
 response=new Promise(r=>resolve=r);const pending=sync.refresh(true);scope='2:default';resolve({layouts:[{context,config:{size:18},version:3}]});await pending;assert.equal(storage.size,0,'late response cannot restore another child\'s layouts');
 response=Promise.reject(new Error('conflict'));await assert.rejects(sync.save(context,{size:10}),/conflict/);assert.equal(storage.size,0);
 scope=null;assert.equal(await sync.save(context,{size:10}),false,'guest uses local-only saving');
 console.log('layout sync: deletion, stale owner, conflict, guest passed');
})().catch(error=>{console.error(error);process.exitCode=1});
