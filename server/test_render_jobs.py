import http.client,json,time,unittest
from pathlib import Path
import test_mobile

class RenderFlow(unittest.TestCase):
 setUp=test_mobile.MobileFlow.setUp
 tearDown=test_mobile.MobileFlow.tearDown
 call=test_mobile.MobileFlow.call
 account=test_mobile.MobileFlow.account
 def api(self,method,path,data=None,token=None,key=None,child=None,origin=None):
  headers={'Content-Type':'application/json'}
  if token:headers['Authorization']='Bearer '+token
  if key:headers['X-Render-Key']=key
  if child:headers['X-Child-Id']=child
  if origin:headers['Origin']=origin
  c=http.client.HTTPConnection('127.0.0.1',self.server.server_port)
  c.request(method,'/api/v1'+path,json.dumps(data or {}),headers);r=c.getresponse();raw=r.read();status=r.status;mime=r.getheader('Content-Type');c.close()
  return status,json.loads(raw).get('data',json.loads(raw)) if 'json' in mime else raw
 def create(self,lesson='bank-cn-3-upper',kind='words',count=4,token=None):
  group=next(p for p in self.server.lessons[lesson]['packs'] if p['kind']==kind)
  body=dict(lessonId=lesson,kind=kind,itemIds=[i['id'] for i in group['items'][:count]],options=dict(fillPage=True,font='wenkai'))
  status,job=self.api('POST','/render-jobs',body,token=token);self.assertEqual(status,202,job)
  return self.ready(job,token),body
 def ready(self,job,token=None):
  for _ in range(200):
   status,result=self.api('GET','/render-jobs/'+job['id'],token=token,key=job['key']);self.assertEqual(status,200,result)
   if result['status']=='failed':self.fail(str(result))
   if result['status']=='ready':return {**job,**result}
   time.sleep(.05)
  self.fail('Render timed out')
 def test_guest_real_a4_pdf_png_and_file_capability(self):
  job,_=self.create('bank-math-4-upper-mul-two','calculations')
  self.assertEqual(job['pages'],1)
  path='/render-jobs/'+job['id']
  self.assertEqual(self.api('GET',path)[0],404)
  self.assertEqual(self.api('GET',path+'/workbook.pdf',key='wrong')[0],404)
  status,pdf=self.api('GET',path+'/workbook.pdf',key=job['key']);self.assertEqual(status,200);self.assertTrue(pdf.startswith(b'%PDF-'))
  status,png=self.api('GET',path+'/page-1.png',key=job['key']);self.assertEqual(status,200);self.assertTrue(png.startswith(b'\x89PNG'))
  width=int.from_bytes(png[16:20],'big');self.assertEqual(width,2480)
  self.assertEqual(self.api('POST',path+'/save',key=job['key'])[0],403)  # Browser mutations without Origin remain forbidden.
  self.assertEqual(self.api('GET',path+'/../../accounts.sqlite3',key=job['key'])[0],404)
  self.assertEqual(self.api('GET',path+'/page-20.png',key=job['key'])[0],404)
  self.server.render_jobs.jobs[job['id']]['expiresAt']=0
  self.assertEqual(self.api('GET',path+'/workbook.pdf',key=job['key'])[0],404)
 def test_chinese_bilingual_and_multipage(self):
  cn,_=self.create();self.assertGreaterEqual(cn['pages'],1)
  en=next(l for l in self.server.lessons.values() if l['id'].startswith('bank-en') and any(p['kind']=='vocabularyBilingual' for p in l['packs']))
  job,_=self.create(en['id'],'vocabularyBilingual');self.assertGreaterEqual(job['pages'],1)
  math,_=self.create('bank-math-4-upper-mul-two','calculations',20);self.assertGreater(math['pages'],1)
 def test_owned_job_save_idempotency_and_snapshot_reopen(self):
  cookie,token=self.account();_,other=self.account('other')
  self.call('PUT','/me/preferences',dict(cn='pep',math='pep',en='pep'),token=token)
  job,_=self.create(token=token);path='/render-jobs/'+job['id']
  self.assertEqual(self.api('GET',path,key=job['key'])[0],401)
  self.assertEqual(self.api('GET',path,key=job['key'],token=other)[0],404)
  status,history=self.api('POST',path+'/output',dict(format='pdf'),key=job['key'],token=token);self.assertEqual(status,201,history)
  self.assertFalse(self.call('GET','/worksheet-snapshots',cookie=cookie)[1]['worksheets'][0]['favorite'])
  self.assertEqual(self.api('POST',path+'/output',dict(format='pdf'),key=job['key'],token=token)[1],history)
  with self.server.db() as db:self.assertEqual(db.execute('SELECT COUNT(*) FROM output_events').fetchone()[0],1)
  status,result=self.api('POST',path+'/save',key=job['key'],token=token);self.assertEqual(status,201,result)
  self.assertEqual(result,history)
  self.assertEqual(self.api('POST',path+'/save',key=job['key'],token=token)[1],result)
  sid=result['snapshotId'];saved=self.call('GET','/worksheet-snapshots/'+sid,cookie=cookie)[1]['snapshot'];self.assertEqual(saved['pages'],job['pages'])
  self.assertTrue(self.call('GET','/worksheet-snapshots?favorite=1',cookie=cookie)[1]['worksheets'][0]['favorite'])
  status,reopen=self.api('POST','/render-jobs',dict(snapshotId=sid),token=token);self.assertEqual(status,202,reopen);self.assertEqual(self.ready(reopen,token)['pages'],job['pages'])
  self.assertEqual(self.api('POST','/render-jobs',dict(snapshotId=sid),token=other)[0],422)
  self.assertEqual(self.call('DELETE','/me',dict(password='abcdefgh',confirmation='注销账号'),token=token)[0],200)
  self.assertNotIn(job['id'],self.server.render_jobs.jobs)
  self.assertFalse((self.server.render_jobs.root/job['id']).exists())
 def test_validation_no_private_guest_render_or_foreign_origin(self):
  self.assertEqual(self.api('POST','/render-jobs',dict(snapshotId='secret'))[0],422)
  data=dict(lessonId='bank-cn-3-upper',kind='words',itemIds=['made-up'])
  self.assertEqual(self.api('POST','/render-jobs',data)[0],422)
  data['options']={'text':'private text'};self.assertEqual(self.api('POST','/render-jobs',data)[0],422)
  self.assertEqual(self.api('POST','/render-jobs',{},origin='https://evil.example')[0],403)
  self.assertEqual(self.api('POST','/render-jobs',{},token='invalid')[0],401)
 def test_math_completion_is_shared_reversible_and_not_export_driven(self):
  cookie,token=self.account();lesson=self.server.lessons['bank-math-4-upper-mul-two'];group=next(g for g in lesson['packs'] if g['kind']=='calculations')
  from learning import today
  body=dict(mode='daily',days=[dict(date=today(),lessonId=lesson['id'],kind='calculations',itemIds=[group['items'][0]['id']])])
  status,result,_=self.call('POST','/family/plans',body,token=token);self.assertEqual(status,201,result)
  identifier=result['plan']['id'];self.assertEqual(self.call('POST','/family/plans',body,token=token)[1]['plan']['id'],identifier);self.create(lesson['id'],'calculations',token=token)
  self.assertEqual(self.call('GET','/family/growth',cookie=cookie)[1]['completedDates'],[])
  for _ in range(2):self.assertEqual(self.call('PUT','/family/plans/'+identifier+'/completion',dict(day=0,completed=True),token=token)[0],200)
  self.assertEqual(self.call('GET','/family/growth',cookie=cookie)[1]['completedDates'],[today()])
  self.call('PUT','/family/plans/'+identifier+'/completion',dict(day=0,completed=False),token=token)
  self.assertEqual(self.call('GET','/family/growth',cookie=cookie)[1]['completedDates'],[])

if __name__=='__main__':unittest.main()
