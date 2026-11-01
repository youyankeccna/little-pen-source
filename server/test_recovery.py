import concurrent.futures
import json
import sqlite3
import subprocess
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from app import AppServer, password_hash, token_hash
import test_app


class RecoveryFlow(unittest.TestCase):
    request = test_app.AccountFlow.request

    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.database=Path(self.tmp.name)/'accounts.sqlite3'
        self.server=AppServer(('127.0.0.1',0),self.database)
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()

    def tearDown(self):
        self.server.shutdown();self.server.server_close();self.tmp.cleanup()

    def register(self,name='recovery_parent'):
        status,raw,cookie=self.request('POST','/api/auth/register',dict(username=name,password='original-password'))
        self.assertEqual(status,200,raw)
        data=json.loads(raw);return data,cookie.split(';')[0]

    def reset(self,code,password='replacement-password',name='recovery_parent',**extra):
        return self.request('POST','/api/auth/reset-password',{**dict(username=name,recoveryCode=code,newPassword=password,confirmPassword=password),**extra})

    def test_recovery_single_use_and_session_revocation(self):
        data,cookie=self.register();code=data['recoveryCode']
        self.assertTrue(data['user']['recoveryEnabled'])
        with self.server.db() as db:
            row=db.execute('SELECT * FROM users').fetchone()
            self.assertEqual(row['recovery_hash'],token_hash(code.replace('-','')))
            self.assertNotIn(code,dict(row).values())
        self.request('PUT','/api/preferences',dict(cn='pep',math='pep',en='pep'),cookie)
        _,raw,second=self.request('POST','/api/auth/login',dict(username='recovery_parent',password='original-password'))
        self.assertNotIn('recoveryCode',json.loads(raw));second=second.split(';')[0]
        self.assertNotIn('recovery_hash',json.loads(self.request('GET','/api/me',cookie=cookie)[1])['user'])
        before=self.request('GET','/api/me',cookie=cookie)[1]
        wrong=self.reset('0'*32);unknown=self.reset('0'*32,name='does_not_exist')
        self.assertEqual(wrong[:2],unknown[:2]);self.assertEqual(wrong[0],400)
        self.assertEqual(self.request('GET','/api/me',cookie=cookie)[1],before)
        self.assertEqual(self.reset(code,confirmPassword='not-matching')[0],422)
        self.assertEqual(self.request('POST','/api/auth/reset-password',dict(username='recovery_parent',recoveryCode=code,newPassword='replacement-password',confirmPassword='replacement-password'),origin=False)[0],403)
        self.assertEqual(self.reset(' '+code.lower().replace('-',' ')+' ')[0],200)
        for old in [cookie,second]:self.assertIsNone(json.loads(self.request('GET','/api/me',cookie=old)[1])['user'])
        self.assertEqual(self.reset(code)[0],400)
        self.assertEqual(self.request('POST','/api/auth/login',dict(username='recovery_parent',password='original-password'))[0],401)
        status,raw,_=self.request('POST','/api/auth/login',dict(username='recovery_parent',password='replacement-password'))
        self.assertEqual(status,200);user=json.loads(raw)['user'];self.assertFalse(user['recoveryEnabled']);self.assertEqual(user['preferences']['cn'],'pep')

    def test_rotation_requires_password_and_replaces_code(self):
        data,cookie=self.register();old=data['recoveryCode']
        self.assertEqual(self.request('POST','/api/auth/recovery-code',dict(password='original-password'))[0],401)
        self.assertEqual(self.request('POST','/api/auth/recovery-code',dict(password='wrong-password'),cookie)[0],401)
        status,raw,_=self.request('POST','/api/auth/recovery-code',dict(password='original-password'),cookie)
        self.assertEqual(status,200);new=json.loads(raw)['recoveryCode'];self.assertNotEqual(old,new)
        self.assertEqual(self.reset(old)[0],400)
        self.assertEqual(self.request('PUT','/api/auth/password',dict(password='original-password',newPassword='changed-password'),cookie)[0],200)
        self.assertEqual(self.reset(new)[0],400)

    def test_concurrent_reset_only_one_succeeds(self):
        data,_=self.register();code=data['recoveryCode']
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results=list(pool.map(lambda password:self.reset(code,password)[0],['parallel-password-a','parallel-password-b']))
        self.assertEqual(sorted(results),[200,400])
        winning=['parallel-password-a','parallel-password-b'][results.index(200)]
        self.assertEqual(self.request('POST','/api/auth/login',dict(username='recovery_parent',password=winning))[0],200)

    def test_recovery_rate_limit_does_not_lock_login(self):
        self.register()
        for _ in range(10):self.assertEqual(self.reset('invalid-code')[0],400)
        self.assertEqual(self.reset('invalid-code')[0],429)
        self.assertEqual(self.request('POST','/api/auth/login',dict(username='recovery_parent',password='original-password'))[0],200)

    def test_administrator_recovery_file_is_private_and_not_overwritten(self):
        self.register();target=Path(self.tmp.name)/'recovery.txt'
        command=[sys.executable,str(Path(__file__).resolve().parents[1]/'scripts/issue_recovery_code.py'),'--database',str(self.database),'--username','recovery_parent','--to',str(target)]
        result=subprocess.run(command,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr)
        code=next(line.split('：',1)[1] for line in target.read_text().splitlines() if line.startswith('恢复码：'))
        self.assertEqual(target.stat().st_mode&0o777,0o600);self.assertNotIn(code,result.stdout)
        self.assertNotEqual(subprocess.run(command,capture_output=True).returncode,0)
        self.assertEqual(self.reset(code)[0],200)

    def test_existing_account_migrates_without_changing_password(self):
        legacy=Path(self.tmp.name)/'legacy.sqlite3';salt=bytes.fromhex('11'*16)
        with sqlite3.connect(legacy) as db:
            db.execute('CREATE TABLE users(id INTEGER PRIMARY KEY,username TEXT NOT NULL UNIQUE,salt TEXT NOT NULL,password_hash TEXT NOT NULL,preferences TEXT,created_at INTEGER NOT NULL)')
            db.execute('INSERT INTO users VALUES(1,?,?,?,?,?)',('legacy_parent',salt.hex(),password_hash('original-password',salt),None,0))
        old_server=self.server
        self.server=AppServer(('127.0.0.1',0),legacy);thread=threading.Thread(target=self.server.serve_forever,daemon=True);thread.start()
        try:
            status,raw,cookie=self.request('POST','/api/auth/login',dict(username='legacy_parent',password='original-password'))
            self.assertEqual(status,200);self.assertFalse(json.loads(raw)['user']['recoveryEnabled'])
            self.assertEqual(self.request('POST','/api/auth/recovery-code',dict(password='original-password'),cookie.split(';')[0])[0],200)
        finally:
            self.server.shutdown();self.server.server_close();self.server=old_server


if __name__=='__main__':unittest.main()
