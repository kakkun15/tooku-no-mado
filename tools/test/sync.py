import asyncio,sys
from playwright.async_api import async_playwright
S=sys.argv[1]; mock=open(__file__.rsplit('/',1)[0]+'/mock.js').read()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args=['--autoplay-policy=no-user-gesture-required'])
        ctx=await b.new_context(viewport={'width':900,'height':650})
        await ctx.add_init_script(mock); await ctx.add_init_script("localStorage.setItem('tooku-prefs-v1', JSON.stringify({volOk:true}))")
        errs=[]
        A=await ctx.new_page(); A.on('pageerror',lambda e:errs.append('A '+str(e)))
        await A.goto('http://localhost:8765/'); await A.wait_for_timeout(600); await A.click('#go'); await A.wait_for_timeout(500)
        await A.evaluate("TookuRoom.host()"); await A.wait_for_timeout(800)
        code=await A.evaluate("TookuRoom.state().code"); print('code',code)
        await A.evaluate("TookuPlayer.playPiece('elise')"); await A.wait_for_timeout(4000)
        B=await ctx.new_page(); B.on('pageerror',lambda e:errs.append('B '+str(e)))
        await B.goto('http://localhost:8765/'); await B.wait_for_timeout(600); await B.click('#go'); await B.wait_for_timeout(500)
        await B.evaluate(f"TookuRoom.join('{code}')"); await B.wait_for_timeout(9000)
        q="(()=>{const s=TookuPlayer.state();return [s.piece&&s.piece.id,s.family,Math.round(s.pos*10)/10,s.playing,TookuStage.info().id]})()"
        print('A',await A.evaluate(q)); print('B',await B.evaluate(q))
        print('B next blocked:', await B.evaluate("TookuStage.next()"), await B.evaluate("TookuStage.pick('desert')"))
        await A.evaluate("TookuStage.pick('desert')"); await A.evaluate("TookuPlayer.playPiece('air')"); await A.wait_for_timeout(9000)
        print('A',await A.evaluate(q)); print('B',await B.evaluate(q))
        await B.evaluate("TookuPlayer.skip()"); await B.wait_for_timeout(500); print('B after skip', await B.evaluate(q))
        await B.mouse.move(450,300); await B.mouse.move(460,310); await B.wait_for_timeout(200); await B.evaluate("document.getElementById('bMusic').click()"); await B.wait_for_timeout(800)
        await B.screenshot(path=S+'/guest_scene.png')
        print(errs)
        await b.close()
asyncio.run(main())
