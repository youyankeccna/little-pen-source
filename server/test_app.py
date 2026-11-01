import http.client,json,sys,tempfile,threading,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from app import AppServer

class AccountFlow(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();cls.server=AppServer(('127.0.0.1',0),Path(cls.tmp.name)/'test.sqlite3');cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
 @classmethod
 def tearDownClass(cls):cls.server.shutdown();cls.server.server_close();cls.tmp.cleanup()
 def request(self,method,path,body=None,cookie=None,origin=True,mime='application/json',snapshot=None):
  connection=http.client.HTTPConnection('127.0.0.1',self.server.server_port);headers={'Content-Type':mime}
  if origin:headers['Origin']=self.server.origin
  if cookie:headers['Cookie']=cookie
  if snapshot:headers['X-Worksheet-Snapshot']=snapshot
  raw=body if isinstance(body,bytes) else json.dumps(body or {}).encode()
  connection.request(method,path,raw,headers);response=connection.getresponse();data=response.read();status=response.status;set_cookie=response.getheader('Set-Cookie');connection.close()
  return status,data,set_cookie
 def snapshot_data(self):
  return dict(sourceMode='custom',type='hanzi',pages=1,config=dict(text='春天',size=10,rowGap=2,padding=[36]*4,cellType='tzg',font='kaiti',fontWeight='normal',scale=68,offset=0,traceNum=3,traceColor='#94a3b8',lineColor='#64748b',leading=True,blankRow=False,blankCol=False,showPinyin=False,showBishun=False,pair=False,letterSpace=0,readings={},strokes=[]))
 def make_snapshot(self,cookie):
  status,raw,_=self.request('POST','/api/worksheet-snapshots',self.snapshot_data(),cookie)
  self.assertEqual(status,201,raw);return json.loads(raw)['snapshot']['id']
 def test_snapshot_contract_and_account_security(self):
  status,raw,cookie=self.request('POST','/api/v1/auth/register',{'username':'snapshot_user','password':'abcdefgh'})
  self.assertEqual(status,200);self.assertIn('requestId',json.loads(raw));cookie=cookie.split(';')[0]
  self.request('PUT','/api/v1/me/preferences',{'cn':'pep','math':'pep','en':'pep'},cookie)
  self.assertEqual(self.request('PUT','/api/v1/me/preferences',{'preferences':{'cn':'pep','math':'bnu','en':'pep'},'version':0},cookie)[0],409)
  sid=self.make_snapshot(cookie)
  self.assertEqual(self.request('POST','/api/v1/outputs',b'%PDF-1.4',cookie,mime='application/pdf',snapshot=sid)[0],200)
  self.assertEqual(self.request('POST','/api/v1/outputs',b'%PDF-1.4',cookie,mime='application/pdf',snapshot=sid)[0],200)
  with self.server.db() as db:self.assertEqual(db.execute('SELECT COUNT(*) FROM output_events WHERE snapshot_id=?',(sid,)).fetchone()[0],1)
  bad=self.snapshot_data();bad['pages']=21
  self.assertEqual(self.request('POST','/api/worksheet-snapshots',bad,cookie)[0],422)
  bad=self.snapshot_data();bad['config']['url']='file:///etc/passwd'
  self.assertEqual(self.request('POST','/api/worksheet-snapshots',bad,cookie)[0],422)
  status,raw,_=self.request('GET','/api/v1/catalog/books?subject=en&grade=6&term=lower')
  self.assertEqual(status,200);books=json.loads(raw)['data']['books'];self.assertTrue(books);self.assertTrue(all(b['subject']=='en' and b['grade']==6 and b['term']=='lower' for b in books));self.assertTrue(any(b['id']=='en-6-lower-historical-reference' for b in books))
  lesson=self.server.catalog['lessons'][0];group=lesson['packs'][0]
  bad=self.snapshot_data();bad.update(sourceMode='lesson',lessonId=lesson['id'],practiceKind=group['kind'],itemIds=['not-in-this-lesson'],contentVersion=self.server.catalog['contentVersion'])
  self.assertEqual(self.request('POST','/api/worksheet-snapshots',bad,cookie)[0],422)
  valid=self.snapshot_data();items=group['items'][:2]
  valid.update(sourceMode='lesson',lessonId=lesson['id'],practiceKind=group['kind'],itemIds=[i['id'] for i in items],contentVersion=self.server.catalog['contentVersion'])
  valid['config']['text']=''.join(i['text'] for i in items)
  self.assertEqual(self.request('POST','/api/worksheet-snapshots',valid,cookie)[0],201)
  valid['config']['text']='客户端篡改文字'
  self.assertEqual(self.request('POST','/api/worksheet-snapshots',valid,cookie)[0],422)
  _,_,other=self.request('POST','/api/auth/register',{'username':'snapshot_other','password':'abcdefgh'});other=other.split(';')[0]
  self.request('PUT','/api/preferences',{'cn':'pep','math':'pep','en':'pep'},other)
  self.assertEqual(self.request('GET','/api/worksheet-snapshots/'+sid,cookie=other)[0],404)
  self.assertEqual(self.request('POST','/api/output',b'%PDF-1.4',other,mime='application/pdf',snapshot=sid)[0],403)
  _,_,second=self.request('POST','/api/auth/login',{'username':'snapshot_user','password':'abcdefgh'});second=second.split(';')[0]
  self.assertEqual(self.request('PUT','/api/auth/password',{'password':'abcdefgh','newPassword':'newpassword123'},cookie)[0],200)
  self.assertIsNone(json.loads(self.request('GET','/api/me',cookie=second)[1])['user'])
  self.assertEqual(self.request('POST','/api/auth/login',{'username':'snapshot_user','password':'abcdefgh'})[0],401)
  _,_,cookie=self.request('POST','/api/auth/login',{'username':'snapshot_user','password':'newpassword123'});cookie=cookie.split(';')[0]
  self.assertEqual(self.request('DELETE','/api/me',{'password':'newpassword123','confirmation':'no'},cookie)[0],422)
  self.assertEqual(self.request('DELETE','/api/me',{'password':'newpassword123','confirmation':'注销账号'},cookie)[0],200)
  self.assertEqual(self.request('GET','/api/worksheet-snapshots/'+sid,cookie=cookie)[0],401)
  with self.server.db() as db:self.assertEqual(db.execute('SELECT COUNT(*) FROM worksheet_snapshots WHERE id=?',(sid,)).fetchone()[0],0)
 def test_real_account_permissions_and_preferences(self):
  self.assertEqual(self.request('POST','/api/output',b'%PDF-1.4',mime='application/pdf')[0],401)
  self.assertEqual(self.request('POST','/api/auth/register',{'username':'parent_test','password':'abcdefgh'},origin=False)[0],403)
  status,data,cookie=self.request('POST','/api/auth/register',{'username':'parent_test','password':'abcdefgh'})
  self.assertEqual(status,200);self.assertIn('HttpOnly',cookie);self.assertIsNone(json.loads(data)['user']['preferences'])
  cookie=cookie.split(';')[0]
  self.assertEqual(self.request('POST','/api/output',b'%PDF-1.4',cookie,mime='application/pdf')[0],409)
  self.assertEqual(self.request('PUT','/api/preferences',{'cn':'pep','math':'invalid','en':'pep'},cookie)[0],400)
  preferences={'cn':'pep','math':'bnu','en':'fltrp'}
  self.assertEqual(self.request('PUT','/api/preferences',preferences,cookie)[0],200)
  sid=self.make_snapshot(cookie)
  self.assertEqual(self.request('POST','/api/output',b'not-pdf',cookie,mime='application/pdf',snapshot=sid)[0],400)
  self.assertEqual(self.request('POST','/api/output',b'%PDF-1.4\n',cookie,mime='application/pdf',snapshot=sid)[:2],(200,b'%PDF-1.4\n'))
  self.assertEqual(self.request('POST','/api/auth/logout',cookie=cookie)[0],200)
  self.assertIsNone(json.loads(self.request('GET','/api/me',cookie=cookie)[1])['user'])
  self.assertEqual(self.request('POST','/api/output',b'%PDF-1.4',cookie,mime='application/pdf')[0],401)
  self.assertEqual(self.request('POST','/api/auth/login',{'username':'parent_test','password':'wrongpass'})[0],401)
  status,data,new_cookie=self.request('POST','/api/auth/login',{'username':'parent_test','password':'abcdefgh'})
  self.assertEqual(status,200);self.assertEqual(json.loads(data)['user']['preferences'],preferences)
  with self.server.db() as db:
   row=db.execute('SELECT * FROM users WHERE username=?',('parent_test',)).fetchone();self.assertNotEqual(row['password_hash'],'abcdefgh');self.assertEqual(len(row['salt']),32)
  self.assertEqual(self.request('POST','/api/auth/register',{'username':'parent_test','password':'abcdefgh'})[0],409)
  self.assertEqual(self.request('GET','/output/accounts.sqlite3')[0],404)
  status,second,other=self.request('POST','/api/auth/register',{'username':'parent_other','password':'abcdefgh'})
  self.assertEqual(status,200);self.assertIsNone(json.loads(second)['user']['preferences'])
  self.assertEqual(json.loads(self.request('GET','/api/me',cookie=new_cookie.split(';')[0])[1])['user']['preferences'],preferences)
  with self.server.db() as db:db.execute('UPDATE sessions SET expires_at=0')
  self.assertEqual(self.request('POST','/api/output',b'%PDF-1.4',new_cookie.split(';')[0],mime='application/pdf')[0],401)
if __name__=='__main__':unittest.main()
