"""Issue a recovery code after an administrator has verified the account owner."""
import argparse
import hashlib
import os
from pathlib import Path
import secrets
import sqlite3

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--database',required=True)
parser.add_argument('--username',required=True)
parser.add_argument('--to',required=True,help='New private text file outside web-preview')
args=parser.parse_args()
database=Path(args.database).resolve();target=Path(args.to).resolve()
static=Path(__file__).resolve().parents[1]/'web-preview'
if not database.is_file():parser.error('Database does not exist')
if target==static or static in target.parents:parser.error('Recovery files must be outside the public website directory')
if target.exists():parser.error('Refusing to overwrite an existing file')
username=args.username.strip().casefold();raw=secrets.token_hex(16).upper();code='-'.join(raw[i:i+4] for i in range(0,32,4));created=False
try:
    with sqlite3.connect(database) as db:
        db.execute('BEGIN IMMEDIATE')
        row=db.execute('SELECT id FROM users WHERE username=?',(username,)).fetchone()
        if not row:raise ValueError('Account not found')
        db.execute('UPDATE users SET recovery_hash=? WHERE id=?',(hashlib.sha256(raw.encode()).hexdigest(),row[0]))
        with os.fdopen(os.open(target,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600),'w') as output:
            created=True;output.write('小小笔尖账号恢复码\n账号：'+username+'\n恢复码：'+code+'\n此码仅可使用一次，请勿分享。\n')
        db.execute('DELETE FROM sessions WHERE user_id=?',(row[0],))
except (OSError,sqlite3.Error,ValueError) as error:
    if created:target.unlink()
    raise SystemExit(str(error))
print('Recovery file created:',target)
