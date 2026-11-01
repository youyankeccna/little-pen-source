import ast,json,unittest,sys
from fractions import Fraction
from pathlib import Path
from worksheets import validate_snapshot,KINDS,SnapshotError
ROOT=Path(__file__).resolve().parents[1]

def exact(expression):
    node=ast.parse(expression,mode='eval').body
    def solve(n):
        if isinstance(n,ast.Constant):return Fraction(str(n.value))
        if isinstance(n,ast.BinOp):
            a,b=solve(n.left),solve(n.right)
            return {ast.Add:lambda:a+b,ast.Sub:lambda:a-b,ast.Mult:lambda:a*b,ast.Div:lambda:a/b}[type(n.op)]()
        raise ValueError('Unexpected expression')
    return solve(node)
class MaterialBank(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog=json.loads((ROOT/'server/content.json').read_text());cls.lessons=[l for l in cls.catalog['lessons'] if l.get('materialLibrary')]
    def test_all_calculation_answers_and_grade_bounds(self):
        total=0;books=set()
        for lesson in self.lessons:
            if lesson['subject']!='math':continue
            books.add((lesson['grade'],lesson['term']))
            for i in lesson['packs'][0]['items']:
                c=i['check'];answer=i['answer'];expr=c['expression'];total+=1
                if expr is not None:self.assertEqual(exact(expr),Fraction(answer),i['text'])
                elif 'remainder' in c:
                    self.assertEqual(divmod(c['dividend'],c['divisor']),(c['quotient'],c['remainder']))
                    self.assertEqual(answer,f"{c['quotient']} 余 {c['remainder']}")
                elif 'x' in c:self.assertEqual(c['coefficient']*int(answer)+c['constant'],c['rhs'])
                else:self.assertEqual(Fraction(c['left'],c['right']),Fraction(*map(int,answer.split(' : '))))
                if lesson['grade']==1 and expr:
                    self.assertGreaterEqual(Fraction(answer),0)
                    self.assertLessEqual(Fraction(answer),20 if lesson['term']=='upper' else 100)
                if lesson['topic']=='fraction-same':self.assertLessEqual(Fraction(answer),1)
        self.assertEqual(len(books),12);self.assertGreater(total,2900)
    def test_snapshot_contract_every_bank_kind(self):
        for lesson in self.lessons:
            for group in lesson['packs']:
                items=group['items'][:2];kind=group['kind'];text=('' if kind in ['characters','extraCharacters'] else '\n').join(i['text'] for i in items)
                config=dict(text=text,size=10,rowGap=3,padding=[36]*4,cellType='hxg',font='wenkai',fontWeight='normal',scale=65,offset=0,traceNum=3,traceColor='#344b3d',lineColor='#64748b',leading=True,blankRow=False,blankCol=False,showPinyin=False,showBishun=False,pair=False,letterSpace=0,readings={},strokes=[],fillPage=True)
                data=dict(sourceMode='lesson',type=KINDS[kind],pages=1,config=config,lessonId=lesson['id'],practiceKind=kind,itemIds=[i['id'] for i in items],contentVersion=self.catalog['contentVersion'])
                saved=validate_snapshot(data,self.catalog)
                config.update(fadeTrace=True,fadeStyle='more-write')
                validate_snapshot(data,self.catalog)
                if kind in ['vocabularyBilingual','phrasesBilingual','extraPhrasesBilingual']:
                    for exercise in ['copy','to-en','to-cn','cloze','answers']:
                        config['englishMode']=exercise
                        self.assertEqual(validate_snapshot(data,self.catalog)['config']['englishMode'],exercise)
                    config['englishMode']='invented'
                    with self.assertRaises(SnapshotError):validate_snapshot(data,self.catalog)
                    del config['englishMode']
                config['fadeTrace']='yes'
                with self.assertRaises(SnapshotError):validate_snapshot(data,self.catalog)
                config['fadeTrace']=True
                self.assertEqual(saved['config']['text'],text)
                self.assertEqual(saved['items'][0]['id'],items[0]['stableId'])
    def test_provenance_and_nonempty_translations(self):
        for lesson in self.lessons:
            if lesson['subject']=='math':continue
            for p in lesson['packs']:
                for i in p['items']:
                    self.assertTrue(i.get('sourceRef'))
                    if lesson['subject']=='en':self.assertTrue(i.get('translation'))
if __name__=='__main__':unittest.main()
