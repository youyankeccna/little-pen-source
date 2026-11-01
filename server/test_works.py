import base64,io,json,subprocess,unittest
from datetime import date,timedelta
from pathlib import Path
from urllib.parse import quote
from PIL import Image
import test_mobile

class WorksFlow(unittest.TestCase):
 setUp=test_mobile.MobileFlow.setUp
 tearDown=test_mobile.MobileFlow.tearDown
 call=test_mobile.MobileFlow.call
 account=test_mobile.MobileFlow.account
 def picture(self):
  image=Image.new('RGB',(100,80),'white');image.putpixel((50,40),(0,0,0));out=io.BytesIO();exif=Image.Exif();exif[315]='QA-only metadata';image.save(out,format='JPEG',exif=exif);return base64.b64encode(out.getvalue()).decode()
 def photo(self,token,day=None,child=None):
  import learning
  status,result,_=self.call('POST','/works',dict(date=day or learning.today(),title='认真练一笔',imageBase64=self.picture()),token=token,child=child)
  self.assertEqual(status,201,result);return result['work']
 def strokes(self,char='一'):
  script="import {makeGuides} from './shared/writing-coach.mjs';import fs from 'node:fs';console.log(JSON.stringify(makeGuides(JSON.parse(fs.readFileSync('web-preview/vendor/hanzi/'+process.argv[1]+'.json')).medians)))"
  result=subprocess.run(['node','--input-type=module','-e',script,char],capture_output=True,text=True,check=True,cwd=Path(__file__).resolve().parents[1]);return json.loads(result.stdout)
 def test_public_guides_and_capabilities(self):
  self.assertFalse(self.call('GET','/writing/capabilities')[1]['photoAI'])
  guide=self.call('GET','/writing/guide/'+quote('一'))[1]['guide'];self.assertEqual(guide['char'],'一');self.assertEqual(len(guide['medians']),1)
  self.assertEqual(self.call('GET','/writing/guide/..')[0],422)
  challenge=self.call('GET','/writing/challenge?grade=1&term=upper')[1];self.assertGreater(len(challenge['characters']),0);self.assertLessEqual(len(challenge['characters']),5)
  self.assertEqual(self.call('GET','/writing/challenge?lessonId=missing')[0],422)
  self.assertEqual(self.call('GET','/writing/challenge?lessonId=bank-math-4-upper-mul-two')[0],422)
 def test_private_photo_deduplication_and_recycle(self):
  cookie,token=self.account();self.assertEqual(self.call('GET','/worksheet-snapshots',token=token)[0],200);_,other=self.account('other');work=self.photo(token);again=self.photo(token);self.assertEqual(work['id'],again['id'])
  self.assertEqual(len(self.call('GET','/works',cookie=cookie)[1]['works']),1)
  self.assertEqual(self.call('GET','/works')[0],401)
  self.assertEqual(self.call('GET','/works/'+work['id']+'/image',token=other)[0],404)
  import http.client
  c=http.client.HTTPConnection('127.0.0.1',self.server.server_port);c.request('GET','/api/v1/works/'+work['id']+'/image',headers={'Authorization':'Bearer '+token});r=c.getresponse();raw=r.read();self.assertEqual(r.status,200);self.assertEqual(r.getheader('Content-Type'),'image/jpeg');c.close()
  with Image.open(io.BytesIO(raw)) as image:self.assertFalse(image.getexif())
  self.assertEqual(self.call('DELETE','/works/'+work['id'],token=token)[0],200)
  self.assertEqual(self.call('GET','/works',token=token)[1]['works'],[])
  self.assertEqual(self.call('GET','/works/'+work['id']+'/image',token=token)[0],404)
  self.assertEqual(len(self.call('GET','/works?trash=1',token=token)[1]['works']),1)
  self.assertEqual(self.call('POST','/works/'+work['id']+'/restore',token=other)[0],404)
  self.assertEqual(self.call('POST','/works/'+work['id']+'/restore',token=token)[0],200)
  self.assertEqual(len(self.call('GET','/works',token=token)[1]['works']),1)
 def test_real_stroke_validation_stars_and_owned_works(self):
  _,token=self.account();strokes=self.strokes();body=dict(char='一',strokes=strokes,saveWork=True)
  status,result,_=self.call('POST','/writing/attempts',body,token=token);self.assertEqual(status,200,result);self.assertTrue(result['passed']);self.assertTrue(result['newStar']);self.assertEqual(result['stars'],1)
  self.assertEqual(result['work']['kind'],'trace');self.assertTrue(result['work']['analysis']['guideHash'])
  again=self.call('POST','/writing/attempts',body,token=token)[1];self.assertFalse(again['newStar']);self.assertEqual(again['stars'],1);self.assertEqual(again['work']['id'],result['work']['id'])
  reverse=dict(char='一',strokes=[list(reversed(strokes[0]))],saveWork=True)
  self.assertFalse(self.call('POST','/writing/attempts',reverse,token=token)[1]['passed']);self.assertEqual(self.call('GET','/writing/progress',token=token)[1]['stars'],1)
  self.assertEqual(len(self.call('GET','/works',token=token)[1]['works']),1)
  self.assertEqual(self.call('GET','/family/growth',token=token)[1]['completedDates'],[],'stars do not fabricate parent completion')
  body['passed']=True;self.assertEqual(self.call('POST','/writing/attempts',body,token=token)[0],422)
 def test_child_isolation_and_account_erasure(self):
  _,token=self.account();first=self.photo(token)
  data=dict(name='妹妹',preferences=dict(cn='pep',math='pep',en='pep'),studyContext=dict(grade=1,subject='cn',term='upper'))
  children=self.call('POST','/family/children',data,token=token)[1]['user']['children'];child=next(c['id'] for c in children if c['name']=='妹妹')
  self.assertEqual(self.call('GET','/works',token=token,child=child)[1]['works'],[])
  self.assertEqual(self.call('GET','/works/'+first['id']+'/image',token=token,child=child)[0],404)
  body=dict(char='一',strokes=self.strokes(),saveWork=False);self.call('POST','/writing/attempts',body,token=token,child=child)
  self.assertEqual(self.call('GET','/writing/progress',token=token,child='default')[1]['stars'],0)
  root=Path(self.server.database+'.assets')/'private-works';self.assertTrue(list(root.glob('*.image')))
  self.assertEqual(self.call('DELETE','/me',dict(password='abcdefgh',confirmation='注销账号'),token=token)[0],200)
  self.assertEqual(list(root.glob('*.image')),[])
  with self.server.db() as db:
   self.assertEqual(db.execute('SELECT COUNT(*) FROM family_works').fetchone()[0],0);self.assertEqual(db.execute('SELECT COUNT(*) FROM writing_completions').fetchone()[0],0)
 def test_backup_includes_private_images_and_fails_cleanly_if_missing(self):
  _,token=self.account();work=self.photo(token);script=Path(__file__).resolve().parents[1]/'scripts/backup_accounts.py'
  target=Path(self.tmp.name)/'backup.sqlite3'
  import sys
  result=subprocess.run([sys.executable,str(script),'--database',self.server.database,'--to',str(target)],capture_output=True,text=True);self.assertEqual(result.returncode,0,result.stderr)
  self.assertTrue(Path(str(target)+'.assets/private-works/'+work['id']+'.image').is_file())
  source=Path(self.server.database+'.assets/private-works/'+work['id']+'.image');source.unlink()
  failed=Path(self.tmp.name)/'failed.sqlite3';result=subprocess.run([sys.executable,str(script),'--database',self.server.database,'--to',str(failed)],capture_output=True,text=True)
  self.assertNotEqual(result.returncode,0);self.assertFalse(failed.exists());self.assertFalse(Path(str(failed)+'.assets').exists())
 def test_date_range_summary_and_invalid_images(self):
  _,token=self.account();import learning
  today=date.fromisoformat(learning.today());monday=today-timedelta(days=today.weekday());self.photo(token);self.photo(token,(monday-timedelta(days=1)).isoformat())
  summary=self.call('GET','/works/summary',token=token)[1];self.assertEqual(summary['thisWeek'],1);self.assertEqual(summary['lastWeek'],1)
  self.assertEqual(self.call('POST','/works',dict(date=(today+timedelta(days=1)).isoformat(),imageBase64=self.picture()),token=token)[0],422)
  for image in ('not base64',base64.b64encode(b'<script>not an image</script>').decode()):self.assertEqual(self.call('POST','/works',dict(date=learning.today(),imageBase64=image),token=token)[0],422)
  self.assertEqual(self.call('POST','/writing/attempts',dict(char='一',strokes=[[[0,0],[2,2]]]),token=token)[0],422)
  self.assertEqual(self.call('POST','/writing/attempts',dict(char='一',strokes=self.strokes(),lessonId='bank-math-4-upper-mul-two'),token=token)[0],422)

if __name__=='__main__':unittest.main()
