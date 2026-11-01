"""Account-private lesson cursor, saved worksheets and parent-selected review characters."""
import json,re,time

def migrate(db):
    # Rebuild only the account-keyed learning tables, preserving every legacy row.
    tables={
        'daily_practice': ('user_id INTEGER NOT NULL,child_id TEXT NOT NULL DEFAULT \'default\',date TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(user_id,child_id,date)', 'user_id,date,payload'),
        'learning_cursor': ('user_id INTEGER NOT NULL,child_id TEXT NOT NULL DEFAULT \'default\',payload TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(user_id,child_id)', 'user_id,payload,updated_at'),
        'weak_characters': ('user_id INTEGER NOT NULL,child_id TEXT NOT NULL DEFAULT \'default\',char TEXT NOT NULL,payload TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(user_id,child_id,char)', 'user_id,char,payload,created_at')}
    for name,(schema,columns) in tables.items():
        existing=[r['name'] for r in db.execute('PRAGMA table_info('+name+')')]
        if existing and 'child_id' not in existing:
            db.execute('ALTER TABLE '+name+' RENAME TO '+name+'_legacy')
            db.execute('CREATE TABLE '+name+'('+schema+')')
            db.execute('INSERT INTO '+name+'('+columns+') SELECT '+columns+' FROM '+name+'_legacy')
            db.execute('DROP TABLE '+name+'_legacy')
        else:db.execute('CREATE TABLE IF NOT EXISTS '+name+'('+schema+')')
    db.execute('CREATE TABLE IF NOT EXISTS worksheet_favorites(user_id INTEGER NOT NULL,snapshot_id TEXT NOT NULL,PRIMARY KEY(user_id,snapshot_id))')

def weak_items(db,user_id,child_id='default'):
    return [json.loads(r['payload']) for r in db.execute('SELECT payload FROM weak_characters WHERE user_id=? AND child_id=? ORDER BY created_at,char',(user_id,child_id))]

def get_state(db,user_id,child_id='default'):
    cursor=db.execute('SELECT payload FROM learning_cursor WHERE user_id=? AND child_id=?',(user_id,child_id)).fetchone()
    return dict(cursor=json.loads(cursor['payload']) if cursor else None,weakItems=weak_items(db,user_id,child_id),today=today(),dailyPlan=daily_plan(db,user_id,child_id=child_id))

def set_cursor(db,user_id,data,lessons,child_id='default'):
    lesson=lessons.get(data.get('lessonId'))
    if not lesson:raise ValueError('课次不存在。')
    group=next((g for g in lesson['packs'] if g['kind']==data.get('kind')),None);ids=data.get('itemIds')
    if not group or not isinstance(ids,list) or any(not isinstance(i,str) or i not in [x['id'] for x in group['items']] for i in ids):raise ValueError('课次选项无效。')
    payload=dict(lessonId=lesson['id'],kind=group['kind'],itemIds=list(dict.fromkeys(ids)),grade=lesson['grade'],subject=lesson['subject'],term=lesson['term'],updatedAt=int(time.time()))
    db.execute('INSERT INTO learning_cursor(user_id,child_id,payload,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id,child_id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at',(user_id,child_id,json.dumps(payload),int(time.time())))
    return payload

def update_weak(db,user_id,data,lessons,child_id='default'):
    operation=data.get('operation');items=data.get('items')
    if operation not in ('add','remove') or not isinstance(items,list) or not 1<=len(items)<=200:raise ValueError('每次可处理1–200个字。')
    prepared=[]
    for item in items:
        if not isinstance(item,dict) or not isinstance(item.get('char'),str) or not re.fullmatch(r'[\u4e00-\u9fff]',item['char']):raise ValueError('请选择单个汉字。')
        if operation=='remove':prepared.append({'char':item['char']});continue
        lesson=lessons.get(item.get('lessonId'))
        if not lesson or lesson['subject']!='cn' or not any(item['char'] in i['text'] for g in lesson['packs'] if g['kind'] in ('characters','words') for i in g['items']):raise ValueError('汉字不属于所选课次的字词。')
        prepared.append(dict(char=item['char'],lessonId=lesson['id'],title=lesson['title'],grade=lesson['grade'],term=lesson['term'],addedAt=int(time.time())))
    if not db.in_transaction:db.execute('BEGIN IMMEDIATE')
    existing={r['char'] for r in db.execute('SELECT char FROM weak_characters WHERE user_id=? AND child_id=?',(user_id,child_id))}
    if operation=='add' and len(existing|{p['char'] for p in prepared})>200:raise ValueError('最多保存200个薄弱字，请先整理已有字。')
    for p in prepared:
        if operation=='remove':db.execute('DELETE FROM weak_characters WHERE user_id=? AND child_id=? AND char=?',(user_id,child_id,p['char']))
        else:db.execute('INSERT INTO weak_characters(user_id,child_id,char,payload,created_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,child_id,char) DO NOTHING',(user_id,child_id,p['char'],json.dumps(p,ensure_ascii=False),int(time.time())))
    return weak_items(db,user_id,child_id)

def list_saved(db,user_id,favorites=False,child_id='default'):
    query='''SELECT s.*,f.snapshot_id AS favorite FROM worksheet_snapshots s LEFT JOIN worksheet_favorites f ON f.snapshot_id=s.id AND f.user_id=s.user_id WHERE s.user_id=? AND s.child_id=?'''
    if favorites:query+=' AND f.snapshot_id IS NOT NULL'
    query+=' ORDER BY s.created_at DESC,s.rowid DESC LIMIT 50'
    rows=[]
    for row in db.execute(query,(user_id,child_id)):
        p=json.loads(row['payload']);rows.append(dict(id=row['id'],title=p.get('title','自主练字'),type=p['type'],pages=p['pages'],practiceMode=p['config'].get('practiceMode','trace'),englishMode=p['config'].get('englishMode','copy'),fadeTrace=p['config'].get('fadeTrace',False),favorite=row['favorite'] is not None,createdAt=row['created_at'],contentVersion=p['contentVersion'],fontPortable=p.get('fontPortable',True)))
    return rows

def favorite(db,user_id,snapshot_id,enabled,child_id='default'):
    if type(enabled) is not bool:raise ValueError('收藏状态无效。')
    if not db.execute('SELECT 1 FROM worksheet_snapshots WHERE id=? AND user_id=? AND child_id=?',(snapshot_id,user_id,child_id)).fetchone():return False
    if enabled:db.execute('INSERT OR IGNORE INTO worksheet_favorites VALUES(?,?)',(user_id,snapshot_id))
    else:db.execute('DELETE FROM worksheet_favorites WHERE user_id=? AND snapshot_id=?',(user_id,snapshot_id))
    return True

# Calendar days use China Standard Time for both browser and server.
def today(now=None):
    from datetime import datetime,timezone,timedelta
    return datetime.fromtimestamp(time.time() if now is None else now,timezone(timedelta(hours=8))).date().isoformat()

def review_character(db,user_id,data,now=None,child_id='default'):
    now=int(time.time() if now is None else now);char=data.get('char');action=data.get('action')
    if not isinstance(char,str) or action not in ('reviewed','again','mastered','restore'):raise ValueError('复习标记无效。')
    if not db.in_transaction:db.execute('BEGIN IMMEDIATE')
    row=db.execute('SELECT payload FROM weak_characters WHERE user_id=? AND child_id=? AND char=?',(user_id,child_id,char)).fetchone()
    if not row:raise ValueError('该字不在当前账号的薄弱字中。')
    item=json.loads(row['payload']);stage=item.get('reviewStage',0)
    if action=='reviewed':
        if item.get('reviewStatus')=='mastered':raise ValueError('请先恢复这个字的复习。')
        # Repeated clicks during the same day do not advance multiple stages.
        if item.get('lastReviewAt') is not None and today(item['lastReviewAt'])==today(now):return weak_items(db,user_id,child_id)
        stage=min(stage+1,4);days=[1,3,7,14,14][stage]
    else:stage=0;days=1
    item.update(reviewStage=stage,reviewStatus='mastered' if action=='mastered' else 'active',nextReviewAt=None if action=='mastered' else now+days*86400)
    if action in ('reviewed','again'):item['lastReviewAt']=now
    db.execute('UPDATE weak_characters SET payload=? WHERE user_id=? AND child_id=? AND char=?',(json.dumps(item,ensure_ascii=False),user_id,child_id,char))
    return weak_items(db,user_id,child_id)

def daily_plan(db,user_id,date=None,child_id='default'):
    row=db.execute('SELECT payload FROM daily_practice WHERE user_id=? AND child_id=? AND date=?',(user_id,child_id,date or today())).fetchone()
    return json.loads(row['payload']) if row else None

def set_daily(db,user_id,data,lessons,child_id='default'):
    import secrets
    lesson=lessons.get(data.get('lessonId'));kind=data.get('kind');ids=data.get('itemIds');amount=data.get('amount')
    if not lesson or lesson['subject']!='cn' or lesson['grade'] not in (1,2) or kind not in ('characters','words'):raise ValueError('每日一页请选一、二年级语文的字或词语。')
    limits={'characters':[4,6,8],'words':[2,3,4]}
    group=next((g for g in lesson['packs'] if g['kind']==kind),None)
    if type(amount) is not int or amount not in limits[kind] or not group or not isinstance(ids,list) or not ids or any(not isinstance(i,str) for i in ids) or len(ids)!=len(set(ids)) or len(ids)>amount:raise ValueError('每日练习量或选项无效。')
    items=[i for i in group['items'] if i['id'] in ids]
    if len(items)!=len(ids) or (kind=='words' and any(len(i['text'])>8 for i in items)):raise ValueError('每日练习内容不属于本课或词语过长。')
    plan=dict(id=secrets.token_urlsafe(18),date=today(),lessonId=lesson['id'],kind=kind,itemIds=[i['id'] for i in items],amount=amount,completed=False,text=('' if kind=='characters' else '\n').join(i['text'] for i in items),title=lesson['title'],createdAt=int(time.time()))
    db.execute('INSERT INTO daily_practice(user_id,child_id,date,payload) VALUES(?,?,?,?) ON CONFLICT(user_id,child_id,date) DO UPDATE SET payload=excluded.payload',(user_id,child_id,plan['date'],json.dumps(plan,ensure_ascii=False)))
    return plan

def complete_daily(db,user_id,data,child_id='default'):
    if type(data.get('completed')) is not bool:raise ValueError('完成状态无效。')
    if not db.in_transaction:db.execute('BEGIN IMMEDIATE')
    plan=daily_plan(db,user_id,child_id=child_id)
    if not plan or data.get('date')!=plan['date'] or data.get('id')!=plan['id']:raise ValueError('今日练习已变化，请刷新后再确认。')
    plan.update(completed=data['completed'],completedAt=int(time.time()) if data['completed'] else None)
    db.execute('UPDATE daily_practice SET payload=? WHERE user_id=? AND child_id=? AND date=?',(json.dumps(plan,ensure_ascii=False),user_id,child_id,plan['date']))
    return plan
