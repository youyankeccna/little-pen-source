import json,unittest
import test_app
class ImportedFlow(unittest.TestCase):
 setUpClass=classmethod(test_app.AccountFlow.setUpClass.__func__)
 tearDownClass=classmethod(test_app.AccountFlow.tearDownClass.__func__)
 request=test_app.AccountFlow.request
 snapshot_data=test_app.AccountFlow.snapshot_data
 def test_imported_editions_and_fill_snapshot(self):
  _,_,cookie=self.request('POST','/api/auth/register',{'username':'imported_parent','password':'abcdefgh'});cookie=cookie.split(';')[0]
  edition=next(e[0] for e in self.server.catalog['editionOptions']['en'] if e[0] not in ('pep','fltrp','yilin'))
  self.assertEqual(self.request('PUT','/api/preferences',{'cn':'pep','math':'pep','en':edition},cookie)[0],200)
  _,raw,_=self.request('GET','/api/v1/catalog/books?subject=en&series='+edition);books=json.loads(raw)['data']['books'];self.assertTrue(books);self.assertTrue(all(b['series']==edition for b in books))
  lesson=next(l for l in self.server.catalog['lessons'] if l.get('series')==edition and any(p['kind']=='vocabulary' for p in l['packs']));group=next(p for p in lesson['packs'] if p['kind']=='vocabulary');items=group['items'][:3]
  body=self.snapshot_data();body.update(sourceMode='lesson',lessonId=lesson['id'],practiceKind='vocabulary',itemIds=[i['id'] for i in items],contentVersion=self.server.catalog['contentVersion'],type='word');body['config'].update(text='\n'.join(i['text'] for i in items),fillPage=True,cellType='sxg')
  status,raw,_=self.request('POST','/api/worksheet-snapshots',body,cookie);self.assertEqual(status,201,raw);snapshot=json.loads(raw)['snapshot'];self.assertTrue(snapshot['config']['fillPage']);self.assertEqual(snapshot['origin'],'user-provided-ocr')
  body['config']['fillPage']='yes';self.assertEqual(self.request('POST','/api/worksheet-snapshots',body,cookie)[0],422)
