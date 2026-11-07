"""Validate immutable worksheet snapshots against the locally published content."""
import json, math, re
from pathlib import Path

TYPES={'hanzi','cizu','duanluo','bihua','alphabet','word','paragraph','number','pinyin','pen-control'}
KINDS={'characters':'hanzi','words':'cizu','sentences':'duanluo','digits':'number','terms':'cizu','formulas':'word','letters':'alphabet','vocabulary':'word','englishSentences':'paragraph','pinyin':'pinyin','patterns':'pen-control'}
KINDS.update({'extraTexts':'duanluo','extraCharacters': 'hanzi', 'extraWords': 'cizu', 'extraSentences': 'duanluo', 'chineseTexts': 'duanluo', 'poems': 'duanluo', 'phrases': 'word', 'extraPhrases': 'word', 'englishExcerpts': 'paragraph', 'englishTexts': 'paragraph', 'calculations': 'paragraph', 'calculationAnswers': 'paragraph', 'vocabularyBilingual': 'paragraph', 'phrasesBilingual': 'paragraph', 'extraPhrasesBilingual': 'paragraph', 'englishSentencesBilingual': 'paragraph', 'englishExcerptsBilingual': 'paragraph', 'englishTextsBilingual': 'paragraph'})
class SnapshotError(ValueError):pass

def load_catalog():return json.loads((Path(__file__).parent/'content.json').read_text())
def validate_snapshot(data,catalog,weak_items=None):
    if not isinstance(data,dict):raise SnapshotError('快照格式不正确。')
    mode=data.get('sourceMode');kind=data.get('type');config=data.get('config');pages=data.get('pages')
    if mode not in ('lesson','custom','review') or kind not in TYPES or not isinstance(config,dict):raise SnapshotError('练习类型或配置无效。')
    if type(pages) is not int or not 1<=pages<=20:raise SnapshotError('每次支持1–20页，请拆分内容后生成。')
    allowed={'mathLayout','showHeader','header','alphabetGuides','guideStyle','controlGuides','batchNames','fadeTrace','fadeStyle','englishMode','fillPage','practiceMode','text','size','rowGap','padding','cellType','font','fontWeight','scale','offset','traceNum','traceColor','lineColor','leading','blankRow','blankCol','showPinyin','showBishun','pair','letterSpace','readings','strokes'}
    if set(config)-allowed:raise SnapshotError('包含不支持的配置。')
    text=config.get('text','')
    if not isinstance(text,str) or len(text)>20000 or not text.strip() and kind!='bihua':raise SnapshotError('请输入1–20000字练习内容。')
    ranges={'size':(6,30),'rowGap':(0,10),'scale':(48,128),'offset':(-50,50),'traceNum':(0,200),'letterSpace':(-10,10)}
    for name,(low,high) in ranges.items():
        v=config.get(name)
        if type(v) not in (int,float) or not math.isfinite(v) or not low<=v<=high:raise SnapshotError('排版参数超出范围：'+name)
    padding=config.get('padding')
    if not isinstance(padding,list) or len(padding)!=4 or any(type(v) not in (int,float) or not 10<=v<=100 for v in padding):raise SnapshotError('页边距无效。')
    if config.get('font') not in ['kaiti','wenkai','song','pinyin1','pinyin2','italic','sans','local']:raise SnapshotError('字体无效。')
    if config.get('cellType') not in ['zwg','num','tzg','mzg','htg','hmg','jgg','hxg','hgg','fg','sxg','dxg','lxg','blank','none']:raise SnapshotError('格线无效。')
    for name in ['traceColor','lineColor']:
        if not isinstance(config.get(name),str) or not re.fullmatch(r'#[0-9a-fA-F]{6}',config[name]):raise SnapshotError('颜色无效。')
    if config.get('fontWeight') not in ('normal','bold'):raise SnapshotError('字体粗细无效。')
    for name in ['leading','blankRow','blankCol','showPinyin','showBishun','pair']:
        if type(config.get(name)) is not bool:raise SnapshotError('开关配置无效。')
    readings=config.get('readings',{});strokes=config.get('strokes',[])
    if not isinstance(readings,dict) or len(readings)>2000 or any(not isinstance(k,str) or not isinstance(v,str) or len(k)>2000 or len(v)>4000 for k,v in readings.items()):raise SnapshotError('拼音修正无效。')
    if not isinstance(strokes,list) or len(strokes)>200 or any(not isinstance(s,dict) or set(s)!={'id','examples'} or type(s['id']) is not int or not 0<=s['id']<=100 or not isinstance(s['examples'],str) or len(s['examples'])>30 for s in strokes):raise SnapshotError('笔画配置无效。')
    if 'fillPage' in config and type(config['fillPage']) is not bool:raise SnapshotError('铺满A4选项无效。')
    if 'fadeTrace' in config and type(config['fadeTrace']) is not bool:raise SnapshotError('渐隐选项无效。')
    if config.get('fadeStyle','more-trace') not in ('more-trace','more-write'):raise SnapshotError('渐隐布局无效。')
    for flag in ['showHeader','alphabetGuides','controlGuides']:
        if flag in config and type(config[flag]) is not bool:raise SnapshotError('书写引导或页眉开关无效。')
    if config.get('alphabetGuides') and kind!='alphabet' or config.get('controlGuides') and kind!='pen-control':raise SnapshotError('本类型不支持所选书写引导。')
    if config.get('guideStyle','dotted') not in ('dotted','solid'):raise SnapshotError('书写引导样式无效。')
    header=config.get('header',{})
    if not isinstance(header,dict) or set(header)-{'title','name','className','date'}:raise SnapshotError('页眉配置无效。')
    for field,limit in [('title',60),('name',24),('className',24),('date',10)]:
        value=header.get(field,'')
        if not isinstance(value,str) or len(value)>limit or any(ord(c)<32 for c in value):raise SnapshotError('页眉字段无效。')
    if header.get('date') and not re.fullmatch(r'\d{4}-\d{2}-\d{2}',header['date']):raise SnapshotError('日期格式无效。')
    if 'batchNames' in config:
        names=config['batchNames']
        if mode!='custom' or kind!='hanzi' or not isinstance(names,list) or not 1<=len(names)<=20 or any(not isinstance(n,str) or not re.fullmatch(r'[\u4e00-\u9fff]{1,6}',n) for n in names) or text!='\n'.join(names):raise SnapshotError('姓名名单无效，请每行输入 1–6 个汉字，最多 20 人。')
    if 'mathLayout' in config and (config['mathLayout'] not in ('trace','answers','horizontal') or kind!='paragraph' or config.get('englishMode','copy')!='copy'):raise SnapshotError('竖式排版配置无效。')
    english_mode=config.get('englishMode','copy')
    if english_mode not in ('copy','to-en','to-cn','cloze','answers'):raise SnapshotError('英语练习方式无效。')
    if english_mode!='copy' and (kind!='paragraph' or any('  /  ' not in line or not all(part.strip() for part in line.split('  /  ',1)) for line in text.splitlines() if line.strip())):raise SnapshotError('英语自测需要中英配对的单词或短语。')
    practice_mode=config.get('practiceMode','trace')
    if practice_mode not in ('trace','copy','quiz','answer') or (practice_mode!='trace' and kind not in ('hanzi','cizu')):raise SnapshotError('本练习类型不支持所选练法。')
    if practice_mode in ('quiz','answer') and (not config['showPinyin'] or config['showBishun']):raise SnapshotError('测验需显示拼音并隐藏笔顺提示。')
    result={'schemaVersion':1,'sourceMode':mode,'type':kind,'config':config,'pages':pages,'engineVersion':catalog['engineVersion'],'contentVersion':catalog['contentVersion'],'fontPortable':config['font']!='local'}
    if mode=='lesson':
        if data.get('contentVersion')!=catalog['contentVersion']:raise SnapshotError('内容版本已更新，请刷新后重新选择。')
        lesson=next((l for l in catalog['lessons'] if l['id']==data.get('lessonId')),None)
        group=next((p for p in lesson['packs'] if p['kind']==data.get('practiceKind')),None) if lesson else None
        ids=data.get('itemIds')
        if not group or KINDS[group['kind']]!=kind or not isinstance(ids,list) or not ids or len(ids)!=len(set(ids)) or any(not isinstance(i,str) for i in ids):raise SnapshotError('所选课次或内容无效。')
        items=[i for i in group['items'] if i['id'] in ids]
        if len(items)!=len(ids):raise SnapshotError('内容不属于所选课次。')
        if 'mathLayout' in config and (lesson['subject']!='math' or group['kind'] not in ('calculations','calculationAnswers')):raise SnapshotError('该内容不支持竖式排版。')
        canonical=('' if group['kind'] in ['characters','extraCharacters','letters','patterns'] else '\n').join(i['text'] for i in items)
        if text!=canonical:raise SnapshotError('课内文字与发布内容不一致。自主编辑请使用自主练字。')
        result.update(lessonId=lesson['id'],bookRevisionId=lesson['revisionId'],practiceKind=group['kind'],items=[{'id':i['stableId'],'text':i['text']} for i in items],origin=group['origin'],title=lesson['title'])
    elif mode=='review':
        chars=data.get('reviewChars');bank={i['char'] for i in (weak_items or [])}
        if kind!='hanzi' or not isinstance(chars,list) or not chars or any(not isinstance(c,str) or c not in bank for c in chars) or len(chars)!=len(set(chars)) or text!=''.join(chars):raise SnapshotError('复习字不属于当前账号的薄弱字列表。')
        result.update(title='薄弱字再练',origin='parent-selected',reviewChars=chars,items=[{'id':'weak-'+c,'text':c} for c in chars])
    else:
        title=data.get('title','自主练字')
        if not isinstance(title,str) or not 1<=len(title)<=80:raise SnapshotError('字帖标题需1–80字。')
        result.update(title=title,origin='user-input')
    return result
