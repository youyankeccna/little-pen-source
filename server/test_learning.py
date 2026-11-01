import json,threading,unittest
import test_app
from app import AppServer

class LearningFlow(unittest.TestCase):
 setUpClass=classmethod(test_app.AccountFlow.setUpClass.__func__)
 tearDownClass=classmethod(test_app.AccountFlow.tearDownClass.__func__)
 request=test_app.AccountFlow.request
 snapshot_data=test_app.AccountFlow.snapshot_data
 make_snapshot=test_app.AccountFlow.make_snapshot
 def test_private_learning_and_saved_replay(self):
  self.assertEqual(self.request('GET','/api/learning')[0],401)
  cookies=[]
  for name in ['learning_one','learning_two']:
   status,_,cookie=self.request('POST','/api/auth/register',{'username':name,'password':'abcdefgh'})
   self.assertEqual(status,200);cookie=cookie.split(';')[0];cookies.append(cookie)
   self.request('PUT','/api/preferences',{'cn':'pep','math':'pep','en':'pep'},cookie)
  one,two=cookies
  lesson=self.server.lessons['cn-1u-tiandiren'];group=lesson['packs'][0]
  cursor={'lessonId':lesson['id'],'kind':group['kind'],'itemIds':[group['items'][0]['id']]}
  self.assertEqual(self.request('PUT','/api/learning/cursor',cursor,one)[0],200)
  bad=dict(cursor,itemIds=['someone-elses-item'])
  self.assertEqual(self.request('PUT','/api/learning/cursor',bad,one)[0],422)
  self.assertIsNone(json.loads(self.request('GET','/api/learning',cookie=two)[1])['cursor'])
  selection={'operation':'add','items':[{'char':'天','lessonId':lesson['id']}]}
  self.assertEqual(self.request('PUT','/api/learning/weak-items',selection,one)[0],200)
  self.assertEqual(len(json.loads(self.request('PUT','/api/learning/weak-items',selection,one)[1])['weakItems']),1)
  self.assertEqual(json.loads(self.request('GET','/api/learning',cookie=two)[1])['weakItems'],[])
  self.assertEqual(self.request('PUT','/api/learning/weak-items',{'operation':'add','items':[{'char':'龘','lessonId':lesson['id']}]},one)[0],422)
  data=self.snapshot_data();data.update(sourceMode='review',reviewChars=['天']);data['config'].update(text='天',practiceMode='quiz',showPinyin=True)
  self.assertEqual(self.request('POST','/api/worksheet-snapshots',data,two)[0],422)
  status,raw,_=self.request('POST','/api/worksheet-snapshots',data,one);self.assertEqual(status,201,raw)
  sid=json.loads(raw)['snapshot']['id']
  self.assertEqual(self.request('PUT','/api/worksheet-snapshots/'+sid+'/favorite',{'favorite':True},two)[0],404)
  self.assertEqual(self.request('PUT','/api/worksheet-snapshots/'+sid+'/favorite',{'favorite':True},one)[0],200)
  self.assertEqual(len(json.loads(self.request('GET','/api/worksheet-snapshots?favorite=1',cookie=one)[1])['worksheets']),1)
  self.assertEqual(json.loads(self.request('GET','/api/worksheet-snapshots',cookie=two)[1])['worksheets'],[])
  # Reload persisted state through a new server instance, including the private snapshot.
  self.server.shutdown();self.server.server_close()
  type(self).server=AppServer(('127.0.0.1',0),self.server.database)
  type(self).thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
  state=json.loads(self.request('GET','/api/learning',cookie=one)[1]);self.assertEqual(state['cursor']['lessonId'],lesson['id']);self.assertEqual(state['weakItems'][0]['char'],'天')
  payload=json.loads(self.request('GET','/api/worksheet-snapshots/'+sid,cookie=one)[1])['snapshot'];self.assertEqual(payload['config']['practiceMode'],'quiz');self.assertEqual(payload['config']['text'],'天')
  self.assertEqual(self.request('GET','/api/worksheet-snapshots/'+sid,cookie=two)[0],404)
  self.request('PUT','/api/learning/weak-items',{'operation':'remove','items':[{'char':'天'}]},one)
  self.assertEqual(json.loads(self.request('GET','/api/learning',cookie=one)[1])['weakItems'],[])
  # Previously saved text remains immutable after removing a review character.
  self.assertEqual(json.loads(self.request('GET','/api/worksheet-snapshots/'+sid,cookie=one)[1])['snapshot']['config']['text'],'天')
if __name__=='__main__':unittest.main()
