import copy
import unittest
from worksheets import load_catalog, validate_snapshot, SnapshotError


class PrintGuides(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = load_catalog()

    def payload(self, kind='hanzi'):
        return dict(sourceMode='custom', type=kind, pages=1, config=dict(
            text='小明', size=18, rowGap=2, padding=[36]*4, cellType='tzg', font='wenkai',
            fontWeight='normal', scale=68, offset=0, traceNum=3, traceColor='#94a3b8',
            lineColor='#64748b', leading=True, blankRow=False, blankCol=False,
            showPinyin=False, showBishun=False, pair=False, letterSpace=0, readings={}, strokes=[]))

    def test_batch_preserves_names_and_header(self):
        body=self.payload();body['pages']=2
        body['config'].update(text='小明\n小红',batchNames=['小明','小红'],fillPage=True,
                              showHeader=True,header=dict(title='名字练习',name='',className='一班',date='2026-10-24'))
        result=validate_snapshot(body,self.catalog)
        self.assertEqual(result['config']['batchNames'],['小明','小红'])
        self.assertEqual(result['config']['header']['className'],'一班')
        for names in [[],['小明']*21,['abc'],['小明\n小红']]:
            bad=copy.deepcopy(body);bad['config']['batchNames']=names
            with self.assertRaises(SnapshotError):validate_snapshot(bad,self.catalog)
        bad=copy.deepcopy(body);bad['config']['text']='被修改'
        with self.assertRaises(SnapshotError):validate_snapshot(bad,self.catalog)
        bad=copy.deepcopy(body);bad['sourceMode']='lesson'
        with self.assertRaises(SnapshotError):validate_snapshot(bad,self.catalog)

    def test_math_layout_validation(self):
        body=self.payload('paragraph');body['config']['text']='868 × 48 = ____'
        for layout in ['trace','answers','horizontal']:
            body['config']['mathLayout']=layout
            self.assertEqual(validate_snapshot(body,self.catalog)['config']['mathLayout'],layout)
        for kind,layout in [('paragraph','unknown'),('hanzi','trace'),('paragraph',True)]:
            bad=copy.deepcopy(body);bad['type']=kind;bad['config']['mathLayout']=layout
            with self.assertRaises(SnapshotError):validate_snapshot(bad,self.catalog)
        lesson=next(l for l in self.catalog['lessons'] if l['id']=='bank-math-4-upper-mul-two')
        group=next(p for p in lesson['packs'] if p['kind']=='calculations')
        body.update(sourceMode='lesson',contentVersion=self.catalog['contentVersion'],lessonId=lesson['id'],practiceKind='calculations',itemIds=[group['items'][0]['id']])
        body['config'].update(text=group['items'][0]['text'],mathLayout='trace')
        self.assertEqual(validate_snapshot(body,self.catalog)['practiceKind'],'calculations')

    def test_guide_modes_are_type_checked(self):
        for kind,flag in [('alphabet','alphabetGuides'),('pen-control','controlGuides')]:
            body=self.payload(kind);body['config'].update({flag:True,'guideStyle':'dotted'})
            validate_snapshot(body,self.catalog)
            body['type']='hanzi'
            with self.assertRaises(SnapshotError):validate_snapshot(body,self.catalog)
        for patch in [dict(showHeader='yes'),dict(header={'name':['秘密']}),dict(header={'title':'x'*61}),dict(header={'name':'A\nB'}),dict(header={'date':'tomorrow'}),dict(guideStyle='unknown')]:
            body=self.payload();body['config'].update(patch)
            with self.assertRaises(SnapshotError):validate_snapshot(body,self.catalog)


if __name__=='__main__':unittest.main()
