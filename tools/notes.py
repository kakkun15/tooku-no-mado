import json,base64
def load(p):
    s=open(p).read(); i=s.index('['); j=s.rindex(']'); return json.loads(s[i:j+1])
def dec(b64, flags):
    b=base64.b64decode(b64); i=0; t=0; out=[]
    def vi():
        nonlocal i
        v=0;s=0
        while True:
            c=b[i]; i+=1; v|=(c&127)<<s; s+=7
            if not c&128: return v
    while i<len(b):
        t+=vi(); d=vi(); p=b[i]; i+=1
        f=0
        if flags: f=b[i]; i+=1
        out.append((t,d,p,f&3,(f>>2)<<1))
    return out
