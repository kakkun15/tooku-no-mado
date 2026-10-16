# 使い方: python3 shot.py out_prefix "scene:hour:weather[:js]" ... (W,H は環境変数 VW,VH)
import asyncio,sys,os
from playwright.async_api import async_playwright
VW=int(os.environ.get('VW',1024)); VH=int(os.environ.get('VH',768)); WAIT=int(os.environ.get('WAIT',1500))
async def main():
    pre=sys.argv[1]
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
        ctx=await b.new_context(viewport={'width':VW,'height':VH})
        errs=[]
        for i,job in enumerate(sys.argv[2:]):
            parts=job.split(':',3); sc,hr,wt=parts[:3]; js=parts[3] if len(parts)>3 else ''
            pg=await ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
            await pg.add_init_script("localStorage.setItem('tooku-prefs-v1', JSON.stringify({volOk:true}))")
            await pg.goto(f'http://localhost:8765/?scene={sc}&hour={hr}&weather={wt}'); await pg.wait_for_timeout(600)
            await pg.evaluate("document.getElementById('start').style.display='none'")
            if js: await pg.evaluate(js)
            await pg.wait_for_timeout(WAIT)
            await pg.locator('#view').screenshot(path=f'{pre}_{i}_{sc}_{wt}.png')
            await pg.close()
        print('errors',errs)
        await b.close()
asyncio.run(main())
