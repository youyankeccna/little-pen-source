"""Real HTTP tests: native token auth and website share one child-scoped store."""
import http.client,json,sys,tempfile,threading,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from app import AppServer,token_hash

class MobileFlow(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.server=AppServer(('127.0.0.1',0),Path(self.tmp.name)/'test.sqlite3')
  self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
  self.context=dict(subject='cn',grade=3,type='cizu',variant='standard')
 def tearDown(self):self.server.shutdown();self.server.server_close();self.tmp.cleanup()
 def call(self,method,path,data=None,token=None,cookie=None,origin=None,child=None):
  headers={'Content-Type':'application/json'}
  if token:headers['Authorization']='Bearer '+token
  if cookie:headers['Cookie']=cookie
  if origin:headers['Origin']=self.server.origin if origin is True else origin
  if child:headers['X-Child-Id']=child
  con=http.client.HTTPConnection('127.0.0.1',self.server.server_port)
  con.request(method,'/api/v1'+path,json.dumps(data or {}),headers);res=con.getresponse();body=json.loads(res.read());status=res.status;cookie=res.getheader('Set-Cookie');con.close()
  return status,body.get('data',body),cookie
 def account(self,name='parent'):
  status,data,cookie=self.call('POST','/auth/register',dict(username=name,password='abcdefgh'),origin=True)
  self.assertEqual(status,200);self.assertNotIn('accessToken',data)
  status,mobile,_=self.call('POST','/auth/mobile/login',dict(username=name,password='abcdefgh'))
  self.assertEqual(status,200);self.assertEqual(data['user']['id'],mobile['user']['id'])
  return cookie.split(';')[0],mobile['accessToken']
 def layout(self,config,version=0):return dict(context=self.context,config=config,version=version)
 def test_shared_settings_and_revocation(self):
  cookie,token=self.account()
  payload=dict(preferences=dict(cn='pep',math='pep',en='pep'),studyContext=dict(grade=3,subject='cn',term='upper'),version=0)
  self.assertEqual(self.call('PUT','/me/preferences',payload,token=token)[0],200)
  self.assertEqual(self.call('GET','/me',cookie=cookie)[1]['user']['studyContext'],payload['studyContext'])
  self.assertEqual(self.call('PUT','/layout-preferences',self.layout(dict(size=12)),token=token)[0],200)
  row=self.call('GET','/layout-preferences',cookie=cookie)[1]['layouts'][0];self.assertEqual(row['config']['size'],12)
  self.assertEqual(self.call('PUT','/layout-preferences',self.layout(dict(size=11),1),cookie=cookie,origin=True)[0],200)
  self.assertEqual(self.call('GET','/layout-preferences',token=token)[1]['layouts'][0]['config']['size'],11)
  with self.server.db() as db:self.assertIsNotNone(db.execute('SELECT 1 FROM sessions WHERE token_hash=?',(token_hash(token),)).fetchone())
  self.assertEqual(self.call('POST','/auth/logout',token=token)[0],200)
  self.assertEqual(self.call('GET','/layout-preferences',token=token)[0],401)
  self.assertIsNotNone(self.call('GET','/me',cookie=cookie)[1]['user'])
 def test_csrf_expiry_and_invalid_bearer(self):
  cookie,token=self.account()
  self.assertEqual(self.call('POST','/auth/mobile/login',dict(username='parent',password='abcdefgh'),origin='https://evil.example')[0],403)
  self.assertEqual(self.call('PUT','/layout-preferences',self.layout(dict(size=10)),cookie=cookie)[0],403)
  self.assertEqual(self.call('PUT','/layout-preferences',self.layout(dict(size=10)),token=token,origin='https://evil.example')[0],403)
  self.assertEqual(self.call('GET','/layout-preferences',token='invalid',cookie=cookie)[0],401)
  with self.server.db() as db:db.execute('UPDATE sessions SET expires_at=0 WHERE token_hash=?',(token_hash(token),))
  self.assertEqual(self.call('GET','/layout-preferences',token=token)[0],401)
 def test_conflicts_tombstones_and_validation(self):
  cookie,token=self.account()
  self.assertEqual(self.call('PUT','/layout-preferences',self.layout(dict(size=12)),token=token)[0],200)
  self.assertEqual(self.call('PUT','/layout-preferences',self.layout(dict(size=10)),cookie=cookie,origin=True)[0],409)
  self.assertEqual(self.call('PUT','/layout-preferences',self.layout(None,1),token=token)[0],200)
  self.assertIsNone(self.call('GET','/layout-preferences',cookie=cookie)[1]['layouts'][0]['config'])
  self.assertEqual(self.call('PUT','/layout-preferences',self.layout(dict(size=10),1),token=token)[0],409)
  for config in [dict(text='private'),dict(size=True),dict(size=100),dict(size=float('nan')),dict(font='local'),dict(padding=[10,10])]:
   self.assertEqual(self.call('PUT','/layout-preferences',self.layout(config,2),token=token)[0],422)
 def test_child_and_account_isolation(self):
  cookie,token=self.account();_,other=self.account('other')
  data=dict(name='妹妹',preferences=dict(cn='pep',math='pep',en='pep'),studyContext=dict(grade=1,subject='cn',term='upper'))
  status,result,_=self.call('POST','/family/children',data,token=token);self.assertEqual(status,201)
  child=next(c['id'] for c in result['user']['children'] if c['name']=='妹妹')
  self.assertEqual(self.call('PUT','/layout-preferences',self.layout(dict(size=14)),token=token,child=child)[0],200)
  self.assertEqual(self.call('GET','/layout-preferences',token=token,child='default')[1]['layouts'],[])
  self.assertEqual(self.call('GET','/layout-preferences',token=other,child=child)[0],403)
  self.assertEqual(self.call('GET','/layout-preferences',token=other)[1]['layouts'],[])
  self.assertEqual(self.call('DELETE','/me',dict(password='abcdefgh',confirmation='注销账号'),token=token)[0],200)
  with self.server.db() as db:self.assertEqual(db.execute('SELECT COUNT(*) FROM layout_preferences').fetchone()[0],0)
 def test_catalog_cursor_and_password_change(self):
  cookie,token=self.account()
  guest=self.call('GET','/catalog/books?grade=3&subject=en&term=upper')[1]
  self.assertEqual(guest,self.call('GET','/catalog/books?grade=3&subject=en&term=upper',token=token)[1])
  lesson=self.server.lessons['bank-cn-3-upper'];pack=lesson['packs'][0]
  cursor=dict(lessonId=lesson['id'],kind=pack['kind'],itemIds=[pack['items'][0]['id']])
  self.assertEqual(self.call('PUT','/learning/cursor',cursor,token=token)[0],200)
  self.assertEqual(self.call('GET','/learning',cookie=cookie)[1]['cursor']['itemIds'],cursor['itemIds'])
  self.assertEqual(self.call('PUT','/auth/password',dict(password='abcdefgh',newPassword='newpassword'),cookie=cookie,origin=True)[0],200)
  self.assertEqual(self.call('GET','/layout-preferences',token=token)[0],401)

if __name__=='__main__':unittest.main()
