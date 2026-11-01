"""Collect public book and contents metadata; never download textbook bodies.
Run with --catalog-json pointing to a JSON array of public book records.
"""
import argparse, concurrent.futures, datetime, hashlib, json, re, urllib.request
from html.parser import HTMLParser
from pathlib import Path

class ContentsParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.in_heading=False; self.heading=''; self.capture=False; self.lines=[]
    def handle_starttag(self, tag, attrs):
        if tag in ('h2','h3'):
            self.in_heading=True; self.heading=''
        if self.capture and tag in ('br','p','li','div'):
            self.lines.append('\n')
    def handle_data(self, text):
        if self.in_heading: self.heading+=text
        elif self.capture: self.lines.append(text)
    def handle_endtag(self,tag):
        if tag in ('h2','h3') and self.in_heading:
            self.in_heading=False; self.capture=self.heading.strip().endswith('目录')
        if self.capture and tag in ('p','li','div','pre'): self.lines.append('\n')
    def entries(self):
        return list(dict.fromkeys(x.strip() for x in ''.join(self.lines).splitlines() if x.strip()))

def fetch_contents(book):
    try:
        request=urllib.request.Request(book['candidateCatalogUrl'],headers={'User-Agent':'CurriculumCatalogReview/1.0'})
        with urllib.request.urlopen(request,timeout=18) as response:
            html=response.read(1500000).decode('utf-8');final_url=response.url
        parser=ContentsParser();parser.feed(html);entries=parser.entries()
        # Stop at website boilerplate even if its next block is not a heading.
        clean=[]
        for text in entries:
            if any(marker in text for marker in ('电子课本网','微信扫描','免费下载','PDF下载','英语试卷')): break
            clean.append(text)
        book.update(contents=clean,contentsStatus='secondary-catalog-awaiting-edition-review' if clean else 'not-exposed',catalogResolvedUrl=final_url)
    except Exception as error:
        book.update(contents=[],contentsStatus='fetch-failed',fetchError=type(error).__name__)
    return book

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--catalog-json',required=True);args=parser.parse_args()
    raw=Path(args.catalog_json).read_bytes();rows=json.loads(raw)
    grades={g+'年级':i+1 for i,g in enumerate('一二三四五六')};subjects={'语文':'cn','数学':'math','英语':'en'}
    grouped={}
    for row in rows:
        if row.get('xd')!='小学（六三学制）' or row.get('nj') not in grades or row.get('xk') not in subjects: continue
        if row['xk']=='英语' and ('PEP' not in row['title'] or grades[row['nj']]<3):continue
        if row.get('cc') not in ('上册','下册'):continue
        key=(grades[row['nj']],subjects[row['xk']],'upper' if row['cc']=='上册' else 'lower');grouped.setdefault(key,[]).append(row)
    books=[]
    for (grade,subject,term),variants in sorted(grouped.items()):
        offset=(grade-1)*2+(term=='lower')
        page={'cn':4829,'math':4534,'en':4758}[subject]+(offset if subject!='en' else (grade-3)*2+(term=='lower'))
        books.append(dict(id=f'{subject}-{grade}-{term}',grade=grade,subject=subject,term=term,title=f'{grade}年级{next(k for k,v in subjects.items() if v==subject)}'+('上册' if term=='upper' else '下册'),targetSchoolYear=2026,editionStatus='copyright-page-not-verified',sourceStatus='public-metadata-mirror',officialCandidates=[dict(bookId=r['id'],title=r['title'],readerUrl=r['pdfurl']) for r in variants],candidateCatalogUrl=f'https://www.dzkbw.org/book/{page}.html',practiceStatus='not-imported'))
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        books=list(pool.map(fetch_contents,books))
    result=dict(collectedAt=datetime.date.today().isoformat(),source='https://github.com/siknet/FreePEP/blob/main/pep_catalog.json',sourceSha256=hashlib.sha256(raw).hexdigest(),scope='六三学制语文数学1-6年级、PEP三年级起点英语3-6年级，上下册',note='仅采集书目和目录元数据；第三方目录与官方阅读链接均待逐册版权页核验，不能视为已确认的2026新版。不采集教材正文。',books=books)
    path=Path('web-preview/curriculum/sources/catalog.json');path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(dict(books=len(books),withContents=sum(bool(b['contents']) for b in books),entries=sum(len(b['contents']) for b in books),failed=sum(b['contentsStatus']=='fetch-failed' for b in books)),ensure_ascii=False))
if __name__=='__main__':main()
