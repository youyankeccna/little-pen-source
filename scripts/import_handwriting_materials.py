"""Import user-provided OCR drafts, preserving provenance and rejecting obvious layout noise."""
import argparse,collections,hashlib,json,re
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--source',required=True);a=p.parse_args();root=Path(a.source).resolve();target=Path(__file__).resolve().parents[1]/'web-preview/curriculum/imported'
index=json.loads((root/'index.json').read_text());grades={c:i for i,c in enumerate('一二三四五六',1)}
known={'人教版':'pep','统编版':'pep','人教版-精通':'pep-jingtong','外研版':'fltrp','译林版':'yilin','北师大版':'bnu'}
versions=sorted({r['version'] for r in index if r['subject']=='英语'});edition_ids={v:known.get(v,'ocr-'+hashlib.sha256(v.encode()).hexdigest()[:10]) for v in versions}
editions={'cn':[['pep','统编语文 · 人教出版']], 'en':[[edition_ids[v],v+' · 提取素材'] for v in versions]}
dictionary=Path('/usr/share/dict/words');lexicon={w.lower() for w in dictionary.read_text().splitlines()} if dictionary.is_file() else set();lexicon.update('a i am is are was were be been has have had do does did can will would should could must the an to of in on at by for and or but my your our their its it we you they he she me us them his her hello hi ok goodbye grandma grandpa mum dad panda schoolbag'.split())
def english_word(w):
 w=w.lower();return w in lexicon or any(w.endswith(s) and w[:-len(s)] in lexicon for s in ('s','es','ed','ing'))
lessons=[];books=[];filtered=collections.Counter()
noise=re.compile(r'ISBN|版权|出版|印刷|编写|编修|主编|后记|联系方式|电子邮箱|电话|反馈平台|教材页面|OCR|^共.{0,8}个|^（共|笔画名称表|常用偏旁|绿色印刷|义务教育|人民.{0,6}出版社|^\d+$|^第.{1,3}页$|https?://|@',re.I)
instruction=re.compile(r'朗读|背诵|课文|田字格|竖中线|横中线|读一读|写一写|说一说|想一想|圈出|画出|教材|认读|听老师|Listen|Read and|Look and|Let.s (?:talk|learn|chant|sing|play|read)|Project:|Start to|Circle|Choose|Match|Tick|Work in|Ask and|Talk about|Activity|Appendix|Review|Assessment',re.I)
def clean(line):
 line=re.sub(r'^\*\*[^*]+\*\*\s*','',line).strip();line=line.replace('！','!').replace('？','?').replace('，',',').replace('’',"'").replace('“','"').replace('”','"');return line
for book in index:
 file=(root/book['file']).resolve()
 if not file.is_relative_to(root):raise ValueError('Path outside input')
 text=file.read_text();subject='cn' if book['subject']=='语文' else 'en';grade=grades[book['grade'][0]];term='lower' if '下册' in book['grade'] else 'upper';series='pep' if subject=='cn' else edition_ids[book['version']];bookid='import-'+hashlib.sha256(book['file'].encode()).hexdigest()[:16]
 vocab={}
 if subject=='en':
  for raw in text.splitlines():
   match=re.match(r"^\*?([A-Za-z]+(?:[ '-][A-Za-z]+){0,3})\s*/",raw.strip())
   if match and all(english_word(w) for w in match[1].split()):vocab[match[1].lower()]=match[1]
 vocab_pattern=re.compile(r"(?<![A-Za-z])(?:"+'|'.join(re.escape(k) for k in sorted(vocab,key=len,reverse=True))+r")(?![A-Za-z])",re.I) if vocab else None
 sections=[];unit='单元待核对';title='未分课素材';lines=[]
 def flush():
  global lines
  if lines:sections.append((unit,title,lines));lines=[]
 for raw in text.splitlines():
  h=re.match(r'^(#{2,4})\s+(.+)',raw)
  if h:
   flush();heading=h[2].strip()
   if len(h[1])==2:unit=heading;title=heading+' · 素材'
   else:title=heading
  elif raw.startswith(('# ', '>','---')):continue
  elif subject=='cn' and re.fullmatch(r'第[一二三四五六七八九十]+单元[·•\s\u4e00-\u9fff]*',raw.strip()):flush();unit=raw.strip();title=unit+' · 素材'
  else:lines.append(raw)
 flush();made=0
 for ordinal,(unit,title,rawlines) in enumerate(sections):
  if title=='未分课素材':title='未分课素材 · 待核对'
  chars=[];words=[];sentences=[];stopped=False
  for raw in rawlines:
   line=clean(raw)
   if not line:continue
   if line.startswith(('后记','笔画名称表','常用偏旁名称表')):stopped=True
   if stopped or noise.search(line) or instruction.search(line):filtered[subject]+=1;continue
   if subject=='en':
    entry=re.match(r"^\*?([A-Za-z]+(?:[ '-][A-Za-z]+){0,3})\s*/",line)
    if entry and entry[1].lower() in vocab:words.append(vocab[entry[1].lower()])
    if re.fullmatch(r"[A-Za-z][A-Za-z0-9 ,.!?'\-:;\"()]{5,139}[.!?]",line) and len(line.split())>=3 and all(english_word(w) or w[:1].isupper() for w in re.findall(r"[A-Za-z]+",line)):
     sentences.append(line)
    if re.fullmatch(r"[A-Za-z][A-Za-z '\-]{1,20}",line) and len(line.split())==1 and english_word(line):words.append(line)
    if vocab_pattern:
     words.extend(vocab[m[0].lower()] for m in vocab_pattern.finditer(line))
   else:
    if len(line)<=35 and re.fullmatch(r'[\u4e00-\u9fff\s]+',line):
     pieces=line.split();words.extend(w for w in pieces if 2<=len(w)<=8);chars.extend(c for c in line if '\u4e00'<=c<='\u9fff')
    if 6<=len(line)<=90 and re.fullmatch(r'[\u4e00-\u9fff\s，。！？、；：“”‘’,.!?"\-]+',line) and re.search('[。!?]',line):sentences.append(line)
  groups=[('characters',list(dict.fromkeys(chars))[:120]),('words',list(dict.fromkeys(words))[:60]),('sentences',list(dict.fromkeys(sentences))[:30])] if subject=='cn' else [('vocabulary',list(dict.fromkeys(words))[:60]),('englishSentences',list(dict.fromkeys(sentences))[:40])]
  packs=[dict(kind=k,origin='user-provided-ocr',items=[dict(id=f'{k}-{i}',text=t) for i,t in enumerate(values)]) for k,values in groups if values]
  if not packs:continue
  lessons.append(dict(id=f'{bookid}-{ordinal}',grade=grade,subject=subject,term=term,series=series,unit='教材提取 · '+unit,title=title,edition=book['version']+' · 用户提供OCR素材',catalogStatus='user-ocr',contentStatus='ocr-draft',reviewStatus='ocr-unreviewed',revisionId=bookid,teachingOrder=9000+ordinal if title.startswith('未分课') else -10000+ordinal,packs=packs,source='/curriculum/imported/manifest.json',note='用户提供的教材OCR提取稿，已过滤明显页码和教学指令；识别文字、单元与课次对应尚待校订，请先核对预览。不是本站已审核教材内容。',provenance=dict(file=book['file'],sha256=hashlib.sha256(text.encode()).hexdigest(),section=ordinal,indexSections=len(book['sections']),rightsBasis='user-provided-materials; publication rights not independently verified')));made+=1
  
 books.append(dict(id=bookid,subject=subject,grade=grade,term=term,series=series,version=book['version'],file=book['file'],sha256=hashlib.sha256(text.encode()).hexdigest(),importedLessons=made,indexSections=len(book['sections']),status='ocr-unreviewed'))
payload=dict(editions=editions,lessons=lessons)
target.mkdir(parents=True,exist_ok=True);(target/'materials.js').write_text('(function(root){const data='+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+';root.ImportedMaterials=data;if(typeof module!=="undefined")module.exports=data;})(typeof globalThis!=="undefined"?globalThis:this);\n')
report=dict(source=str(root),books=books,bookCount=len(books),lessonCount=len(lessons),editionCount=len(versions),filteredLines=dict(filtered),notice='用户提供OCR草稿；不代表教材完整、文字准确或出版使用依据已审核。未分课内容保持单独标注。')
(target/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(dict(books=len(books),lessons=len(lessons),emptyBooks=[b['file'] for b in books if not b['importedLessons']],versions=len(versions)),ensure_ascii=False))
