"""Child-scoped, versioned common layouts shared by website and mini-program."""
import json, math, re, time

RANGES={'size':(6,30),'rowGap':(0,10),'scale':(48,128),'offset':(-50,50),'traceNum':(0,200),'letterSpace':(-10,10)}
ENUMS={'font':['kaiti','wenkai','song','italic','sans','pinyin1','pinyin2'],'fontWeight':['normal','bold'],'cellType':['zwg','num','tzg','mzg','htg','hmg','jgg','hxg','hgg','sxg','dxg','lxg','blank','none']}
BOOLS={'leading','blankRow','blankCol','fillPage'}
COLORS={'traceColor','lineColor'}

def migrate(db):
    db.execute('''CREATE TABLE IF NOT EXISTS layout_preferences(user_id INTEGER NOT NULL,child_id TEXT NOT NULL,context_key TEXT NOT NULL,config TEXT,version INTEGER NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(user_id,child_id,context_key))''')

def context_key(value):
    if not isinstance(value,dict) or set(value)!=set(['subject','grade','type','variant']):raise ValueError('排版分类无效。')
    if value['subject'] not in ('cn','math','en','base') or type(value['grade']) is not int or not 0<=value['grade']<=6:raise ValueError('排版年级或科目无效。')
    if value['type'] not in ('hanzi','cizu','duanluo','paragraph','pinyin','number','word','alphabet','bihua','pen-control') or value['variant'] not in ('standard','vertical'):raise ValueError('排版类型无效。')
    return json.dumps(value,sort_keys=True,separators=(',',':'))

def validate(value):
    if value is None:return None  # A versioned tombstone prevents stale devices restoring deleted layouts.
    if not isinstance(value,dict) or not value or set(value)-set(RANGES)-set(ENUMS)-BOOLS-COLORS-{'padding'}:raise ValueError('只允许保存字号、格子等排版设置。')
    for field,item in value.items():
        valid=False
        if field in RANGES:valid=type(item) in (int,float) and math.isfinite(item) and RANGES[field][0]<=item<=RANGES[field][1]
        elif field in ENUMS:valid=item in ENUMS[field]
        elif field in BOOLS:valid=type(item) is bool
        elif field in COLORS:valid=isinstance(item,str) and re.fullmatch(r'#[0-9a-fA-F]{6}',item)
        elif field=='padding':valid=isinstance(item,list) and len(item)==4 and all(type(v) in (int,float) and math.isfinite(v) and 10<=v<=100 for v in item)
        if not valid:raise ValueError('排版参数无效：'+field)
    return value

def public(row):
    return dict(context=json.loads(row['context_key']),config=json.loads(row['config']) if row['config'] else None,version=row['version'],updatedAt=row['updated_at'])

def handle(h,path):
    if path!='/api/layout-preferences':return False
    user=h.require_user()
    if not user:return True
    try:
        with h.server.db() as db:
            if h.command=='GET':
                rows=db.execute('SELECT * FROM layout_preferences WHERE user_id=? AND child_id=?',(user['id'],user['child_id'])).fetchall()
                h.response(200,dict(layouts=[public(row) for row in rows]));return True
            if h.command!='PUT':h.response(405,dict(error='不支持此操作。'));return True
            data=json.loads(h.body())
            if not isinstance(data,dict) or set(data)!=set(['context','config','version']):raise ValueError('排版请求格式无效。')
            key=context_key(data['context']);config=validate(data['config']);version=data['version']
            if type(version) is not int or version<0:raise ValueError('排版版本无效。')
            db.execute('BEGIN IMMEDIATE')
            row=db.execute('SELECT * FROM layout_preferences WHERE user_id=? AND child_id=? AND context_key=?',(user['id'],user['child_id'],key)).fetchone()
            if version!=(row['version'] if row else 0):h.response(409,dict(error='常用排版已在其他设备修改，请刷新后重试。',code='layout_version_conflict'));return True
            db.execute('INSERT INTO layout_preferences VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,child_id,context_key) DO UPDATE SET config=excluded.config,version=excluded.version,updated_at=excluded.updated_at',(user['id'],user['child_id'],key,json.dumps(config) if config is not None else None,version+1,int(time.time())))
            row=db.execute('SELECT * FROM layout_preferences WHERE user_id=? AND child_id=? AND context_key=?',(user['id'],user['child_id'],key)).fetchone()
            db.commit()
            h.response(200,dict(layout=public(row)))
    except (ValueError,TypeError) as error:h.response(422,dict(error=str(error)))
    return True
