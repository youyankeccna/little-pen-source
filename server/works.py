"""Family-private works and verified tracing rewards; photo reviews are not AI scored."""
import base64,hashlib,io,json,math,re,secrets,subprocess,time
from datetime import date,timedelta
from functools import lru_cache
from pathlib import Path
from urllib.parse import parse_qs,unquote,urlsplit
from PIL import Image,ImageOps,UnidentifiedImageError
import learning
ROOT=Path(__file__).resolve().parents[1]

def migrate(db):
 for statement in '''CREATE TABLE IF NOT EXISTS family_works(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL,child_id TEXT NOT NULL,date TEXT NOT NULL,title TEXT NOT NULL,kind TEXT NOT NULL,payload TEXT NOT NULL,image_hash TEXT NOT NULL,created_at INTEGER NOT NULL,deleted_at INTEGER,UNIQUE(user_id,child_id,date,image_hash));
 CREATE TABLE IF NOT EXISTS writing_completions(user_id INTEGER NOT NULL,child_id TEXT NOT NULL,date TEXT NOT NULL,char TEXT NOT NULL,lesson_key TEXT NOT NULL,payload TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(user_id,child_id,date,char,lesson_key));'''.split(';'):
  if statement.strip():db.execute(statement)

@lru_cache(maxsize=256)
def character_data(char):
 if not isinstance(char,str) or not re.fullmatch(r'[\u3400-\u9fff]',char):raise ValueError('请选择单个汉字。')
 file=ROOT/'web-preview/vendor/hanzi'/(char+'.json')
 if not file.is_file():raise ValueError('这个字暂未收录跟写参考，可先进行纸上练习。')
 raw=file.read_bytes();data=json.loads(raw)
 if not data.get('medians') or any(len(s)<2 for s in data['medians']):raise ValueError('这个字暂不支持屏幕跟写。')
 return dict(char=char,medians=data['medians'],guideHash=hashlib.sha256(raw).hexdigest(),source='Hanzi Writer Data')

def root(h):
 database=Path(h.server.database).resolve();folder=database.with_name(database.name+'.assets')/'private-works';folder.mkdir(parents=True,exist_ok=True);return folder

def public(row):
 payload=json.loads(row['payload'])
 return dict(id=row['id'],date=row['date'],title=row['title'],kind=row['kind'],createdAt=row['created_at'],deleted=bool(row['deleted_at']),**payload)

def verify_owner(db,user):
 if not db.execute('SELECT 1 FROM users JOIN children ON users.id=children.user_id WHERE users.id=? AND users.salt=? AND children.id=?',(user['id'],user['salt'],user['child_id'])).fetchone():raise ValueError('当前账号或孩子已变化，请重新登录。')

def store(db,h,user,day,title,kind,payload,image):
 digest=hashlib.sha256(image).hexdigest()
 if not db.in_transaction:db.execute('BEGIN IMMEDIATE')
 verify_owner(db,user)
 existing=db.execute('SELECT * FROM family_works WHERE user_id=? AND child_id=? AND date=? AND image_hash=?',(user['id'],user['child_id'],day,digest)).fetchone()
 if existing:
  db.execute('UPDATE family_works SET deleted_at=NULL WHERE id=?',(existing['id'],));return public(db.execute('SELECT * FROM family_works WHERE id=?',(existing['id'],)).fetchone())
 identifier=secrets.token_hex(16);(root(h)/(identifier+'.image')).write_bytes(image)
 db.execute('INSERT INTO family_works VALUES(?,?,?,?,?,?,?,?,?,NULL)',(identifier,user['id'],user['child_id'],day,title,kind,json.dumps(payload,ensure_ascii=False),digest,int(time.time())))
 return public(db.execute('SELECT * FROM family_works WHERE id=?',(identifier,)).fetchone())

def read_image(value):
 if not isinstance(value,str) or len(value)>6*1024*1024:raise ValueError('请选择不超过4 MiB的照片。')
 try:
  raw=base64.b64decode(value,validate=True)
  if len(raw)>4*1024*1024:raise ValueError('请选择不超过4 MiB的照片。')
  with Image.open(io.BytesIO(raw)) as photo:
   if photo.format not in ('JPEG','PNG') or photo.width*photo.height>25_000_000:raise ValueError('请选择常规尺寸的JPEG或PNG照片。')
   clean=ImageOps.exif_transpose(photo);clean.thumbnail((1600,1600));clean=clean.convert('RGB');output=io.BytesIO();clean.save(output,format='JPEG',quality=88)
  return output.getvalue()
 except (UnidentifiedImageError,OSError,base64.binascii.Error,Image.DecompressionBombError):raise ValueError('照片无法读取，请重新选择JPEG或PNG。')

def valid_day(value):
 if not isinstance(value,str) or len(value)!=10:raise ValueError('请选择作品日期。')
 try:day=date.fromisoformat(value)
 except ValueError:raise ValueError('作品日期无效。')
 if day>date.fromisoformat(learning.today()):raise ValueError('作品日期不能晚于今天。')
 return value

def summary(db,user):
 today=date.fromisoformat(learning.today());monday=today-timedelta(days=today.weekday());start=monday-timedelta(days=7)
 rows=db.execute('SELECT * FROM family_works WHERE user_id=? AND child_id=? AND deleted_at IS NULL AND date>=? ORDER BY date,created_at',(user['id'],user['child_id'],start.isoformat())).fetchall()
 current=[r for r in rows if r['date']>=monday.isoformat()];previous=[r for r in rows if r['date']<monday.isoformat()]
 return dict(today=today.isoformat(),weekStart=monday.isoformat(),thisWeek=len(current),lastWeek=len(previous),thisWeekDays=len(set(r['date'] for r in current)),message='本周已留下'+str(len(current))+'件作品。选两件同类作品，一起看看自己的努力。')

def progress(db,user):
 rows=db.execute('SELECT char,lesson_key FROM writing_completions WHERE user_id=? AND child_id=? AND date=?',(user['id'],user['child_id'],learning.today())).fetchall()
 return dict(today=learning.today(),stars=len(rows),completed=[dict(char=r['char'],lessonId=r['lesson_key']) for r in rows])

def remove_user(db,h,user_id):
 for row in db.execute('SELECT id FROM family_works WHERE user_id=?',(user_id,)):(root(h)/(row['id']+'.image')).unlink(missing_ok=True)
 db.execute('DELETE FROM family_works WHERE user_id=?',(user_id,));db.execute('DELETE FROM writing_completions WHERE user_id=?',(user_id,))

def handle(h,path):
 if path!='/api/works' and not path.startswith(('/api/works/','/api/writing/')):return False
 try:
  query=parse_qs(urlsplit(h.path).query)
  if h.command=='GET' and path=='/api/writing/capabilities':
   h.response(200,dict(liveGuide=True,method='median-guide-v1',photoAI=False,photoAIMessage='拍照AI点评尚未开通，作品可先私密保存。'));return True
  if h.command=='GET' and path.startswith('/api/writing/guide/'):
   h.response(200,dict(guide=character_data(unquote(path.split('/')[-1]))));return True
  if h.command=='GET' and path=='/api/writing/challenge':
   grade=int(query.get('grade',['1'])[0]);term=query.get('term',['upper'])[0];series=query.get('series',['pep'])[0];offset=int(query.get('offset',['0'])[0])
   if not 0<=grade<=6 or term not in ('upper','lower') or not 0<=offset<=2000:raise ValueError('练习范围无效。')
   requested=query.get('lessonId',[''])[0];lesson=h.server.lessons.get(requested)
   if requested and not lesson:raise ValueError('课次不存在，请重新选择。')
   if lesson and lesson['subject']!='cn':raise ValueError('汉字闯关请选择语文素材。')
   if not lesson:lesson=next((l for l in h.server.lessons.values() if l['subject']=='cn' and l['grade']==grade and l['term']==term and l.get('series','pep')==series and l.get('materialLibrary')),None)
   found=[]
   if lesson:
    for pack in lesson['packs']:
     if pack['kind'] not in ('characters','extraCharacters','words','extraWords'):continue
     for item in pack['items']:
      for char in item['text']:
       if char in found:continue
       try:character_data(char)
       except ValueError:continue
       found.append(char)
   if not found and grade==0:found=list('一二三十人大小口日月')
   h.response(200,dict(characters=found[offset:offset+5],lessonId=lesson['id'] if lesson else '',title=lesson['title'] if lesson else '幼儿启蒙',hasMore=offset+5<len(found)));return True
  user=h.require_user()
  if not user:return True
  if h.command=='GET' and path=='/api/writing/progress':
   with h.server.db() as db:result=progress(db,user)
   h.response(200,result);return True
  if h.command=='GET' and path=='/api/works/summary':
   with h.server.db() as db:result=summary(db,user)
   h.response(200,result);return True
  if h.command=='GET' and path=='/api/works':
   trash=query.get('trash',['0'])[0]=='1';day=query.get('date',[''])[0]
   if day:valid_day(day)
   sql='SELECT * FROM family_works WHERE user_id=? AND child_id=? AND deleted_at IS '+('NOT NULL' if trash else 'NULL');args=[user['id'],user['child_id']]
   if day:sql+=' AND date=?';args.append(day)
   with h.server.db() as db:rows=db.execute(sql+' ORDER BY date DESC,created_at DESC,id DESC LIMIT 100',args).fetchall()
   h.response(200,dict(works=[public(r) for r in rows],today=learning.today()));return True
  if h.command=='POST' and path=='/api/works':
   data=json.loads(h.body(6*1024*1024+8192))
   if not isinstance(data,dict) or set(data)-{'imageBase64','date','title'}:raise ValueError('作品格式无效。')
   day=valid_day(data.get('date'));title=data.get('title','今天的练字')
   if not isinstance(title,str) or not 1<=len(title.strip())<=60:raise ValueError('作品名称需1–60字。')
   image=read_image(data.get('imageBase64'))
   with h.server.db() as db:result=store(db,h,user,day,title.strip(),'photo',{},image)
   h.response(201,dict(work=result));return True
  if h.command=='POST' and path=='/api/writing/attempts':
   data=json.loads(h.body(512*1024))
   if not isinstance(data,dict) or set(data)-{'char','strokes','lessonId','saveWork'}:raise ValueError('书写记录无效。')
   char=data.get('char');character_data(char);strokes=data.get('strokes');lesson_id=data.get('lessonId','');save=data.get('saveWork',False)
   if type(save) is not bool or not isinstance(lesson_id,str):raise ValueError('书写选项无效。')
   if lesson_id:
    lesson=h.server.lessons.get(lesson_id)
    if not lesson or lesson['subject']!='cn' or not any(char in i['text'] for p in lesson['packs'] if p['kind'] in ('characters','extraCharacters','words','extraWords') for i in p['items']):raise ValueError('汉字不属于本课字词。')
   if not isinstance(strokes,list) or not 1<=len(strokes)<=50 or any(not isinstance(s,list) or not 2<=len(s)<=256 or any(not isinstance(p,list) or len(p)!=2 or any(type(v) not in (int,float) or not math.isfinite(v) or not 0<=v<=1 for v in p) for p in s) for s in strokes):raise ValueError('笔迹数据无效。')
   identifier=secrets.token_hex(16);file=root(h)/(identifier+'.tmp.png')
   try:
    result=subprocess.run(['node',str(ROOT/'scripts/analyze_writing.cjs'),str(file)] if save else ['node',str(ROOT/'scripts/analyze_writing.cjs')],input=json.dumps(dict(char=char,strokes=strokes)),capture_output=True,text=True,timeout=10)
    if result.returncode:raise ValueError('书写分析暂不可用，请稍后重试。')
    result=json.loads(result.stdout)
    with h.server.db() as db:
     db.execute('BEGIN IMMEDIATE');verify_owner(db,user);new_star=False;work=None
     if result['passed']:
      new_star=db.execute('INSERT OR IGNORE INTO writing_completions VALUES(?,?,?,?,?,?,?)',(user['id'],user['child_id'],learning.today(),char,lesson_id,json.dumps(result),int(time.time()))).rowcount==1
      if save:work=store(db,h,user,learning.today(),char+' · 屏幕跟写','trace',dict(char=char,analysis=result),file.read_bytes())
     result.update(newStar=new_star,work=work,**progress(db,user))
   finally:file.unlink(missing_ok=True)
   h.response(200,result);return True
  parts=path.split('/');identifier=parts[3] if len(parts)>3 else ''
  with h.server.db() as db:row=db.execute('SELECT * FROM family_works WHERE id=? AND user_id=? AND child_id=?',(identifier,user['id'],user['child_id'])).fetchone()
  if not row:h.response(404,dict(error='作品不存在或不属于当前孩子。'));return True
  if h.command=='GET' and len(parts)==5 and parts[4]=='image':
   if row['deleted_at']:h.response(404,dict(error='作品已移入回收站。'));return True
   raw=(root(h)/(identifier+'.image')).read_bytes();h.send_response(200);h.send_header('Content-Type','image/png' if row['kind']=='trace' else 'image/jpeg');h.send_header('Content-Length',str(len(raw)));h.end_headers();h.wfile.write(raw);return True
  if h.command=='DELETE' and len(parts)==4:
   with h.server.db() as db:db.execute('UPDATE family_works SET deleted_at=? WHERE id=?',(int(time.time()),identifier))
   h.response(200,dict(ok=True));return True
  if h.command=='POST' and len(parts)==5 and parts[4]=='restore':
   with h.server.db() as db:db.execute('UPDATE family_works SET deleted_at=NULL WHERE id=?',(identifier,))
   h.response(200,dict(ok=True));return True
  h.response(404,dict(error='接口不存在。'))
 except (ValueError,TypeError,KeyError,subprocess.SubprocessError):h.response(422,dict(error='内容无法处理，请检查作品或笔迹后重试。'))
 except OSError:h.response(404,dict(error='作品文件暂不可用。'))
 return True
