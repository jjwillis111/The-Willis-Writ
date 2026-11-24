import sys, glob
from PIL import Image, ImageDraw
def sheet(files, crop, out, cols=6, scale=0.5):
    ims=[]
    for f in files:
        im=Image.open(f).convert('RGB').crop(crop)
        im=im.resize((int(im.width*scale), int(im.height*scale)), Image.LANCZOS)
        d=ImageDraw.Draw(im); d.rectangle([0,0,44,13],fill=(0,0,0)); d.text((2,1),f.split('_')[-1][:3],fill=(255,255,0))
        ims.append(im)
    w,h=ims[0].size; rows=(len(ims)+cols-1)//cols
    S=Image.new('RGB',(cols*w,rows*h),(40,40,40))
    for k,im in enumerate(ims): S.paste(im,((k%cols)*w,(k//cols)*h))
    S.save(out)
if __name__=='__main__':
    d=sys.argv[1]; tag=sys.argv[2]; a=int(sys.argv[3]); b=int(sys.argv[4]); step=int(sys.argv[5])
    crop=tuple(int(x) for x in sys.argv[6].split(',')); out=sys.argv[7]; sc=float(sys.argv[8]) if len(sys.argv)>8 else 0.5
    files=['%s/%s_%03d.png'%(d,tag,i) for i in range(a,b,step)]
    sheet(files,crop,out,scale=sc)
