import json,threading,time,unittest
import test_app
from app import AppServer
from learning import today,review_character

class DailyReviewFlow(unittest.TestCase):
 setUpClass=classmethod(test_app.AccountFlow.setUpClass.__func__)
 tearDownClass=classmethod(test_app.AccountFlow.tearDownClass.__func__)
 request=test_app.AccountFlow.request
 def test_daily_and_review_are_private_persistent_and_explicit(self):
  cookies=[]
  for name in ['daily_one','daily_two']:
   status,_,cookie=self.request('POST','/api/auth/register',{'username':name,'password':'abcdefgh'});self.assertEqual(status,200);cookies.append(cookie.split(';')[0])
  one,two=cookies;lesson=self.server.lessons['topic-cn-2-lower-4'];chars=lesson['packs'][0]['items']
  body={'lessonId':lesson['id'],'kind':'characters','amount':6,'itemIds':[i['id'] for i in chars[:6]]}
  self.assertEqual(self.request('PUT','/api/learning/daily',body)[0],401)
  self.assertEqual(self.request('PUT','/api/learning/daily',dict(body,itemIds=['bad']),one)[0],422)
  self.assertEqual(self.request('PUT','/api/learning/daily',dict(body,amount=True),one)[0],422)
  self.assertEqual(self.request('PUT','/api/learning/daily',dict(body,lessonId='kg-nature'),one)[0],422)
  status,raw,_=self.request('PUT','/api/learning/daily',body,one);self.assertEqual(status,200,raw);plan=json.loads(raw)['dailyPlan'];self.assertFalse(plan['completed']);self.assertEqual(len(plan['text']),6)
  self.assertIsNone(json.loads(self.request('GET','/api/learning',cookie=two)[1])['dailyPlan'])
  complete={k:plan[k] for k in ['id','date']};complete['completed']=True
  self.assertEqual(self.request('PUT','/api/learning/daily/completion',complete,two)[0],422)
  self.assertEqual(self.request('PUT','/api/learning/daily/completion',dict(complete,id='old'),one)[0],422)
  self.assertTrue(json.loads(self.request('PUT','/api/learning/daily/completion',complete,one)[1])['dailyPlan']['completed'])
  complete['completed']=False;self.assertFalse(json.loads(self.request('PUT','/api/learning/daily/completion',complete,one)[1])['dailyPlan']['completed'])
  # A replaced plan cannot be marked by a stale tab.
  plan2=json.loads(self.request('PUT','/api/learning/daily',body,one)[1])['dailyPlan'];self.assertNotEqual(plan['id'],plan2['id']);self.assertEqual(self.request('PUT','/api/learning/daily/completion',complete,one)[0],422)
  selection={'operation':'add','items':[{'char':'春','lessonId':lesson['id']}]};self.request('PUT','/api/learning/weak-items',selection,one)
  self.assertEqual(self.request('PUT','/api/learning/review',{'char':'春','action':'mastered'},two)[0],422)
  now=time.time();raw=self.request('PUT','/api/learning/review',{'char':'春','action':'reviewed'},one)[1];item=json.loads(raw)['weakItems'][0];self.assertEqual(item['reviewStage'],1);self.assertAlmostEqual(item['nextReviewAt'],now+3*86400,delta=3)
  repeat=json.loads(self.request('PUT','/api/learning/review',{'char':'春','action':'reviewed'},one)[1])['weakItems'][0];self.assertEqual(item,repeat)
  # Re-adding an already saved character must not erase its schedule.
  repeated=json.loads(self.request('PUT','/api/learning/weak-items',selection,one)[1])['weakItems'][0];self.assertEqual(repeated,item)
  mastered=json.loads(self.request('PUT','/api/learning/review',{'char':'春','action':'mastered'},one)[1])['weakItems'][0];self.assertEqual(mastered['reviewStatus'],'mastered');self.assertIsNone(mastered['nextReviewAt'])
  self.assertEqual(self.request('PUT','/api/learning/review',{'char':'春','action':'reviewed'},one)[0],422)
  self.server.shutdown();self.server.server_close();type(self).server=AppServer(('127.0.0.1',0),self.server.database);type(self).thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
  state=json.loads(self.request('GET','/api/learning',cookie=one)[1]);self.assertEqual(state['dailyPlan']['id'],plan2['id']);self.assertEqual(state['weakItems'][0]['reviewStatus'],'mastered')
  restored=json.loads(self.request('PUT','/api/learning/review',{'char':'春','action':'restore'},one)[1])['weakItems'][0];self.assertEqual(restored['reviewStage'],0);self.assertEqual(restored['reviewStatus'],'active')
  again=json.loads(self.request('PUT','/api/learning/review',{'char':'春','action':'again'},one)[1])['weakItems'][0];self.assertEqual(again['reviewStage'],0);self.assertAlmostEqual(again['nextReviewAt'],time.time()+86400,delta=3)
  self.assertEqual(today(1792167000),'2026-10-17')
if __name__=='__main__':unittest.main()
