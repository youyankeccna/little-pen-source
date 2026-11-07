"""Local website server. Run: python3 server/app.py --port 5178."""
import argparse, hashlib, hmac, http.cookies, json, os, re, secrets, sqlite3, threading, time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from worksheets import load_catalog, validate_snapshot, SnapshotError
import learning, family, family_routes, layout_preferences, render_jobs, works

ROOT=Path(__file__).resolve().parents[1]
EDITIONS={'cn':['pep'],'math':['pep','bnu','sujiao'],'en':['pep','fltrp','yilin']}
def password_hash(password,salt):
    return hashlib.scrypt(password.encode(),salt=salt,n=16384,r=8,p=1,maxmem=64*1024*1024).hex()
def token_hash(value):return hashlib.sha256(value.encode()).hexdigest()

class AppServer(ThreadingHTTPServer):
    daemon_threads=True
    def __init__(self,address,database,origin=None):
        super().__init__(address,partial(Handler,directory=str(ROOT/'web-preview')))
        self.database=str(database);self.origin=origin or f'http://{address[0]}:{self.server_port}'
        self.catalog=load_catalog();
        for subject,options in self.catalog.get('editionOptions',{}).items():
            EDITIONS[subject]=list(dict.fromkeys(EDITIONS.get(subject,[])+[row[0] for row in options]))
        self.lessons={l['id']:l for l in self.catalog['lessons']}
        self.secure=self.origin.startswith('https://');self.attempts={};self.lock=threading.Lock()
        Path(database).parent.mkdir(parents=True,exist_ok=True)
        with self.db() as db:
            db.executescript('''CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT NOT NULL UNIQUE,salt TEXT NOT NULL,password_hash TEXT NOT NULL,preferences TEXT,created_at INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS worksheet_snapshots(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL,payload TEXT NOT NULL,created_at INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS output_events(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL,snapshot_id TEXT NOT NULL,format TEXT NOT NULL,file_hash TEXT NOT NULL,created_at INTEGER NOT NULL,UNIQUE(user_id,snapshot_id,format,file_hash));''')
            db.execute('BEGIN IMMEDIATE')
            if 'preferences_version' not in [row['name'] for row in db.execute('PRAGMA table_info(users)')]:db.execute('ALTER TABLE users ADD COLUMN preferences_version INTEGER NOT NULL DEFAULT 0')
            if 'study_context' not in [row['name'] for row in db.execute('PRAGMA table_info(users)')]:db.execute('ALTER TABLE users ADD COLUMN study_context TEXT')
            if 'recovery_hash' not in [row['name'] for row in db.execute('PRAGMA table_info(users)')]:db.execute('ALTER TABLE users ADD COLUMN recovery_hash TEXT')
            learning.migrate(db)
            db.execute('CREATE TABLE IF NOT EXISTS content_feedback(id TEXT PRIMARY KEY,lesson_id TEXT NOT NULL,content_version TEXT NOT NULL,category TEXT NOT NULL,message TEXT NOT NULL,created_at INTEGER NOT NULL)')
            family.migrate(db)
            layout_preferences.migrate(db)
            works.migrate(db)
            db.execute('PRAGMA user_version=9')
        self.render_jobs=render_jobs.RenderJobs(self)
    def server_close(self):
        if hasattr(self,'render_jobs'):self.render_jobs.close()
        super().server_close()
    def db(self):
        db=sqlite3.connect(self.database);db.row_factory=sqlite3.Row;return db

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('X-Content-Type-Options','nosniff');self.send_header('Referrer-Policy','same-origin')
        if self.path.startswith('/api/'):self.send_header('Cache-Control','no-store')
        else:self.send_header('Cache-Control','no-cache')
        super().end_headers()
    def log_message(self,format,*args):
        # API bodies, passwords and cookies are never logged.
        super().log_message(format,*args)
    def response(self,status,data,cookie=None):
        if self.path.startswith('/api/v1/'):
            request_id=secrets.token_hex(8)
            data=({'error':{'code':data.get('code',{400:'invalid_input',401:'authentication_required',403:'forbidden',404:'not_found',409:'conflict',422:'invalid_input',429:'rate_limited'}.get(status,'server_error')),'message':data.get('error','请求失败。')},'requestId':request_id} if status>=400 else {'data':data,'requestId':request_id})
        raw=json.dumps(data,ensure_ascii=False).encode();self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(raw)))
        if cookie:self.send_header('Set-Cookie',cookie)
        self.end_headers();self.wfile.write(raw)
    def session(self):
        authorization=self.headers.get('Authorization')
        cookies=http.cookies.SimpleCookie()
        try:cookies.load(self.headers.get('Cookie',''))
        except http.cookies.CookieError:return None
        token=authorization[7:] if authorization and authorization.startswith('Bearer ') else (cookies.get('little_pen_session').value if cookies.get('little_pen_session') else None)
        if authorization and not authorization.startswith('Bearer '):return None
        if not token:return None
        with self.server.db() as db:
            row=db.execute('SELECT users.*,sessions.token_hash FROM users JOIN sessions ON users.id=sessions.user_id WHERE sessions.token_hash=? AND expires_at>?',(token_hash(token),int(time.time()))).fetchone()
        return row
    def public_user(self,row):
        with self.server.db() as db:return family.public_user(db,row)

    def new_session(self,user,recovery_code=None,mobile=False):
        token=secrets.token_urlsafe(32)
        with self.server.db() as db:
            old=self.session()
            if old:db.execute('DELETE FROM sessions WHERE token_hash=?',(old['token_hash'],))
            db.execute('DELETE FROM sessions WHERE expires_at<=?',(int(time.time()),))
            db.execute('INSERT INTO sessions VALUES(?,?,?)',(token_hash(token),user['id'],int(time.time())+604800))
        cookie='little_pen_session='+token+'; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800'+('; Secure' if self.server.secure else '')
        self.response(200,{**dict(user=self.public_user(user)),**({'accessToken':token,'expiresIn':604800} if mobile else {}),**({'recoveryCode':recovery_code} if recovery_code else {})},None if mobile else cookie)
    def require_user(self,preferences=False):
        user=self.session()
        if not user:self.response(401,dict(error='请先登录后继续。'));return None
        try:
            with self.server.db() as db:user=family.scoped_user(db,user,self.headers.get('X-Child-Id'))
        except ValueError as error:self.response(403,dict(error=str(error)));return None
        if preferences and not user['preferences']:self.response(409,dict(error='请先选择教材版本。',code='preferences_required'));return None
        return user
    def trusted_request(self):
        expected=urlsplit(self.server.origin).netloc
        if self.headers.get('Host')!=expected:
            self.response(403,dict(error='请求地址不匹配。'));return False
        if self.headers.get('Origin') is None and (self.api_path() in ('/api/auth/mobile/login','/api/auth/mobile/register','/api/auth/mobile/reset-password','/api/render-jobs') or self.headers.get('Authorization','').startswith('Bearer ')):
            return True
        if self.headers.get('Origin')!=self.server.origin:
            self.response(403,dict(error='不允许跨站提交。'));return False
        return True
    def body(self,limit=8192):
        try:length=int(self.headers.get('Content-Length','0'))
        except ValueError:raise ValueError('请求长度无效。')
        if not 0<=length<=limit:raise ValueError('请求内容过大。')
        return self.rfile.read(length)
    def api_path(self):
        path=urlsplit(self.path).path.replace('/api/v1/','/api/',1)
        return {'/api/me/preferences':'/api/preferences','/api/outputs':'/api/output'}.get(path,path)
    def consume_request_body(self):
        # A leftover request body makes the kernel RST the socket on close and drops a large response still in the send buffer.
        try: length=int(self.headers.get('Content-Length') or 0)
        except ValueError: return
        while length>0:
            chunk=self.rfile.read(min(length,65536))
            if not chunk: break
            length-=len(chunk)
    def do_GET(self):
        self.consume_request_body()
        path=self.api_path()
        if works.handle(self,path):return
        if render_jobs.handle(self,path):return
        if layout_preferences.handle(self,path):return
        if family_routes.get(self,path):return
        if path=='/api/me':
            row=self.session();self.response(200,dict(user=self.public_user(row) if row else None));return
        if path=='/api/auth/providers':
            self.response(200,dict(providers=[dict(id='wechat',name='微信扫码登录',enabled=False),dict(id='qq',name='QQ 扫码登录',enabled=False)]));return
        if path=='/api/catalog/books':
            filters=parse_qs(urlsplit(self.path).query);books=self.server.catalog['books']
            for name in ['grade','subject','term','series']:
                if name in filters:books=[b for b in books if str(b.get(name))==filters[name][0]]
            self.response(200,dict(books=books,contentVersion=self.server.catalog['contentVersion'],editionOptions=self.server.catalog.get('editionOptions',{})));return
        if path.startswith('/api/books/') and path.endswith('/lessons'):
            revision=path.split('/')[3];rows=sorted([l for l in self.server.catalog['lessons'] if l['revisionId']==revision],key=lambda l:l.get('teachingOrder',999))
            self.response(200,dict(lessons=rows,contentVersion=self.server.catalog['contentVersion']));return
        if path.startswith('/api/lessons/') and path.endswith('/practice'):
            lesson=self.server.lessons.get(path.split('/')[3])
            if not lesson:self.response(404,dict(error='课次不存在。'));return
            self.response(200,dict(lesson=lesson,contentVersion=self.server.catalog['contentVersion']));return
        if path in ('/api/learning','/api/worksheet-snapshots'):
            user=self.require_user()
            if not user:return
            with self.server.db() as db:
                result=learning.get_state(db,user['id'],user['child_id']) if path=='/api/learning' else dict(worksheets=learning.list_saved(db,user['id'],parse_qs(urlsplit(self.path).query).get('favorite',['0'])[0]=='1',user['child_id']))
                if path=='/api/learning':
                    result['todayPracticePlan']=next((dict(id=p['id'],mode=p['mode'],date=d['date'],title=d['title'],completed=d['completed'],family=True) for p in family.plans(db,user) for d in p['days'] if d['date']==learning.today()),None)
            self.response(200,result);return
        if path.startswith('/api/worksheet-snapshots/'):
            user=self.require_user()
            if not user:return
            with self.server.db() as db:row=db.execute('SELECT payload FROM worksheet_snapshots WHERE id=? AND user_id=? AND child_id=?',(path.split('/')[-1],user['id'],user['child_id'])).fetchone()
            if not row:self.response(404,dict(error='快照不存在。'));return
            self.response(200,dict(snapshot=json.loads(row['payload'])));return
        if path.startswith('/api/'):
            self.response(404,dict(error='接口不存在。'));return
        super().do_GET()
    def do_POST(self):self.mutate()
    def do_PUT(self):self.mutate()
    def do_DELETE(self):self.mutate()
    def mutate(self):
        if not self.trusted_request():return
        path=self.api_path()
        try:
            if works.handle(self,path):return
            if render_jobs.handle(self,path):return
            if layout_preferences.handle(self,path):return
            if family_routes.mutate(self,path,EDITIONS):return
            if path=='/api/content-feedback' and self.command=='POST':
                data=json.loads(self.body())
                if not isinstance(data,dict) or set(data)!=set(['lessonId','category','message']):raise ValueError('Invalid feedback')
                if not isinstance(data['lessonId'],str) or data['lessonId'] not in self.server.lessons:raise ValueError('Invalid lesson')
                if data['category'] not in ('text','reading','mapping','other') or not isinstance(data['message'],str) or not 3<=len(data['message'].strip())<=1000:raise ValueError('Invalid feedback')
                now=time.time();key='feedback:'+self.client_address[0]
                with self.server.lock:
                    history=[t for t in self.server.attempts.get(key,[]) if t>now-300]
                    if len(history)>=10:self.response(429,dict(error='提交过于频繁，请五分钟后重试。'));return
                    history.append(now);self.server.attempts[key]=history
                identifier=secrets.token_hex(8)
                with self.server.db() as db:db.execute('INSERT INTO content_feedback VALUES(?,?,?,?,?,?)',(identifier,data['lessonId'],self.server.catalog['contentVersion'],data['category'],data['message'].strip(),int(now)))
                self.response(201,dict(id=identifier));return
            if path in ('/api/auth/register','/api/auth/login','/api/auth/mobile/login','/api/auth/mobile/register') and self.command=='POST':
                now=time.time();ip=self.client_address[0]
                with self.server.lock:
                    history=[t for t in self.server.attempts.get(ip,[]) if t>now-300]
                    if len(history)>=20:self.response(429,dict(error='尝试过于频繁，请五分钟后重试。'));return
                    history.append(now);self.server.attempts[ip]=history
                data=json.loads(self.body());username=str(data.get('username','')).strip().casefold();password=data.get('password','')
                if not re.fullmatch(r'[\w\-\u4e00-\u9fff]{3,32}',username) or not isinstance(password,str) or not 8<=len(password)<=128:
                    self.response(400,dict(error='账号需3–32位字母、数字、中文或下划线；密码需8–128位。'));return
                recovery_code=None
                with self.server.db() as db:
                    user=db.execute('SELECT * FROM users WHERE username=?',(username,)).fetchone()
                    if path.endswith('register'):
                        if user:self.response(409,dict(error='这个账号已注册。'));return
                        salt=secrets.token_bytes(16);raw=secrets.token_hex(16).upper();recovery_code='-'.join(raw[i:i+4] for i in range(0,32,4))
                        try:db.execute('INSERT INTO users(username,salt,password_hash,created_at,recovery_hash) VALUES(?,?,?,?,?)',(username,salt.hex(),password_hash(password,salt),int(now),token_hash(raw)))
                        except sqlite3.IntegrityError:self.response(409,dict(error='这个账号已注册。'));return
                        db.commit();user=db.execute('SELECT * FROM users WHERE username=?',(username,)).fetchone()
                    elif not user or not hmac.compare_digest(user['password_hash'],password_hash(password,bytes.fromhex(user['salt']))):
                        self.response(401,dict(error='账号或密码不正确。'));return
                self.new_session(user,recovery_code,mobile=path.startswith('/api/auth/mobile/'));return
            if path in ('/api/auth/recovery-code','/api/auth/reset-password','/api/auth/mobile/reset-password') and self.command=='POST':
                data=json.loads(self.body());username=str(data.get('username','')).strip().casefold();now=time.time()
                keys=['recovery-ip:'+self.client_address[0]]
                if path.endswith('reset-password'):keys.append('recovery-user:'+username)
                with self.server.lock:
                    histories=[[t for t in self.server.attempts.get(key,[]) if t>now-600] for key in keys]
                    if any(len(h)>=10 for h in histories):self.response(429,dict(error='尝试过于频繁，请十分钟后重试。'));return
                    for key,history in zip(keys,histories):self.server.attempts[key]=history+[now]
                if path.endswith('recovery-code'):
                    user=self.require_user()
                    if not user:return
                    password=data.get('password','')
                    with self.server.db() as db:
                        db.execute('BEGIN IMMEDIATE');current=db.execute('SELECT * FROM users WHERE id=?',(user['id'],)).fetchone()
                        if not current or not isinstance(password,str) or not 8<=len(password)<=128 or not hmac.compare_digest(current['password_hash'],password_hash(password,bytes.fromhex(current['salt']))):
                            self.response(401,dict(error='当前密码不正确。'));return
                        raw=secrets.token_hex(16).upper();code='-'.join(raw[i:i+4] for i in range(0,32,4));db.execute('UPDATE users SET recovery_hash=? WHERE id=?',(token_hash(raw),user['id']))
                    self.response(200,dict(recoveryCode=code));return
                password=data.get('newPassword','');confirmation=data.get('confirmPassword','');code=data.get('recoveryCode','')
                if not isinstance(password,str) or not 8<=len(password)<=128 or password!=confirmation:
                    self.response(422,dict(error='新密码需8–128位，两次输入必须一致。'));return
                code=re.sub(r'[-\s]','',code).upper() if isinstance(code,str) else ''
                salt=secrets.token_bytes(16);hashed=password_hash(password,salt)
                with self.server.db() as db:
                    db.execute('BEGIN IMMEDIATE');current=db.execute('SELECT * FROM users WHERE username=?',(username,)).fetchone()
                    valid=re.fullmatch(r'[0-9A-F]{32}',code) and hmac.compare_digest(current['recovery_hash'] if current and current['recovery_hash'] else '0'*64,token_hash(code))
                    if not valid:self.response(400,dict(error='账号或恢复码不正确，或恢复码已失效。'));return
                    db.execute('UPDATE users SET salt=?,password_hash=?,recovery_hash=NULL WHERE id=?',(salt.hex(),hashed,current['id']))
                    db.execute('DELETE FROM sessions WHERE user_id=?',(current['id'],))
                self.response(200,dict(ok=True),'little_pen_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');return
            if path=='/api/auth/logout' and self.command=='POST':
                user=self.session()
                if user:
                    with self.server.db() as db:db.execute('DELETE FROM sessions WHERE token_hash=?',(user['token_hash'],))
                self.response(200,dict(ok=True),'little_pen_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');return
            if path=='/api/preferences' and self.command=='PUT':
                user=self.require_user()
                if not user:return
                payload=json.loads(self.body());data=payload.get('preferences',payload) if isinstance(payload,dict) else payload
                version=payload.get('version',user['preferences_version']) if isinstance(payload,dict) else None
                if type(version) is not int or version!=user['preferences_version']:self.response(409,dict(error='教材偏好已在其他窗口更新，请刷新后重试。',code='preference_version_conflict'));return
                if not isinstance(data,dict) or set(data)!=set(EDITIONS) or any(data[k] not in EDITIONS[k] for k in EDITIONS):
                    self.response(400,dict(error='教材版本选择无效。'));return
                context=payload.get('studyContext',json.loads(user['study_context']) if user['study_context'] else None)
                if context is not None and (not isinstance(context,dict) or set(context)!=set(['grade','subject','term']) or type(context.get('grade')) is not int or not 0<=context['grade']<=6 or context.get('subject') not in EDITIONS or context.get('term') not in ('upper','lower')):
                    self.response(400,dict(error='年级、科目或册次无效。'));return
                with self.server.db() as db:
                    result=db.execute('UPDATE children SET preferences=?,study_context=?,version=version+1 WHERE user_id=? AND id=? AND version=?',(json.dumps(data),json.dumps(context) if context is not None else None,user['id'],user['child_id'],version))
                    if result.rowcount!=1:self.response(409,dict(error='教材偏好发生冲突，请刷新后重试。',code='preference_version_conflict'));return
                    row=db.execute('SELECT * FROM users WHERE id=?',(user['id'],)).fetchone()
                self.response(200,dict(user=self.public_user(row)));return
            if path in ('/api/learning/cursor','/api/learning/weak-items','/api/learning/review','/api/learning/daily','/api/learning/daily/completion') and self.command=='PUT':
                user=self.require_user()
                if not user:return
                try:
                    with self.server.db() as db:
                        data=json.loads(self.body(64*1024))
                        if not isinstance(data,dict):raise ValueError('请求格式无效。')
                        if path.endswith('/cursor'):result=dict(cursor=learning.set_cursor(db,user['id'],data,self.server.lessons,child_id=user['child_id']))
                        elif path.endswith('/weak-items'):result=dict(weakItems=learning.update_weak(db,user['id'],data,self.server.lessons,child_id=user['child_id']))
                        elif path.endswith('/review'):result=dict(weakItems=learning.review_character(db,user['id'],data,child_id=user['child_id']))
                        elif path.endswith('/completion'):result=dict(dailyPlan=learning.complete_daily(db,user['id'],data,child_id=user['child_id']))
                        else:result=dict(dailyPlan=learning.set_daily(db,user['id'],data,self.server.lessons,child_id=user['child_id']))
                        if path.endswith('/review') and data.get('action') in ('reviewed','again'):
                            db.execute('INSERT INTO review_events VALUES(?,?,?,?,?) ON CONFLICT(user_id,child_id,date,char) DO UPDATE SET action=excluded.action',(user['id'],user['child_id'],learning.today(),data['char'],data['action']))
                except ValueError as error:self.response(422,dict(error=str(error)));return
                self.response(200,result);return
            if path.startswith('/api/worksheet-snapshots/') and path.endswith('/favorite') and self.command=='PUT':
                user=self.require_user()
                if not user:return
                data=json.loads(self.body())
                try:
                    with self.server.db() as db:found=learning.favorite(db,user['id'],path.split('/')[-2],data.get('favorite'),user['child_id'])
                except ValueError as error:self.response(422,dict(error=str(error)));return
                if not found:self.response(404,dict(error='字帖不存在。'));return
                self.response(200,dict(ok=True));return
            if path=='/api/worksheet-snapshots' and self.command=='POST':
                user=self.require_user(preferences=True)
                if not user:return
                with self.server.db() as db:bank=learning.weak_items(db,user['id'],user['child_id'])
                try:payload=validate_snapshot(json.loads(self.body(256*1024)),self.server.catalog,bank)
                except SnapshotError as error:self.response(422,dict(error=str(error),code='invalid_snapshot'));return
                identifier=secrets.token_urlsafe(24);payload['id']=identifier
                with self.server.db() as db:db.execute('INSERT INTO worksheet_snapshots(id,user_id,payload,created_at,child_id) VALUES(?,?,?,?,?)',(identifier,user['id'],json.dumps(payload,ensure_ascii=False),int(time.time()),user['child_id']))
                self.response(201,dict(snapshot=payload));return
            if (path=='/api/auth/password' and self.command=='PUT') or (path=='/api/me' and self.command=='DELETE'):
                user=self.require_user()
                if not user:return
                data=json.loads(self.body());old=data.get('password','')
                if not isinstance(old,str) or not 8<=len(old)<=128 or not hmac.compare_digest(user['password_hash'],password_hash(old,bytes.fromhex(user['salt']))):
                    self.response(401,dict(error='当前密码不正确。'));return
                with self.server.db() as db:
                    if self.command=='DELETE':
                        if data.get('confirmation')!='注销账号':self.response(422,dict(error='请输入“注销账号”确认。'));return
                        for table in ['sessions','worksheet_snapshots','output_events','learning_cursor','weak_characters','worksheet_favorites','daily_practice','children','practice_plans','review_events','lesson_shares','layout_preferences']:db.execute('DELETE FROM '+table+' WHERE user_id=?',(user['id'],))
                        db.execute('DELETE FROM users WHERE id=?',(user['id'],))
                        self.server.render_jobs.revoke(user['id'])
                        works.remove_user(db,self,user['id'])
                    else:
                        password=data.get('newPassword','')
                        if not isinstance(password,str) or not 8<=len(password)<=128:self.response(422,dict(error='新密码需8–128位。'));return
                        salt=secrets.token_bytes(16);db.execute('UPDATE users SET salt=?,password_hash=?,recovery_hash=NULL WHERE id=?',(salt.hex(),password_hash(password,salt),user['id']))
                        db.execute('DELETE FROM sessions WHERE user_id=?',(user['id'],))
                self.response(200,dict(ok=True),'little_pen_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');return
            if path=='/api/output' and self.command=='POST':
                user=self.require_user(preferences=True)
                if not user:return
                snapshot_id=self.headers.get('X-Worksheet-Snapshot','')
                with self.server.db() as db:snapshot=db.execute('SELECT id FROM worksheet_snapshots WHERE id=? AND user_id=? AND child_id=?',(snapshot_id,user['id'],user['child_id'])).fetchone()
                if not snapshot:self.response(403,dict(error='请重新生成当前账号的字帖快照。',code='snapshot_required'));return
                mime=self.headers.get('Content-Type','');raw=self.body(25*1024*1024)
                if not ((mime=='application/pdf' and raw.startswith(b'%PDF-')) or (mime=='image/png' and raw.startswith(b'\x89PNG\r\n\x1a\n'))):
                    self.response(400,dict(error='仅支持字帖 PDF 或 PNG。'));return
                with self.server.db() as db:db.execute('INSERT OR IGNORE INTO output_events(user_id,snapshot_id,format,file_hash,created_at) VALUES(?,?,?,?,?)',(user['id'],snapshot_id,mime,hashlib.sha256(raw).hexdigest(),int(time.time())))
                self.send_response(200);self.send_header('Content-Type',mime);self.send_header('Content-Disposition','attachment; filename="worksheet.'+('pdf' if mime=='application/pdf' else 'png')+'"');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw);return
            self.response(404,dict(error='接口不存在。'))
        except (ValueError,TypeError,KeyError,AttributeError):self.response(400,dict(error='请求格式不正确。'))
        except (BrokenPipeError,ConnectionResetError):pass

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=5178);parser.add_argument('--host',default='127.0.0.1');parser.add_argument('--database',default=str(ROOT/'output/accounts.sqlite3'));args=parser.parse_args()
    server=AppServer((args.host,args.port),args.database,os.environ.get('PUBLIC_ORIGIN'))
    print('小小笔尖 website: '+server.origin,flush=True);server.serve_forever()
