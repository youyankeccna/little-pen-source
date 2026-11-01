import http.client,json,tempfile,threading,unittest
from pathlib import Path
from app import AppServer

class FeedbackFlow(unittest.TestCase):
 def test_guest_feedback_persistence_validation_and_private_storage(self):
  with tempfile.TemporaryDirectory() as tmp:
   server=AppServer(('127.0.0.1',0),Path(tmp)/'feedback.sqlite3')
   threading.Thread(target=server.serve_forever,daemon=True).start()
   def request(payload,origin=True,method='POST'):
    c=http.client.HTTPConnection('127.0.0.1',server.server_port)
    headers={'Content-Type':'application/json'}
    if origin:headers['Origin']=server.origin
    c.request(method,'/api/v1/content-feedback',json.dumps(payload),headers)
    r=c.getresponse();data=json.loads(r.read());c.close();return r.status,data
   try:
    payload=dict(lessonId='cn-1u-tiandiren',category='text',message='  测试内容纠错，不涉及用户资料  ')
    self.assertEqual(request(payload,False)[0],403)
    for bad in [[],dict(payload,lessonId='missing'),dict(payload,category='invalid'),dict(payload,message=''),dict(payload,message='字'*1001)]:self.assertEqual(request(bad)[0],400)
    status,result=request(payload);self.assertEqual(status,201);identifier=result['data']['id']
    with server.db() as db:
     row=db.execute('SELECT * FROM content_feedback WHERE id=?',(identifier,)).fetchone()
     self.assertEqual(row['message'],payload['message'].strip());self.assertEqual(row['content_version'],server.catalog['contentVersion'])
    self.assertEqual(request({},method='GET')[0],404)
    for _ in range(9):self.assertEqual(request(payload)[0],201)
    self.assertEqual(request(payload)[0],429)
   finally:server.shutdown();server.server_close()
