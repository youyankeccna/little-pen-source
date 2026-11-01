import http.client,json,sqlite3,tempfile,threading,unittest
from pathlib import Path
from datetime import date,timedelta
from app import AppServer
import test_app
import learning

class FamilyFlow(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.server=AppServer(('127.0.0.1',0),Path(self.tmp.name)/'family.sqlite3');self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
 def tearDown(self):self.server.shutdown();self.server.server_close();self.tmp.cleanup()
 def request(self,method,path,body=None,cookie=None,child=None):
  conn=http.client.HTTPConnection('127.0.0.1',self.server.server_port);headers={'Origin':self.server.origin,'Content-Type':'application/json'}
  if cookie:headers['Cookie']=cookie
  if child:headers['X-Child-Id']=child
  conn.request(method,'/api/v1'+path,json.dumps(body or {}),headers);r=conn.getresponse();raw=r.read();result=json.loads(raw);status=r.status;cookie=r.getheader('Set-Cookie');conn.close();return status,result.get('data',result),cookie.split(';')[0] if cookie else None
 def account(self,name):
  _,_,cookie=self.request('POST','/auth/register',{'username':name,'password':'abcdefgh'})
  self.request('PUT','/me/preferences',{'preferences':{'cn':'pep','math':'pep','en':'pep'},'version':0,'studyContext':{'grade':1,'subject':'cn','term':'upper'}},cookie)
  return cookie
 def child_data(self):return dict(name='小朋友乙',theme='star',studyContext=dict(grade=3,subject='en',term='upper'),preferences=dict(cn='pep',en='pep',math='pep'))
 def test_profiles_plans_shares_and_growth(self):
  cookie=self.account('family_parent');other=self.account('family_other');l=self.server.lessons['cn-1u-tiandiren'];p=next(p for p in l['packs'] if p['kind']=='characters');ids=[i['id'] for i in p['items'][:4]]
  self.request('PUT','/learning/cursor',dict(lessonId=l['id'],kind='characters',itemIds=ids),cookie)
  self.request('PUT','/learning/weak-items',dict(operation='add',items=[dict(char='他',lessonId=l['id'])]),cookie)
  payload=test_app.AccountFlow.snapshot_data(self);status,snapshot,_=self.request('POST','/worksheet-snapshots',payload,cookie);self.assertEqual(status,201);sid=snapshot['snapshot']['id']
  status,result,_=self.request('POST','/family/children',self.child_data(),cookie);self.assertEqual(status,201,result);cid=next(c['id'] for c in result['user']['children'] if c['id']!='default')
  self.assertEqual(self.request('GET','/learning',cookie=cookie,child=cid)[1]['weakItems'],[])
  self.assertEqual(self.request('GET','/learning',cookie=other,child=cid)[0],403)
  self.assertEqual(self.request('GET','/worksheet-snapshots/'+sid,cookie=cookie,child=cid)[0],404)
  self.assertEqual(self.request('GET','/worksheet-snapshots',cookie=cookie,child=cid)[1]['worksheets'],[])
  _,switched,_=self.request('PUT','/family/active-child',{'id':cid},cookie);self.assertEqual(switched['user']['studyContext']['grade'],3)
  # A request made by another tab retains its explicit child scope.
  self.assertEqual(len(self.request('GET','/learning',cookie=cookie,child='default')[1]['weakItems']),1)
  self.assertIsNone(self.request('GET','/learning',cookie=cookie)[1]['cursor'])
  day=dict(date=learning.today(),lessonId=l['id'],kind='characters',itemIds=ids,reviewChars=['他'])
  status,result,_=self.request('POST','/family/plans',dict(mode='daily',days=[day]),cookie,'default');self.assertEqual(status,201,result);plan=result['plan'];pid=plan['id'];self.assertEqual(plan['days'][0]['reviewChars'],['他'])
  self.assertEqual(self.request('GET','/family/plans/'+pid,cookie=cookie,child=cid)[0],404)
  self.assertEqual(self.request('POST','/family/plans',dict(mode='daily',days=[day]),cookie,cid)[0],422)
  self.assertEqual(self.request('GET','/family/growth',cookie=cookie,child='default')[1]['completedDates'],[])
  self.request('PUT','/family/plans/'+pid+'/completion',dict(day=0,completed=True),cookie,'default')
  self.assertEqual(self.request('GET','/family/growth',cookie=cookie,child='default')[1]['completedDates'],[learning.today()])
  self.assertEqual(self.request('GET','/family/growth',cookie=cookie,child=cid)[1]['completedDates'],[])
  self.request('PUT','/family/plans/'+pid+'/completion',dict(day=0,completed=False),cookie,'default')
  self.assertEqual(self.request('GET','/family/growth',cookie=cookie,child='default')[1]['completedDates'],[])
  tomorrow=dict(day,date=(date.fromisoformat(learning.today())+timedelta(days=1)).isoformat(),reviewChars=[])
  status,future,_=self.request('POST','/family/plans',dict(mode='weekly',days=[tomorrow]),cookie,'default');self.assertEqual(status,201)
  self.assertEqual(self.request('PUT','/family/plans/'+future['plan']['id']+'/completion',dict(day=0,completed=True),cookie,'default')[0],422)
  self.request('PUT','/learning/review',dict(char='他',action='reviewed'),cookie,'default')
  self.assertEqual(len(self.request('GET','/family/growth',cookie=cookie,child='default')[1]['reviewEvents']),1)
  self.assertEqual(self.request('POST','/family/shares',payload,cookie,'default')[0],422)
  payload.update(sourceMode='lesson',lessonId=l['id'],practiceKind='characters',itemIds=ids,contentVersion=self.server.catalog['contentVersion']);payload['config']['text']=''.join(i['text'] for i in p['items'][:4]);payload['config']['readings']={'秘密昵称':'私人记录'}
  payload['config'].update(showHeader=True,header=dict(title='秘密标题',name='秘密昵称',className='秘密班级',date='2026-10-24'))
  status,shared,_=self.request('POST','/family/shares',payload,cookie,'default');self.assertEqual(status,201,shared);token=shared['id'];status,public,_=self.request('GET','/shares/'+token);self.assertEqual(status,200);self.assertEqual(public['share']['config']['readings'],{});self.assertNotIn('user_id',public);self.assertNotIn('秘密昵称',json.dumps(public,ensure_ascii=False));self.assertNotIn('秘密班级',json.dumps(public,ensure_ascii=False));self.assertNotIn('秘密标题',json.dumps(public,ensure_ascii=False))
  self.request('DELETE','/family/shares/'+token,{},other)
  self.assertEqual(self.request('GET','/shares/'+token)[0],200)
  self.request('DELETE','/family/shares/'+token,{},cookie,'default')
  self.assertEqual(self.request('GET','/shares/'+token)[0],404)
  self.request('POST','/auth/logout',{},cookie);_,again,_=self.request('POST','/auth/login',dict(username='family_parent',password='abcdefgh'));self.assertEqual(again['user']['activeChildId'],cid)
 def test_legacy_database_migration_is_repeatable(self):
  with tempfile.TemporaryDirectory() as root:
   path=Path(root)/'legacy.sqlite3'
   with sqlite3.connect(path) as db:
    db.executescript('''CREATE TABLE users(id INTEGER PRIMARY KEY,username TEXT NOT NULL UNIQUE,salt TEXT NOT NULL,password_hash TEXT NOT NULL,preferences TEXT,created_at INTEGER NOT NULL,preferences_version INTEGER NOT NULL DEFAULT 0,study_context TEXT);
    CREATE TABLE learning_cursor(user_id INTEGER PRIMARY KEY,payload TEXT NOT NULL,updated_at INTEGER NOT NULL);
    CREATE TABLE weak_characters(user_id INTEGER NOT NULL,char TEXT NOT NULL,payload TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(user_id,char));
    CREATE TABLE daily_practice(user_id INTEGER NOT NULL,date TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(user_id,date));''')
    db.execute('INSERT INTO users VALUES(1,?,?,?,?,?,?,?)',('legacy','a','b',json.dumps(dict(cn='pep',en='pep',math='pep')),1,4,json.dumps(dict(grade=2,subject='cn',term='lower'))))
    db.execute('INSERT INTO learning_cursor VALUES(?,?,?)',(1,'{"lessonId":"legacy-course"}',1));db.execute('INSERT INTO weak_characters VALUES(?,?,?,?)',(1,'天','{"char":"天"}',1));db.execute('INSERT INTO daily_practice VALUES(?,?,?)',(1,'2026-10-20','{"date":"2026-10-20","completed":true}'))
   for _ in range(2):
    server=AppServer(('127.0.0.1',0),path)
    with server.db() as db:
     self.assertEqual(db.execute('SELECT child_id FROM learning_cursor').fetchone()[0],'default');self.assertEqual(db.execute('SELECT COUNT(*) FROM weak_characters').fetchone()[0],1);self.assertEqual(db.execute('SELECT version FROM children').fetchone()[0],4);self.assertTrue(json.loads(db.execute('SELECT payload FROM daily_practice').fetchone()[0])['completed']);self.assertEqual(db.execute('PRAGMA integrity_check').fetchone()[0],'ok')
    server.server_close()
