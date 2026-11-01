"""Bounded, temporary render jobs. Files never live under the public static root."""
import hashlib,hmac,json,re,secrets,shutil,subprocess,threading,time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import learning
from worksheets import validate_snapshot,KINDS

class RenderJobs:
 def __init__(self,server):
  self.server=server;self.root=Path(server.database).resolve().parent/'render-jobs';self.root.mkdir(exist_ok=True)
  self.jobs={};self.lock=threading.RLock();self.pool=ThreadPoolExecutor(max_workers=2);self.slots=threading.BoundedSemaphore(8)
 def close(self):self.pool.shutdown(wait=True)
 def revoke(self,user_id):
  with self.lock:
   for identifier,job in list(self.jobs.items()):
    if job['owner'] and job['owner'][0]==user_id:
     job['revoked']=True;del self.jobs[identifier]
     if job['status'] not in ('queued','processing'):shutil.rmtree(self.root/identifier,ignore_errors=True)
 def cleanup(self):
  now=time.time()
  for identifier,job in list(self.jobs.items()):
   if job['expiresAt']<now and job['status'] not in ('queued','processing'):
    shutil.rmtree(self.root/identifier,ignore_errors=True);del self.jobs[identifier]
  # Remove expired files left by an earlier process; never restore their credentials.
  for folder in self.root.iterdir():
   if folder.is_dir() and folder.name not in self.jobs and re.fullmatch(r'[0-9a-f]{32}',folder.name) and folder.stat().st_mtime<now-1800:shutil.rmtree(folder,ignore_errors=True)
 def create(self,input,user):
  with self.lock:
   self.cleanup()
   if not self.slots.acquire(blocking=False):raise ValueError('生成任务较多，请稍后再试。')
   identifier=secrets.token_hex(16);key=secrets.token_urlsafe(32)
   job=dict(id=identifier,keyHash=hashlib.sha256(key.encode()).hexdigest(),owner=(user['id'],user['child_id']) if user else None,status='queued',expiresAt=int(time.time())+1800)
   self.jobs[identifier]=job
  self.pool.submit(self.render,job,input)
  return dict(id=identifier,key=key,expiresAt=job['expiresAt'],status=job['status'])
 def render(self,job,input):
  folder=self.root/job['id']
  try:
   folder.mkdir()
   job['status']='processing'
   completed=subprocess.run(['node',str(Path(__file__).resolve().parents[1]/'scripts/render_workbook.cjs'),str(folder)],input=json.dumps(input),capture_output=True,text=True,timeout=90)
   if completed.returncode:raise ValueError('字帖生成失败，请减少内容或选择内置字体后重试。')
   result=json.loads((folder/'result.json').read_text())
   snapshot=validate_snapshot(result['snapshot'],self.server.catalog,input.get('weakItems'))
   if snapshot['sourceMode']=='lesson':snapshot['itemIds']=result['snapshot']['itemIds']
   if job.get('revoked'):raise ValueError('任务已撤销。')
   job.update(status='ready',snapshot=snapshot,pages=result['pages'],unsupported=result['unsupported'])
  except (ValueError,subprocess.SubprocessError,OSError,KeyError):
   job.update(status='failed',message='字帖生成失败，请减少内容或选择内置字体后重试。');shutil.rmtree(folder,ignore_errors=True)
  finally:self.slots.release()
 def access(self,h,identifier):
  with self.lock:
   self.cleanup();job=self.jobs.get(identifier)
  key=h.headers.get('X-Render-Key','')
  if not job or not hmac.compare_digest(job['keyHash'],hashlib.sha256(key.encode()).hexdigest()):h.response(404,dict(error='预览已过期，请重新生成。'));return None
  if job['owner']:
   user=h.require_user()
   if not user:return None
   if job['owner']!=(user['id'],user['child_id']):h.response(404,dict(error='预览不属于当前孩子。'));return None
  return job

def prepare(h,data,user):
 if not isinstance(data,dict) or set(data)-{'lessonId','kind','itemIds','snapshotId','options'}:raise ValueError('生成请求格式无效。')
 options=data.get('options',{})
 if not isinstance(options,dict) or set(options)-{'size','fillPage','font','showPinyin','mathLayout'}:raise ValueError('排版选项无效。')
 if options.get('font','wenkai') not in ('wenkai','italic'):raise ValueError('请选择内置字体。')
 import layout_preferences
 layout_preferences.validate({k:v for k,v in options.items() if k in ('size','font','fillPage')} or {'font':'wenkai'})
 if 'showPinyin' in options and type(options['showPinyin']) is not bool:raise ValueError('拼音开关无效。')
 if 'mathLayout' in options and options['mathLayout'] not in ('trace','answers','horizontal'):raise ValueError('竖式选项无效。')
 result=dict(options={'font':'wenkai',**options},contentVersion=h.server.catalog['contentVersion'])
 if data.get('snapshotId'):
  if not user:raise ValueError('请先登录查看自己的字帖。')
  if any(k in data for k in ('lessonId','kind','itemIds')):raise ValueError('请选择一种字帖来源。')
  with h.server.db() as db:
   row=db.execute('SELECT payload FROM worksheet_snapshots WHERE id=? AND user_id=? AND child_id=?',(data['snapshotId'],user['id'],user['child_id'])).fetchone()
   bank=learning.weak_items(db,user['id'],user['child_id'])
  if not row:raise ValueError('字帖不存在或不属于当前孩子。')
  snapshot=json.loads(row['payload'])
  if snapshot['sourceMode']=='lesson':
   lesson=h.server.lessons.get(snapshot['lessonId']);group=next((p for p in lesson['packs'] if p['kind']==snapshot['practiceKind']),None) if lesson else None
   wanted={i['id'] for i in snapshot['items']};snapshot['itemIds']=[i['id'] for i in group['items'] if i['stableId'] in wanted] if group else []
  result.update(snapshot=snapshot,weakItems=bank);return result
 lesson=h.server.lessons.get(data.get('lessonId'));kind=data.get('kind');ids=data.get('itemIds')
 group=next((p for p in lesson['packs'] if p['kind']==kind),None) if lesson else None
 if not group or kind not in KINDS or not isinstance(ids,list) or not 1<=len(ids)<=200 or any(not isinstance(i,str) for i in ids) or len(ids)!=len(set(ids)):raise ValueError('请选择1–200项有效的素材。')
 items=[i for i in group['items'] if i['id'] in ids]
 if len(items)!=len(ids):raise ValueError('素材不属于本课。')
 text=('' if kind in ('characters','extraCharacters','letters','patterns') else '\n').join(i['text'] for i in items)
 if len(text)>20000:raise ValueError('内容过长，请减少素材。')
 if 'mathLayout' in options and (lesson['subject']!='math' or kind not in ('calculations','calculationAnswers')):raise ValueError('本素材不支持竖式排版。')
 result.update(course=dict(type=KINDS[kind],lessonId=lesson['id'],kind=kind,itemIds=ids,text=text,grade=lesson['grade'],subject=lesson['subject']),materialLibrary=lesson.get('materialLibrary',False),layout={})
 if user:
  c=dict(subject=lesson['subject'],grade=lesson['grade'],type=KINDS[kind],variant='vertical' if kind in ('calculations','calculationAnswers') and options.get('mathLayout')!='horizontal' else 'standard')
  key=layout_preferences.context_key(c)
  with h.server.db() as db:row=db.execute('SELECT config FROM layout_preferences WHERE user_id=? AND child_id=? AND context_key=?',(user['id'],user['child_id'],key)).fetchone()
  if row and row['config']:result['layout']=json.loads(row['config'])
 return result

def handle(h,path):
 if not path.startswith('/api/render-jobs'):return False
 manager=h.server.render_jobs
 try:
  parts=path.split('/')
  if path=='/api/render-jobs' and h.command=='POST':
   user=None
   if h.session():
    user=h.require_user()
    if not user:return True
   elif h.headers.get('Authorization'):h.response(401,dict(error='登录已过期，请重新登录或退出后以游客身份生成。'));return True
   data=json.loads(h.body(256*1024));input=prepare(h,data,user)
   h.response(202,manager.create(input,user));return True
  job=manager.access(h,parts[3] if len(parts)>3 else '')
  if not job:return True
  if h.command=='GET' and len(parts)==4:
   h.response(200,{k:job[k] for k in ('id','status','expiresAt','pages','unsupported','message') if k in job});return True
  if job['status']!='ready':h.response(409,dict(error='字帖尚未生成完成。'));return True
  if h.command=='GET' and len(parts)==5:
   name=parts[4]
   if name!='workbook.pdf' and not re.fullmatch(r'(?:preview|page)-([1-9]|1[0-9]|20)\.png',name):h.response(404,dict(error='文件不存在。'));return True
   file=manager.root/job['id']/name
   if not file.is_file():h.response(404,dict(error='文件不存在。'));return True
   raw=file.read_bytes();h.send_response(200);h.send_header('Content-Type','application/pdf' if name.endswith('.pdf') else 'image/png');h.send_header('Content-Length',str(len(raw)));h.send_header('Content-Disposition','attachment; filename="'+name+'"');h.end_headers();h.wfile.write(raw);return True
  if h.command=='POST' and len(parts)==5 and parts[4] in ('save','output'):
   user=h.require_user(preferences=True)
   if not user:return True
   output=parts[4]=='output';data=json.loads(h.body())
   if not isinstance(data,dict) or (output and (data.get('format') not in ('pdf','png') or type(data.get('page',1)) is not int or not 1<=data.get('page',1)<=job['pages'])):raise ValueError('输出记录无效。')
   with manager.lock,h.server.db() as db:
    identifier=job.get('saved',{}).get((user['id'],user['child_id']))
    if not identifier:
     identifier=secrets.token_urlsafe(24);snapshot={**job['snapshot'],'id':identifier}
     db.execute('INSERT INTO worksheet_snapshots(id,user_id,payload,created_at,child_id) VALUES(?,?,?,?,?)',(identifier,user['id'],json.dumps(snapshot,ensure_ascii=False),int(time.time()),user['child_id']))
     job.setdefault('saved',{})[(user['id'],user['child_id'])]=identifier
    if not output:learning.favorite(db,user['id'],identifier,True,user['child_id'])
    else:
     name='workbook.pdf' if data['format']=='pdf' else 'page-'+str(data.get('page',1))+'.png'
     digest=hashlib.sha256((manager.root/job['id']/name).read_bytes()).hexdigest();mime='application/pdf' if data['format']=='pdf' else 'image/png'
     db.execute('INSERT OR IGNORE INTO output_events(user_id,snapshot_id,format,file_hash,created_at) VALUES(?,?,?,?,?)',(user['id'],identifier,mime,digest,int(time.time())))
   h.response(201,dict(snapshotId=identifier));return True
  h.response(404,dict(error='接口不存在。'))
 except OSError:h.response(404,dict(error='文件已失效，请重新生成。'))
 except (ValueError,TypeError,KeyError) as error:h.response(422,dict(error=str(error)))
 return True
