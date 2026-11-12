import sys,json,pathlib,fitz
root=pathlib.Path(sys.argv[1]);m=json.loads((root/'manifest.json').read_text());doc=fitz.open(root/'The_Ultimate_Life_Organizer.pdf');assert len(doc)==m['pageCount']==156
links=0
for page in doc:
 assert page.rect.width==612 and page.rect.height==792
 assert len(page.get_text().strip())>100
 pix=page.get_pixmap(matrix=fitz.Matrix(.25,.25),alpha=False);assert pix.width>100 and pix.height>100
 for l in page.get_links():
  p=l.get('page');assert 1<=int(p)<=len(doc) if isinstance(p,str) else 0<=p<len(doc)
  links+=1
 for b in page.get_text('dict')['blocks']:
  for ln in b.get('lines',[]):
   for sp in ln['spans']:
    x0,y0,x1,y1=sp['bbox'];assert x0>=30 and x1<=588 and y0>=15 and y1<780
sample=fitz.open(root/'Sample_Preview.pdf');assert len(sample)==9
for page in sample:page.get_pixmap(matrix=fitz.Matrix(.25,.25))
assert links==163
print(json.dumps({'passed':True,'pageCount':len(doc),'renderedPages':len(doc),'internalLinks':links,'samplePages':len(sample),'textBounds':'passed','publication':'awaiting owner review'}))
