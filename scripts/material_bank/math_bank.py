"""Deterministic original exercises. Fractions avoid float answer errors."""
from fractions import Fraction as F
import random

def fmt(v):
    v=F(v)
    return str(v.numerator) if v.denominator==1 else f'{v.numerator}/{v.denominator}'
def dec(v):
    return f'{float(v):.4f}'.rstrip('0').rstrip('.') if F(v).denominator!=1 else fmt(v)

def build():
    # These are semester practice progressions, not a textbook exercise transcription.
    curricula={
      (1,'upper'):[('十以内加法','add',10),('十以内减法','sub',10),('二十以内不进位加法','add-no-carry',20),('二十以内进位加法','carry',20)],
      (1,'lower'):[('二十以内退位减法','borrow',20),('整十数加减','tens',100),('一百以内不进位加法','add-no-carry',100),('一百以内不退位减法','sub-no-borrow',100)],
      (2,'upper'):[('一百以内进位加法','carry',100),('一百以内退位减法','borrow',100),('乘法口诀','mul',9),('一百以内连加连减','chain',100)],
      (2,'lower'):[('表内除法','div',9),('有余数的除法','remainder',9),('乘除加减混合','mixed',9),('一千以内整百整十加减','tens',1000)],
      (3,'upper'):[('三位数加法','add',999),('三位数减法','sub',999),('多位数乘一位数','mul-one',999),('同分母分数加减','fraction-same',10)],
      (3,'lower'):[('两三位数除以一位数','div-one',999),('两位数乘两位数','mul-two',99),('一位小数加减','decimal-add',100),('乘除加减混合','mixed',30)],
      (4,'upper'):[('三位数乘两位数','mul-two',999),('两三位数除以两位数','div-two',999),('整百整千数乘除','round-mul',100),('商和余数','remainder-two',999)],
      (4,'lower'):[('含括号的四则运算','brackets',60),('运算律简便计算','distribute',100),('两位小数加减','decimal-add-two',1000),('小数乘除十或一百','decimal-shift',1000)],
      (5,'upper'):[('小数乘整数','decimal-mul-int',90),('小数乘小数','decimal-mul',90),('小数除法','decimal-div',90),('解简易方程','equation',100)],
      (5,'lower'):[('异分母分数加法','fraction-add',12),('异分母分数减法','fraction-sub',12),('分数连加连减','fraction-chain',12),('约分与通分准备','simplify',12)],
      (6,'upper'):[('分数乘法','fraction-mul',15),('分数除法','fraction-div',15),('分数混合运算','fraction-mixed',15),('百分数计算','percent',200),('比的化简','ratio',20)],
      (6,'lower'):[('百分数应用计算','percent-change',300),('解比例','proportion',20),('整数小数四则复习','decimal-review',100),('分数四则复习','fraction-review',15),('比例尺计算','scale',100)],
    }
    lessons=[]
    for (grade,term),topics in curricula.items():
      for order,(title,mode,limit) in enumerate(topics,1):
        rng=random.Random(f'{grade}-{term}-{mode}-v1');items=[];seen=set()
        for attempt in range(20000):
          if len(items)>=60:break
          n=lambda a,b:rng.randint(a,b)
          a,b=n(1,limit),n(1,limit);operator='';extra={}
          if mode in ['add','sub','add-no-carry','sub-no-borrow','carry','borrow','tens','chain']:
            if mode=='tens':a,b=n(1,limit//10)*10,n(1,limit//10)*10
            if mode in ['sub','sub-no-borrow','borrow']:a,b=max(a,b),min(a,b);operator='-'
            else:operator='+'
            if mode in ['add','add-no-carry','carry','tens'] and a+b>limit:continue
            if mode=='add-no-carry' and a%10+b%10>=10:continue
            if mode=='carry' and (a%10+b%10<10 or a>=limit or b>=limit):continue
            if mode=='sub-no-borrow' and a%10<b%10:continue
            if mode=='borrow' and a%10>=b%10:continue
            answer=a+b if operator=='+' else a-b
            q=f'{a} {operator} {b} = ____';expr=f'{a}{operator}{b}'
            if mode=='chain':
              a,b,c=n(1,30),n(1,30),n(1,30);op=rng.choice(['+','-']);answer=a+b+c if op=='+' else a+b-c
              if answer<0:continue
              q=f'{a} + {b} {op} {c} = ____';expr=f'{a}+{b}{op}{c}'
          elif mode in ['mul','mul-one','mul-two','round-mul']:
            if mode=='mul-one':a,b=n(10,limit),n(2,9)
            if mode=='mul-two':a,b=n(100 if limit>99 else 10,limit),n(10,99)
            if mode=='round-mul':a,b=n(1,90)*100,n(2,9)
            answer=a*b;q=f'{a} × {b} = ____';expr=f'{a}*{b}'
            if mode=='round-mul' and n(0,1):answer=a;q=f'{a*b} ÷ {b} = ____';expr=f'{a*b}/{b}'
          elif mode in ['div','div-one','div-two']:
            b=n(2,9) if mode!='div-two' else n(10,99);c=n(1,9) if mode=='div' else n(2,limit//b);a=b*c
            answer=c;q=f'{a} ÷ {b} = ____';expr=f'{a}/{b}'
          elif mode in ['remainder','remainder-two']:
            b=n(2,9) if mode=='remainder' else n(10,99);c=n(1,9);r=n(1,b-1);a=b*c+r
            answer=f'{c} 余 {r}';q=f'{a} ÷ {b} = ____ 余 ____';expr=None;extra={'dividend':a,'divisor':b,'quotient':c,'remainder':r}
          elif mode=='mixed':
            a,b,c=n(2,limit),n(2,9),n(1,20);op=rng.choice(['+','-']);division=bool(n(0,1));base=a if division else a*b;answer=base+c if op=='+' else base-c
            if answer<0:continue
            q=f'{a*b if division else a} {"÷" if division else "×"} {b} {op} {c} = ____';expr=f'{a*b if division else a}{"/" if division else "*"}{b}{op}{c}'
          elif mode=='brackets':
            a,b,c=n(1,limit),n(1,limit),n(2,9);answer=(a+b)*c;q=f'({a} + {b}) × {c} = ____';expr=f'({a}+{b})*{c}'
          elif mode=='distribute':
            a,b,c=n(2,30),n(10,90),n(1,9);answer=a*(b+c);q=f'{a} × {b} + {a} × {c} = ____';expr=f'{a}*{b}+{a}*{c}'
          elif mode.startswith('decimal'):
            a,b=F(n(1,limit),10),F(n(1,limit),10);operator='+'
            if mode=='decimal-add-two':a,b=F(n(1,limit),100),F(n(1,limit),100)
            if mode in ['decimal-add','decimal-add-two','decimal-review']:
              if n(0,1):a,b=max(a,b),min(a,b);operator='-'
              answer=a+b if operator=='+' else a-b
            elif mode=='decimal-mul-int':b=F(n(2,9));operator='×';answer=a*b
            elif mode=='decimal-mul':operator='×';answer=a*b
            elif mode=='decimal-div':a=a*b;operator='÷';answer=a/b
            else:b=F(rng.choice([10,100]));operator=rng.choice(['×','÷']);answer=a*b if operator=='×' else a/b
            if mode=='decimal-review' and n(0,1):
              operator=rng.choice(['×','÷'])
              if operator=='÷':a=a*b;answer=a/b
              else:answer=a*b
            q=f'{dec(a)} {operator} {dec(b)} = ____';expr=f'({fmt(a)}){operator.replace("×","*").replace("÷","/")}({fmt(b)})';answer=dec(answer)
          elif mode=='equation':
            x=n(1,50);b=n(2,9);a=n(1,100);answer=x;q=f'{b}x + {a} = {b*x+a}，x = ____';expr=None;extra={'coefficient':b,'constant':a,'rhs':b*x+a,'x':x}
          elif mode.startswith('fraction') or mode=='simplify':
            d,e=n(2,limit),n(2,limit);a,b=F(n(1,d-1),d),F(n(1,e-1),e);op='+'
            if mode=='fraction-same':b=F(n(1,d-1),d);a,b=max(a,b),min(a,b);op=rng.choice(['+','-'])
            if mode=='fraction-sub':a,b=max(a,b),min(a,b);op='-'
            if mode=='fraction-mul':op='×'
            if mode=='fraction-div':op='÷'
            if mode=='fraction-review':op=rng.choice(['+','-','×','÷']);a,b=max(a,b),min(a,b)
            answer={'+':a+b,'-':a-b,'×':a*b,'÷':a/b}[op];expr=f'({fmt(a)}){op.replace("×","*").replace("÷","/")}({fmt(b)})';q=f'{fmt(a)} {op} {fmt(b)} = ____'
            if mode=='fraction-same' and answer>1:continue
            if mode in ['fraction-chain','fraction-mixed']:
              c=F(n(1,5),6);op=rng.choice(['+','-']) if mode=='fraction-chain' else rng.choice(['×','÷']);answer={'+':a+b+c,'-':a+b-c,'×':a+b*c,'÷':a+b/c}[op]
              if answer<0:continue
              q=f'{fmt(a)} + {fmt(b)} {op} {fmt(c)} = ____';expr=f'({fmt(a)})+({fmt(b)}){op.replace("×","*").replace("÷","/")}({fmt(c)})'
            if mode=='simplify':k=n(2,9);q=f'约分：{a.numerator*k}/{a.denominator*k} = ____';answer=a;expr=f'{a.numerator*k}/{a.denominator*k}'
            answer=fmt(answer)
          elif mode in ['percent','percent-change']:
            a=n(1,limit//10)*10;b=rng.choice([5,10,15,20,25,30,40,50,60,75,80,90]);answer=F(a*b,100);expr=f'{a}*{b}/100';q=f'{a} 的 {b}% = ____'
            if mode=='percent-change':answer=a+answer;expr=f'{a}*(1+{b}/100)';q=f'{a} 增加 {b}% 后是 ____'
            answer=dec(answer)
          elif mode=='ratio':
            a,b=n(1,limit),n(1,limit);k=n(2,9);r=F(a,b);q=f'化简比：{a*k} : {b*k} = ____';answer=f'{r.numerator} : {r.denominator}';expr=None;extra={'left':a*k,'right':b*k,'reduced':[r.numerator,r.denominator]}
          elif mode=='proportion':
            a,b,k=n(1,limit),n(1,limit),n(2,9);q=f'{a} : {b} = x : {b*k}，x = ____';answer=a*k;expr=f'{a}*{b*k}/{b}'
          else:
            a,b=n(1,20),n(1,100)*1000;q=f'比例尺 1 : {b}，图上 {a} 厘米，实际 ____ 米';answer=F(a*b,100);expr=f'{a}*{b}/100';answer=dec(answer)
          if q in seen:continue
          seen.add(q);items.append({'id':f'q{len(items)+1:03}','text':q,'answer':str(answer),'check':{'expression':expr,**extra},'level':'基础' if order<=2 else '巩固'})
        lessons.append({'grade':grade,'term':term,'title':title,'topic':mode,'order':order,'items':items})
    return lessons
