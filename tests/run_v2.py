import sys, time, json
from playwright.sync_api import sync_playwright
URL = 'http://localhost:8765/index.html'
OUT = '/workspace/superman-visor/screens_v2/'
FPS = """(ms) => new Promise(res => { const f0=VISOR.st.frames, t0=performance.now(); setTimeout(()=>res(+((VISOR.st.frames-f0)*1000/(performance.now()-t0)).toFixed(1)), ms); })"""
MODES = ['normal','heat','xray','telescopic','microscopic','night','solar','ir','uv','em','motion','speed','kryptonite']
which = sys.argv[1:] or ['chromium','webkit','desktop']
results = {}
with sync_playwright() as p:
    def run(engine):
        errs = []
        bt = p.chromium if engine != 'webkit' else p.webkit
        args = ['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader'] if bt is p.chromium else []
        b = bt.launch(args=args)
        if engine == 'desktop':
            ctx = b.new_context(viewport={'width':1440,'height':900}, device_scale_factor=1, permissions=['camera','microphone'])
        else:
            dev = dict(p.devices['iPhone 15 Pro Max']); dev.pop('default_browser_type', None)
            dev.update(viewport={'width':430,'height':932}, screen={'width':430,'height':932}, device_scale_factor=3, is_mobile=True, has_touch=True)
            ctx = b.new_context(**dev, **({'permissions':['camera','microphone']} if engine=='chromium' else {}))
        pg = ctx.new_page()
        pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errs.append(f'pageerror: {e}'))
        pg.goto(URL); time.sleep(1.2)
        tag = 'iphone-' + engine if engine != 'desktop' else 'desktop'
        r = {'fps': {}}
        shot = lambda name: pg.screenshot(path=f'{OUT}{tag}-{name}.png')
        ev = lambda js: pg.evaluate(js)
        if engine != 'desktop':
            pg.click('#bootGo'); time.sleep(1.6); shot('01-boot'); time.sleep(3.6)
        else:
            pg.click('#bootSkipBtn'); time.sleep(1)
        # demo city first (no camera)
        pg.click('#camStart') if engine == 'desktop' else ev("document.querySelector('#camPrompt').classList.add('hidden')")
        time.sleep(1)
        for i, m in enumerate(MODES):
            ev(f'VISOR.setMode({i})'); time.sleep(0.9)
            r['fps'][m] = ev(f'({FPS})(1500)')
            if engine != 'desktop' or m in ('normal','heat','kryptonite','em'): shot(f'1{i:02d}-mode-{m}')
        r['governor'] = ev("document.querySelector('#govRead').textContent")
        # powers
        cx, cy = (720, 400) if engine == 'desktop' else (215, 360)
        for k in ['freeze','breath','punch','speed']:
            ev(f'VISOR.setMode(0)'); time.sleep(0.3); ev(f"VISOR.st.energy=100; VISOR.usePower('{k}',{cx},{cy})"); time.sleep(0.35); shot(f'2-power-{k}'); time.sleep(0.8)
        # game
        ev('VISOR.st.power=null; VISOR.startGame()'); time.sleep(4); shot('30-rescue-game')
        r['game_running'] = ev('VISOR.game.running'); ev("VISOR.setPower('breath')")
        r['fps']['game'] = ev(f'({FPS})(1500)'); ev('VISOR.game.end(); VISOR.setPower("breath")')
        # heat firing
        ev('VISOR.setMode(1)'); time.sleep(0.3); ev('VISOR.startFire()'); time.sleep(0.6); r['fps']['heat_firing'] = ev(f'({FPS})(1000)'); shot('31-heat-firing'); ev('VISOR.endFire()')
        # camera + tracking
        if engine != 'webkit':
            pg.evaluate("document.querySelector('#camStart').click()") if engine!='desktop' else None
            ev("document.querySelector('#btnFlip').click()"); time.sleep(2.5); r['camera_live'] = ev('VISOR.vision.live')
            ev('VISOR.setMode(9)'); time.sleep(1); shot('40-live-em')
            r['fps']['live_em'] = ev(f'({FPS})(1500)')
        # record
        ev('VISOR.setMode(0)'); ev('VISOR.toggleRec()'); time.sleep(2.2); r['recording'] = ev('VISOR.recording'); ev('VISOR.toggleRec()'); time.sleep(1.5)
        r['rec_bytes'] = ev('window.__lastRecBytes||0'); r['rec_type'] = ev('window.__lastRecType||""'); shot('41-rec-preview')
        ev("document.querySelector('#photoClose').click()")
        ev('VISOR.capture()'); time.sleep(1.2); r['photo_bytes'] = ev('window.__lastPhotoBytes||0'); ev("document.querySelector('#photoClose').click()")
        # panels
        ev("VISOR.setTab('fortress')"); pg.wait_for_function('VISOR.holoReady', timeout=30000); time.sleep(2); r['fps']['fortress'] = ev(f'({FPS})(1500)'); shot('50-fortress')
        ev("document.querySelector('#holoPulse').click()"); time.sleep(0.25); shot('51-fortress-pulse')
        ev("VISOR.setTab('hearing')"); ev("document.querySelector('#earStart').click()"); time.sleep(1.5); r['fps']['hearing'] = ev(f'({FPS})(1000)'); shot('52-hearing')
        ev("VISOR.setTab('flight')"); time.sleep(1); r['fps']['flight'] = ev(f'({FPS})(1000)'); shot('53-flight')
        ev("VISOR.setTab('missions')"); time.sleep(0.8); shot('54-missions'); r['xp'] = ev('VISOR.xp.state.xp'); r['ach'] = ev('Object.keys(VISOR.xp.state.ach).length')
        ev("VISOR.setTab('gallery')"); time.sleep(1.2); shot('55-gallery'); r['gallery'] = ev('document.querySelectorAll("#galGrid button").length')
        ev("VISOR.setTab('weather')"); time.sleep(2.5); shot('56-weather'); r['weather'] = ev('VISOR.wx && VISOR.wx.src')
        ev("VISOR.setTab('glyphs')"); pg.fill('#glyphIn', 'Up up and away'); ev("VISOR.inscribe()"); time.sleep(0.9); shot('57-glyph-inscribe')
        ev("VISOR.setTab('more')"); time.sleep(0.4); shot('58-more-sheet'); ev("VISOR.setTab('settings')"); time.sleep(0.6); shot('59-settings')
        ev("VISOR.setLayout('cinema')"); ev("VISOR.setTab('vision')"); ev('VISOR.setMode(7)'); time.sleep(1); shot('60-cinema-ir'); ev("VISOR.setLayout('full')")
        r['errors'] = errs; results[engine] = r; b.close()
    for e in which: run(e)
print(json.dumps(results, indent=1))
