"""HTTP handlers for profiles, plans, growth and share links."""
import hashlib,json,time
import family,learning

def get(h,path):
    if path.startswith('/api/shares/'):
        with h.server.db() as db:row=db.execute('SELECT payload,expires_at FROM lesson_shares WHERE id=? AND revoked=0 AND expires_at>?',(path.split('/')[-1],int(time.time()))).fetchone()
        if not row:h.response(404,dict(error='分享已失效或被停用。'));return True
        share=json.loads(row['payload'])
        if share['contentVersion']!=h.server.catalog['contentVersion']:h.response(409,dict(error='教材内容已更新，请让分享者重新生成链接。'));return True
        h.response(200,dict(share=share,expiresAt=row['expires_at']));return True
    if not path.startswith('/api/family/'):return False
    user=h.require_user()
    if not user:return True
    try:
        with h.server.db() as db:
            if path=='/api/family/plans':result=dict(plans=family.plans(db,user))
            elif path.startswith('/api/family/plans/'):result=dict(plan=family.get_plan(db,user,path.split('/')[-1]))
            elif path=='/api/family/growth':result=family.growth(db,user)
            elif path=='/api/family/shares':result=dict(shares=[dict(id=r['id'],title=json.loads(r['payload'])['title'],expiresAt=r['expires_at'],revoked=bool(r['revoked'])) for r in db.execute('SELECT * FROM lesson_shares WHERE user_id=? AND child_id=? ORDER BY created_at DESC LIMIT 100',(user['id'],user['child_id']))])
            else:h.response(404,dict(error='接口不存在。'));return True
        h.response(200,result)
    except ValueError as error:h.response(404,dict(error=str(error)))
    return True

def mutate(h,path,editions):
    if not path.startswith('/api/family/'):return False
    user=h.require_user(preferences=path.endswith('/output'))
    if not user:return True
    try:
        if path.startswith('/api/family/plans/') and path.endswith('/output') and h.command=='POST':
            identifier=path.split('/')[-2]
            with h.server.db() as db:family.get_plan(db,user,identifier)
            raw=h.body(25*1024*1024)
            if h.headers.get('Content-Type')!='application/pdf' or not raw.startswith(b'%PDF-'):raise ValueError('仅支持PDF练习包。')
            with h.server.db() as db:db.execute('INSERT OR IGNORE INTO output_events(user_id,snapshot_id,format,file_hash,created_at) VALUES(?,?,?,?,?)',(user['id'],'plan:'+identifier,'application/pdf',hashlib.sha256(raw).hexdigest(),int(time.time())))
            h.send_response(200);h.send_header('Content-Type','application/pdf');h.send_header('Content-Length',str(len(raw)));h.end_headers();h.wfile.write(raw);return True
        data=json.loads(h.body(256*1024))
        if not isinstance(data,dict):raise ValueError('请求格式无效。')
        status=200
        with h.server.db() as db:
            if path=='/api/family/children' and h.command in ('POST','PUT'):
                family.change_child(db,user,data,editions,h.command=='POST')
                result=dict(user=family.public_user(db,db.execute('SELECT * FROM users WHERE id=?',(user['id'],)).fetchone()));status=201 if h.command=='POST' else 200
            elif path=='/api/family/active-child' and h.command=='PUT':
                if not db.execute('SELECT 1 FROM children WHERE user_id=? AND id=?',(user['id'],data.get('id'))).fetchone():raise ValueError('孩子档案不存在。')
                db.execute('UPDATE users SET active_child_id=? WHERE id=?',(data['id'],user['id']))
                result=dict(user=family.public_user(db,db.execute('SELECT * FROM users WHERE id=?',(user['id'],)).fetchone()))
            elif path=='/api/family/plans' and h.command=='POST':
                result=dict(plan=family.create_plan(db,user,data,h.server.lessons,h.server.catalog['contentVersion']));status=201
            elif path.startswith('/api/family/plans/') and path.endswith('/completion') and h.command=='PUT':
                result=dict(plan=family.complete_plan(db,user,path.split('/')[-2],data))
            elif path=='/api/family/shares' and h.command=='POST':
                result=family.create_share(db,user,data,h.server.catalog);status=201
            elif path.startswith('/api/family/shares/') and h.command=='DELETE':
                db.execute('UPDATE lesson_shares SET revoked=1 WHERE id=? AND user_id=? AND child_id=?',(path.split('/')[-1],user['id'],user['child_id']));result=dict(ok=True)
            else:h.response(404,dict(error='接口不存在。'));return True
        h.response(status,result)
    except ValueError as error:h.response(422,dict(error=str(error)))
    return True
