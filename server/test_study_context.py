import json,unittest
import test_app
class StudyContextFlow(unittest.TestCase):
 setUpClass=classmethod(test_app.AccountFlow.setUpClass.__func__)
 tearDownClass=classmethod(test_app.AccountFlow.tearDownClass.__func__)
 request=test_app.AccountFlow.request
 def test_context_saved_with_preferences_and_isolated(self):
  cookies=[]
  for name in ['context_one','context_two']:
   _,_,cookie=self.request('POST','/api/auth/register',{'username':name,'password':'abcdefgh'});cookies.append(cookie.split(';')[0])
  one,two=cookies;context={'grade':2,'subject':'en','term':'lower'};prefs={'cn':'pep','math':'pep','en':'yilin'}
  status,raw,_=self.request('PUT','/api/preferences',{'preferences':prefs,'studyContext':context,'version':0},one);self.assertEqual(status,200,raw);user=json.loads(raw)['user'];self.assertEqual(user['studyContext'],context)
  self.assertEqual(json.loads(self.request('GET','/api/me',cookie=one)[1])['user']['studyContext'],context)
  self.assertIsNone(json.loads(self.request('GET','/api/me',cookie=two)[1])['user']['studyContext'])
  self.assertEqual(self.request('PUT','/api/preferences',{'preferences':prefs,'studyContext':dict(context,grade=7),'version':1},one)[0],400)
  self.assertEqual(self.request('PUT','/api/preferences',{'preferences':prefs,'studyContext':dict(context,grade=True),'version':1},one)[0],400)
  self.assertEqual(self.request('PUT','/api/preferences',{'preferences':prefs,'studyContext':context,'version':0},one)[0],409)
  # Existing callers updating only an edition keep the saved grade and volume.
  _,raw,_=self.request('PUT','/api/preferences',{'preferences':prefs,'version':1},one);self.assertEqual(json.loads(raw)['user']['studyContext'],context)
