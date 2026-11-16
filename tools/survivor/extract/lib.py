import sys
sys.path.insert(0,'/tmp/claude-0/-home-claude/b4ae001b-90c3-5005-a8fb-7340efba5a8d/scratchpad/sv/stub')
sys.path.insert(0,'/home/claude/work/render');sys.path.insert(0,'/home/claude/leonmax78.github.io/tools')
import szo_tool_fixed as T
from npc_shop_dialogs import read_archive,extract
from pathlib import Path
PAKS={'d1':'/mnt/user-data/uploads/神州Online/data1.pak','d2':'/mnt/user-data/uploads/Desktop/SZO_27000_HD/SZOnline/data2.pak','d8':'/mnt/user-data/uploads/神州Online/data8.pak','up':'/mnt/user-data/uploads/神州Online/update.pak'}
_c={}
def pak(k):
    if k not in _c:
        d=open(PAKS[k],'rb').read(); _c[k]=(d,{r['name'].replace('\\','/'):r for r in read_archive(d)})
    return _c[k]
TMP='/tmp/claude-0/-home-claude/b4ae001b-90c3-5005-a8fb-7340efba5a8d/scratchpad/sv/tmp.bin'
def frames(k,name):
    d,ns=pak(k); open(TMP,'wb').write(extract(d,ns[name]))
    return T.load_shape(Path(TMP+'') if False else Path(TMP).rename(Path(TMP).with_suffix('.'+name.rsplit('.',1)[-1])) )
