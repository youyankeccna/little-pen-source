"""Child profiles, immutable practice plans and opt-in public lesson links."""
import json, secrets, time
from datetime import date, timedelta
import learning
from worksheets import validate_snapshot

THEMES=('leaf','star','rocket')
KINDS={'characters':'hanzi','words':'cizu','vocabulary':'word','digits':'number','letters':'alphabet','patterns':'pen-control','calculations':'paragraph'}

def migrate(db):
    if 'active_child_id' not in [r['name'] for r in db.execute('PRAGMA table_info(users)')]:
        db.execute("ALTER TABLE users ADD COLUMN active_child_id TEXT NOT NULL DEFAULT 'default'")
    if 'child_id' not in [r['name'] for r in db.execute('PRAGMA table_info(worksheet_snapshots)')]:
        db.execute("ALTER TABLE worksheet_snapshots ADD COLUMN child_id TEXT NOT NULL DEFAULT 'default'")
    for statement in '''CREATE TABLE IF NOT EXISTS children(user_id INTEGER NOT NULL,id TEXT NOT NULL,name TEXT NOT NULL,preferences TEXT,study_context TEXT,version INTEGER NOT NULL DEFAULT 0,theme TEXT NOT NULL DEFAULT 'leaf',created_at INTEGER NOT NULL,PRIMARY KEY(user_id,id));
    CREATE TABLE IF NOT EXISTS practice_plans(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL,child_id TEXT NOT NULL,payload TEXT NOT NULL,created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS review_events(user_id INTEGER NOT NULL,child_id TEXT NOT NULL,date TEXT NOT NULL,char TEXT NOT NULL,action TEXT NOT NULL,PRIMARY KEY(user_id,child_id,date,char));
    CREATE TABLE IF NOT EXISTS lesson_shares(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL,child_id TEXT NOT NULL,payload TEXT NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0);'''.split(';'):
        if statement.strip():db.execute(statement)
    for user in db.execute('SELECT * FROM users').fetchall():ensure_default(db,user)

def ensure_default(db,user):
    db.execute("INSERT OR IGNORE INTO children(user_id,id,name,preferences,study_context,version,created_at) VALUES(?,'default','我的孩子',?,?,?,?)",(user['id'],user['preferences'],user['study_context'],user['preferences_version'],int(time.time())))

def public_child(row):
    return dict(id=row['id'],name=row['name'],preferences=json.loads(row['preferences']) if row['preferences'] else None,studyContext=json.loads(row['study_context']) if row['study_context'] else None,preferenceVersion=row['version'],theme=row['theme'])

def public_user(db,user):
    ensure_default(db,user)
    rows=db.execute('SELECT * FROM children WHERE user_id=? ORDER BY created_at,id',(user['id'],)).fetchall()
    children=[public_child(r) for r in rows];active=next((c for c in children if c['id']==user['active_child_id']),children[0])
    return dict(id=user['id'],username=user['username'],recoveryEnabled=bool(user['recovery_hash']),children=children,activeChildId=active['id'],childName=active['name'],theme=active['theme'],preferences=active['preferences'],studyContext=active['studyContext'],preferenceVersion=active['preferenceVersion'])

def scoped_user(db,user,child_id=None):
    ensure_default(db,user);identifier=child_id or user['active_child_id']
    child=db.execute('SELECT * FROM children WHERE user_id=? AND id=?',(user['id'],identifier)).fetchone()
    if not child:raise ValueError('孩子档案不存在，请刷新后重新选择。')
    return {**dict(user),'child_id':child['id'],'preferences':child['preferences'],'study_context':child['study_context'],'preferences_version':child['version']}

def change_child(db,user,data,editions,create=False):
    name=data.get('name');context=data.get('studyContext');prefs=data.get('preferences');theme=data.get('theme','leaf')
    if not isinstance(name,str) or not 1<=len(name.strip())<=20:raise ValueError('昵称需1–20字，可使用小名。')
    if not isinstance(prefs,dict) or set(prefs)!=set(editions) or any(prefs[k] not in editions[k] for k in editions):raise ValueError('请选择有效教材。')
    if not isinstance(context,dict) or set(context)!=set(['grade','subject','term']) or type(context.get('grade')) is not int or not 0<=context['grade']<=6 or context.get('subject') not in editions or context.get('term') not in ('upper','lower'):raise ValueError('请选择有效的年级、科目和册次。')
    if theme not in THEMES:raise ValueError('主题无效。')
    db.execute('BEGIN IMMEDIATE')
    if create:
        if db.execute('SELECT COUNT(*) FROM children WHERE user_id=?',(user['id'],)).fetchone()[0]>=6:raise ValueError('一个账号最多保存6个孩子档案。')
        identifier=secrets.token_urlsafe(12)
        db.execute('INSERT INTO children VALUES(?,?,?,?,?,0,?,?)',(user['id'],identifier,name.strip(),json.dumps(prefs),json.dumps(context),theme,int(time.time())))
    else:
        identifier=data.get('id');version=data.get('version')
        result=db.execute('UPDATE children SET name=?,preferences=?,study_context=?,theme=?,version=version+1 WHERE user_id=? AND id=? AND version=?',(name.strip(),json.dumps(prefs),json.dumps(context),theme,user['id'],identifier,version))
        if result.rowcount!=1:raise ValueError('档案已变化，请刷新后重试。')
    return identifier

def plan_text(day):
    kind=day['kind'];texts=[i['text'] for i in day['items']]+day.get('reviewChars',[])
    return ('' if kind in ('characters','letters','patterns') else '\n').join(texts)

def create_plan(db,user,data,lessons,content_version):
    days=data.get('days');mode=data.get('mode')
    if mode not in ('daily','weekly') or not isinstance(days,list) or not 1<=len(days)<= (1 if mode=='daily' else 7):raise ValueError('请选择1–7天的有效练习。')
    bank={i['char']:i for i in learning.weak_items(db,user['id'],user['child_id'])};prepared=[];previous=None;book=None
    for raw in days:
        if not isinstance(raw,dict):raise ValueError('练习日期无效。')
        try:day=date.fromisoformat(raw['date'])
        except (KeyError,ValueError,TypeError):raise ValueError('练习日期无效。')
        today=date.fromisoformat(learning.today())
        if day<today or day>today+timedelta(days=90) or (previous and day!=previous+timedelta(days=1)) or (mode=='daily' and day!=today):raise ValueError('请从今天或未来90天内连续安排练习。')
        previous=day;lesson=lessons.get(raw.get('lessonId'));kind=raw.get('kind');ids=raw.get('itemIds');review=raw.get('reviewChars',[])
        if not lesson or kind not in KINDS:raise ValueError('暂不支持该课次的每日练习。')
        current=(lesson['grade'],lesson['subject'],lesson['term'],lesson.get('series','pep'))
        if book and book!=current:raise ValueError('一个练习包请选择同一本教材。')
        book=current
        group=next((p for p in lesson['packs'] if p['kind']==kind),None)
        limit=4 if kind=='words' else 6 if kind=='vocabulary' else 8
        if not group or not isinstance(ids,list) or not ids or len(ids)>limit or any(not isinstance(i,str) for i in ids) or len(ids)!=len(set(ids)):raise ValueError('每日练习量超出范围。')
        items=[{'id':i['id'],'text':i['text']} for i in group['items'] if i['id'] in ids]
        if len(items)!=len(ids) or any(len(i['text'])>(8 if kind=='words' else 32) for i in items):raise ValueError('内容已变化或过长，请重新选课。')
        if not isinstance(review,list) or len(review)>2 or any(not isinstance(c,str) for c in review) or len(review)!=len(set(review)):raise ValueError('每次最多加入2个复习字。')
        if review and (lesson['subject']!='cn' or kind not in ('characters','words')):raise ValueError('汉字复习只能加入语文字词练习。')
        for char in review:
            item=bank.get(char)
            if not item or item.get('reviewStatus')=='mastered' or learning.today(item.get('nextReviewAt') or item.get('addedAt',0))>learning.today():raise ValueError('所选字不在当前孩子的到期复习列表。')
            if any(char==i['text'] for i in items):raise ValueError('复习字与新内容重复，请重新生成。')
        prepared.append(dict(date=day.isoformat(),lessonId=lesson['id'],kind=kind,type=KINDS[kind],title=lesson['title'],items=items,reviewChars=review,origin=group['origin'],completed=False))
    if mode=='daily':
        if not db.in_transaction:db.execute('BEGIN IMMEDIATE')
        for row in db.execute('SELECT payload FROM practice_plans WHERE user_id=? AND child_id=? ORDER BY created_at DESC',(user['id'],user['child_id'])):
            prior=json.loads(row['payload'])
            if prior.get('mode')=='daily' and prior.get('contentVersion')==content_version and len(prior['days'])==1 and all(prior['days'][0].get(k)==prepared[0].get(k) for k in ('date','lessonId','kind','items','reviewChars')):return prior
    identifier=secrets.token_urlsafe(20)
    plan=dict(id=identifier,mode=mode,days=prepared,contentVersion=content_version,createdAt=int(time.time()))
    db.execute('INSERT INTO practice_plans VALUES(?,?,?,?,?)',(identifier,user['id'],user['child_id'],json.dumps(plan,ensure_ascii=False),int(time.time())))
    return plan

def get_plan(db,user,identifier):
    row=db.execute('SELECT payload FROM practice_plans WHERE id=? AND user_id=? AND child_id=?',(identifier,user['id'],user['child_id'])).fetchone()
    if not row:raise ValueError('练习包不存在或不属于当前孩子。')
    return json.loads(row['payload'])

def plans(db,user):
    return [json.loads(r['payload']) for r in db.execute('SELECT payload FROM practice_plans WHERE user_id=? AND child_id=? ORDER BY created_at DESC,rowid DESC LIMIT 50',(user['id'],user['child_id']))]

def complete_plan(db,user,identifier,data):
    db.execute('BEGIN IMMEDIATE');plan=get_plan(db,user,identifier);index=data.get('day');completed=data.get('completed')
    if type(index) is not int or not 0<=index<len(plan['days']) or type(completed) is not bool:raise ValueError('完成标记无效。')
    day=plan['days'][index]
    if day['date']>learning.today():raise ValueError('未来的练习不能提前标记完成。')
    day.update(completed=completed,completedAt=int(time.time()) if completed else None)
    db.execute('UPDATE practice_plans SET payload=? WHERE id=?',(json.dumps(plan,ensure_ascii=False),identifier))
    return plan

def growth(db,user):
    uid,cid=user['id'],user['child_id'];dates=set();records=[]
    for row in db.execute('SELECT payload FROM daily_practice WHERE user_id=? AND child_id=?',(uid,cid)):
        plan=json.loads(row['payload'])
        if plan.get('completed'):dates.add(plan['date'])
    for row in db.execute('SELECT payload FROM practice_plans WHERE user_id=? AND child_id=?',(uid,cid)):
        plan=json.loads(row['payload'])
        for day in plan['days']:
            if day.get('completed'):dates.add(day['date']);records.append({'date':day['date'],'title':day['title']})
    reviews=[dict(r) for r in db.execute('SELECT date,char,action FROM review_events WHERE user_id=? AND child_id=? ORDER BY date DESC LIMIT 100',(uid,cid))]
    # Include earlier review records without claiming an invented review history.
    historical=learning.weak_items(db,uid,cid)
    return dict(completedDates=sorted(dates),records=sorted(records,key=lambda r:r['date'],reverse=True)[:100],reviewEvents=reviews,mastered=sum(i.get('reviewStatus')=='mastered' for i in historical),totalReviewCharacters=len(historical),today=learning.today())

def create_share(db,user,data,catalog):
    # Only catalog-backed lessons may be shared. No custom text, names or private plans.
    if data.get('sourceMode')!='lesson':raise ValueError('仅支持分享公开课次练习；姓名和私人练习不生成分享链接。')
    payload=validate_snapshot(data,catalog,[])
    config=dict(payload['config']);config['readings']={};config['strokes']=[]
    if 'header' in config:config['header']={'title':payload['title'],'name':'','className':'','date':''}
    if config['font']=='local':config['font']='wenkai'
    public=dict(lessonId=data['lessonId'],kind=data['practiceKind'],itemIds=data['itemIds'],type=data['type'],config=config,pages=payload['pages'],title=payload['title'],contentVersion=catalog['contentVersion'],origin=payload['origin'])
    identifier=secrets.token_urlsafe(24);now=int(time.time())
    if db.execute('SELECT COUNT(*) FROM lesson_shares WHERE user_id=? AND expires_at>? AND revoked=0',(user['id'],now)).fetchone()[0]>=100:raise ValueError('最多保留100条有效分享，请先停用旧链接。')
    db.execute('INSERT INTO lesson_shares VALUES(?,?,?,?,?,?,0)',(identifier,user['id'],user['child_id'],json.dumps(public,ensure_ascii=False),now,now+30*86400))
    return dict(id=identifier,expiresAt=now+30*86400)
