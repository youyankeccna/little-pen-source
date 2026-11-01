#!/usr/bin/env python3
"""Build semester banks from supplied files; never treats OCR drafts as reviewed text."""
import argparse, hashlib, json, re, subprocess, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent/'material_bank'))
from math_bank import build as math_build
from chinese_supplement import SUPPLEMENT
ROOT=Path(__file__).resolve().parents[1]
DEFAULT=Path('/Users/kim/WorkBuddy/2026-10-16-21-57-05/练字素材')
HAN=r'\u4e00-\u9fff'
def key(text):return hashlib.sha256(text.encode()).hexdigest()[:14]
def norm(s):return re.sub(r'[^a-z0-9]','',s.lower())
def item(text,**kw):return {'id':key(text),'text':text,**kw}
def unique(items):return list({x['text']:x for x in reversed(items)}.values())[::-1]
def pack(kind,items,origin='user-provided-ocr',label=None):
    return {'kind':kind,'origin':origin,'items':unique(items),**({'label':label} if label else {})}
def clean_title(s):return re.sub(r'^\s*\d+\s*','',s.strip())
def chinese(raw,file):
    raw=raw.split('## 附录')[0];lines=raw.splitlines();chars=[];words=[];sentences=[];texts=[]
    section=None
    for no,line in enumerate(lines,1):
        s=line.strip().lstrip('#').strip()
        if re.fullmatch(r'(识字表|写字表|词语表)[①②]?',s):section=s[:3];continue
        if section and re.match(r'笔画名称表|常用偏旁|后记|联系方式|（共|\(共',s):section=None
        if section in ['写字表','词语表']:
            if re.search(r'语文园地|汉语拼音|识字|阅读|出版社|共.*字|①|②',s):continue
            ref={'file':file,'line':no,'section':section,'status':'ocr-unreviewed'}
            if section=='写字表':
                if re.search(r'[A-Za-z]',s):continue
                chars.extend(item(ch,sourceRef=ref) for ch in re.findall(f'[{HAN}]',s))
            else:
                words.extend(item(w,sourceRef=ref) for w in re.findall(f'[{HAN}]{{2,8}}',s) if w not in ['词语表','绿色印刷产品'])
    # Restrict fragments to lesson headings and stop at teaching instructions/credits.
    headings=list(re.finditer(r'^###\s+(\d+\s*[^\n]+)',raw,re.M))
    for i,m in enumerate(headings):
        end=headings[i+1].start() if i+1<len(headings) else len(raw)
        body=raw[m.end():end];body=re.split(r'\n\s*(?:①|朗读课文|[◆◎●]?背诵|[◆◎●]?默读|##|识字表|写字表|词语表|语文园地|日积月累|口语交际|和大人一起读|快乐读书吧|书写提示)',body)[0]
        buf='';startline=raw[:m.end()].count('\n')+1;title=clean_title(m.group(1))
        for offset,line in enumerate(body.splitlines()):
            s=line.strip()
            if not s or re.search(r'[A-Za-z0-9]|[①②③④⑤⑥⑦⑧⑨]|授权|出版社|本文选|本文作者|说一说|读一读|想一想|课后',s):continue
            s=re.sub(f'[^ {HAN}，。！？；：“”‘’、（）《》…—]', '',s).replace(' ','')
            if not s or len(s)<3:continue
            if re.search(r'(.)\1{2,}|语文园地|识字加油|字词句运用|照样子|笔顺|朗读|背诵|哪些事|日积月累|我说你做|你能猜出',s):break
            if s==title:continue
            buf+=s
            if re.search('[。！？]$|[。！？][”’]$',buf):
                if 12<=len(buf)<=600 and not re.search(r'(.)\1{2,}|语文园地|识字加油|字词句运用|照样子|笔顺|朗读|背诵',buf):
                    ref={'file':file,'line':startline+offset,'lesson':title,'status':'ocr-unreviewed'}
                    texts.append(item(buf,sourceRef=ref,caption=title+' · 片段'))
                    for sentence in re.findall(r'[^。！？]+[。！？][”’]?',buf):
                        if 12<=len(sentence)<=90:sentences.append(item(sentence,sourceRef=ref))
                buf=''
            if len(buf)>600:buf=''
    return chars,words,sentences,texts

def dictionary(raw,file):
    entries={}
    for no,line in enumerate(raw.splitlines(),1):
        # One physical line only: cross-column continuations are unsafe to pair.
        match=re.match(r"^\s*\*?([A-Za-z][A-Za-z '’()\-]{0,48})\s*/.*?/\s*(.*)$",line)
        if not match:continue
        en,zh=match.groups();en=re.sub(r'\s+',' ',en).strip();zh=re.split(r'[Pp]\s*\.?\s*\d',zh)[0].strip()
        zh=re.sub(r'^\s*(?:n|v|adj|adv|prep|pron)\.\s*','',zh)
        if not re.search(f'[{HAN}]',zh) or len(zh)>55 or re.search(r'[/A-Za-z]',zh):continue
        if zh.endswith(('；',';','，','、','的')) and len(zh)>12:continue
        if en in ['I','Miss','Mr','Mrs']:pass
        else:en=en.lower()
        value=item(en,translation=zh,translationSource='教材词汇释义（OCR待校订）',sourceRef={'file':file,'line':no,'status':'ocr-unreviewed'})
        if en not in entries:entries[en]=value
        elif zh not in entries[en]['translation']:
            if entries[en]['translation'] in zh:entries[en]=value
            else:entries[en]['translation']+='；'+zh
    return list(entries.values())

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,default=DEFAULT);args=parser.parse_args();source=args.source
    manifest=json.loads((ROOT/'web-preview/curriculum/imported/manifest.json').read_text())['books']
    existing=json.loads(subprocess.check_output(['node','-e',"process.stdout.write(JSON.stringify(require('./web-preview/curriculum/data.js').lessons.filter(l=>!l.materialLibrary)))"],cwd=ROOT))
    curated={}
    for line in (ROOT/'scripts/material_bank/english_curated.tsv').read_text().splitlines():
        if line and not line.startswith('#'):
            k,en,zh,phrases,reading,readingzh=line.split('|');curated[k]=(en,zh,phrases,reading,readingzh)
    lessons=[];coverage=[];audit={'missingChinese':[],'unmatchedEnglishExcerpts':[],'sourceFiles':[]}
    def lesson(id,grade,subject,term,title,packs,series='pep',unit='整册素材',**extra):
        return dict(id=id,grade=grade,subject=subject,term=term,title=title,unit=unit,series=series,edition='统编语文' if subject=='cn' else '原创计算专项' if subject=='math' else '人教 PEP' if series=='pep' else extra.pop('version',series),materialLibrary=True,revisionId=f'bank-{subject}-{series}-{grade}-{term}',source='/curriculum/material-bank-coverage.json',reviewStatus='reference-only',note='素材按来源分别标注；OCR提取内容待校订，不宣称完整教材覆盖。',packs=[p for p in packs if p['items']],**extra)
    for g in range(1,7):
      for term in ['upper','lower']:
        book=next((b for b in manifest if b['subject']=='cn' and b['grade']==g and b['term']==term),None)
        packs=[];counts={}
        if book:
            raw=(source/book['file']).read_text();sets=chinese(raw,book['file'])
            for kind,values,label in zip(['characters','words','sentences','chineseTexts'],sets,['写字表提取','整册词语提取','课文句子提取','课文片段提取']):
                if values:packs.append(pack(kind,values,label=label))
            audit['sourceFiles'].append({k:book[k] for k in ['file','sha256']})
        else:audit['missingChinese'].append(f'{g}-{term}')
        # Keep clean, existing authored practice distinct from the textbook draft.
        for kind,newkind,label in [('characters','extraCharacters','补充字库'),('words','extraWords','补充词库'),('sentences','extraSentences','补充句段')]:
            vals=[]
            for l in existing:
                if l['grade']!=g or l['subject']!='cn' or l['term']!=term:continue
                for p in l['packs']:
                    if p['kind']==kind and p['origin']=='self-authored':
                        vals.extend(item(i['text'],sourceRef={'lessonId':l['id'],'origin':'self-authored'}) for i in p['items'])
            if vals:packs.append(pack(newkind,vals,'self-authored',label))
        # Public-domain poetry already present remains explicitly separated.
        poems=[item(i['text'],caption=l['title'],sourceRef={'lessonId':l['id'],'origin':'public-domain'}) for l in existing if l['subject']=='cn' and l['grade']==g and l['term']==term for p in l['packs'] if p['origin']=='public-domain' for i in p['items'] if len(i['text'])>8]
        if poems:packs.append(pack('poems',poems,'public-domain','古诗原文（公版）'))
        if not book and g in SUPPLEMENT:
            additions=[item(w,sourceRef={'origin':'self-authored','theme':title}) for title,words,text in SUPPLEMENT[g] for w in words.split()]
            target=next((p for p in packs if p['kind']=='extraWords'),None)
            if target:target['items']=unique(target['items']+additions)
            packs.append(pack('extraTexts',[item(text,caption=title,sourceRef={'origin':'self-authored','theme':title}) for title,words,text in SUPPLEMENT[g]],'self-authored','原创阅读短文'))
        if not any(p['kind']=='extraCharacters' for p in packs):
            supplement_words=[v['text'] for p in packs if p['kind']=='extraWords' for v in p['items']]
            if supplement_words:packs.append(pack('extraCharacters',[item(c,sourceRef={'origin':'self-authored','derivedFrom':'补充词库'}) for c in ''.join(supplement_words)],'self-authored','补充字库'))
        entry=lesson(f'bank-cn-{g}-{term}',g,'cn',term,f'{g}年级'+('上册' if term=='upper' else '下册')+'语文整册素材',packs,sourceAvailable=bool(book))
        lessons.append(entry);coverage.append({'subject':'cn','grade':g,'term':term,'series':'pep','sourceAvailable':bool(book),'counts':{p['kind']:len(p['items']) for p in entry['packs']},'notice':'教材OCR提取稿，非完整审核字词表。' if book else '缺少本册教材文件，目前只有补充练习与公版古诗。'})
    for book in [b for b in manifest if b['subject']=='en']:
        raw=(source/book['file']).read_text();vocab=dictionary(raw,book['file']);headings=list(re.finditer(r'^##\s+Unit\s+(\d+)([^\n]*)',raw,re.M));units=[]
        for ix,m in enumerate(headings):
            num=int(m.group(1));body=raw[m.end():headings[ix+1].start() if ix+1<len(headings) else raw.find('## 附录',m.end()) if '## 附录' in raw[m.end():] else len(raw)]
            # Last unit may contain raw appendices; stop at original appendix headings too.
            body=re.split(r'\n(?:Appendix\s*\d|Words in each unit|Vocabulary)',body,flags=re.I)[0]
            unitv=[v for v in vocab if re.search(r'(?<![a-z])'+re.escape(v['text'])+r'(?![a-z])',body,re.I)]
            packs=[pack('vocabulary',[x for x in unitv if ' ' not in x['text']],label='单词 · 中英对照'),pack('phrases',[x for x in unitv if ' ' in x['text']],label='教材短语 · 中英对照')]
            k=f"{book['grade']}-{book['term']}-{num}"
            if book['series']=='pep' and k in curated:
                en,zh,phrases,reading,readingzh=curated[k]
                # Exact normalized source membership is required to call it an excerpt.
                if norm(en) in norm(body):
                    packs.append(pack('englishExcerpts',[item(en,translation=zh,translationSource='本站译文（待复核）',sourceRef={'file':book['file'],'unit':num,'status':'ocr-unreviewed'})],label='课文摘句 · 中英对照'))
                else:audit['unmatchedEnglishExcerpts'].append(k)
                phraseitems=[item(p.split('=')[0],translation=p.split('=')[1],translationSource='本站编写',sourceRef={'origin':'self-authored','theme':k}) for p in phrases.split(';')]
                packs.append(pack('extraPhrases',phraseitems,'self-authored','主题短语补充'))
                sentenceitems=[item(a.strip(),translation=b.strip(),translationSource='本站编写',sourceRef={'origin':'self-authored','theme':k}) for a,b in zip(re.findall(r'[^.!?]+[.!?]',reading),re.findall(r'[^。！？]+[。！？]',readingzh))]
                packs.append(pack('englishSentences',sentenceitems,'self-authored','主题句子 · 中英对照'))
                packs.append(pack('englishTexts',[item(reading,translation=readingzh,translationSource='本站编写',sourceRef={'origin':'self-authored','theme':k})],'self-authored','主题短文（原创）'))
            packs=[p for p in packs if p['items']]
            if not packs:continue
            # Bilingual variants have canonical text, so server validation/export stays unchanged.
            for p in list(packs):
                packs.append(pack(p['kind']+'Bilingual',[{**v,'text':v['text']+('  /  ' if p['kind'] in ['vocabulary','phrases','extraPhrases'] else '\n')+v['translation'],'english':v['text']} for v in p['items']],p['origin'],p.get('label','')+'（双语打印）'))
            title=re.sub(r'^\s*[·.：:]\s*','',m.group(2)).strip() or f'Unit {num}'
            units.append(lesson(f"bank-en-{book['series']}-{book['grade']}-{book['term']}-u{num}",book['grade'],'en',book['term'],f'Unit {num} · {title}',packs,series=book['series'],unit=f'Unit {num}',unitNumber=num,version=book['version']))
        # Duplicate OCR unit headings must not produce duplicate lesson IDs.
        units=list({x['id']:x for x in units}.values());lessons.extend(units)
        coverage.append({'subject':'en','grade':book['grade'],'term':book['term'],'series':book['series'],'version':book['version'],'units':len(units),'vocabulary':sum(len(p['items']) for u in units for p in u['packs'] if p['kind']=='vocabulary'),'dictionaryEntries':len(vocab),'notice':'仅纳入能配对中文释义的词条；不同版本提取完整度不同。'})
        audit['sourceFiles'].append({k:book[k] for k in ['file','sha256']})
    math=math_build()
    for topic in math:
        questions=topic['items'];answers=[{**i,'text':i['text'].replace('____ 余 ____',i['answer']).replace('____',i['answer'])} for i in questions]
        lessons.append(lesson(f"bank-math-{topic['grade']}-{topic['term']}-{topic['topic']}",topic['grade'],'math',topic['term'],topic['title'],[pack('calculations',questions,'self-authored','计算练习'),pack('calculationAnswers',answers,'self-authored','答案核对')],unit='原创计算专项',topic=topic['topic'],teachingOrder=topic['order'],knowledgePoint=topic['title']))
    for g in range(1,7):
        for term in ['upper','lower']:
            rows=[x for x in math if x['grade']==g and x['term']==term]
            coverage.append({'subject':'math','grade':g,'term':term,'series':'pep','topics':len(rows),'questions':sum(len(x['items']) for x in rows),'notice':'按常见年级进度编制的原创练习，不等同指定教材目录。'})
    payload={'schemaVersion':1,'lessons':lessons,'coverage':coverage}
    out=ROOT/'web-preview/curriculum/material-bank.js';out.write_text('(function(root){const data='+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+';root.MaterialBankData=data;if(typeof module!=="undefined")module.exports=data;})(typeof globalThis!=="undefined"?globalThis:this);\n')
    report={'builtAt':'2026-10-23','sourceRoot':str(source),'summary':{'lessons':len(lessons),'chineseSourceBooks':9,'chineseMissingBooks':audit['missingChinese'],'englishSourceBooks':161,'mathQuestions':sum(len(x['items']) for x in math)},'coverage':coverage,'audit':audit}
    (ROOT/'web-preview/curriculum/material-bank-coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report['summary'],ensure_ascii=False));print('Unmatched excerpts:',audit['unmatchedEnglishExcerpts'])
if __name__=='__main__':main()
