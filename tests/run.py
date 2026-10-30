import sys, time, json
from playwright.sync_api import sync_playwright
URL = 'http://localhost:8765/index.html'
OUT = '/workspace/superman-visor/screens/'
FPS = """(ms) => new Promise(res => { const f0=VISOR.st.frames, t0=performance.now(); setTimeout(()=>res(+((VISOR.st.frames-f0)*1000/(performance.now()-t0)).toFixed(1)), ms); })"""
MODES = ['normal','heat','xray','telescopic','microscopic','night','solar']
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
        if engine != 'desktop':
            shot('00-boot-standby')
            pg.click('#bootGo'); time.sleep(0.95); shot('01-boot-shards')
            time.sleep(1.65); shot('02-boot-shield')
            time.sleep(2.6)
        else:
            pg.click('#bootSkipBtn'); time.sleep(1)
        pg.click('#camStart'); time.sleep(2.5)
        r['camera_live'] = pg.evaluate('VISOR.vision.live')
        for i, m in enumerate(MODES):
            pg.click(f'#modes button[data-mode="{i}"]'); time.sleep(1.0)
            r['fps'][m] = pg.evaluate(f'({FPS})(2000)')
            if engine != 'desktop' or m in ('heat',): shot(f'1{i}-mode-{m}')
        # heat beam
        pg.click('#modes button[data-mode="1"]'); time.sleep(0.4)
        if engine == 'desktop': pg.mouse.click(900, 380)
        else: pg.touchscreen.tap(250, 360)
        pg.evaluate('VISOR.startFire()'); time.sleep(0.7)
        r['fps']['heat_firing'] = pg.evaluate(f'({FPS})(1000)')
        shot('20-heat-beam-firing'); pg.evaluate('VISOR.endFire()'); time.sleep(0.3)
        r['energy_after_fire'] = round(pg.evaluate('VISOR.st.energy'))
        if engine == 'desktop':
            pg.click('#modes button[data-mode="6"]'); time.sleep(1); shot('21-solar'); 
            pg.click('#tabs button[data-tab="fortress"]'); pg.wait_for_function('VISOR.holoReady', timeout=20000); time.sleep(2); shot('22-fortress')
            results[engine] = r; r['errors'] = errs; b.close(); return
        # telescopic pinch-ish via slider + photo
        pg.click('#modes button[data-mode="3"]'); pg.evaluate('VISOR.setZoom(12)'); time.sleep(0.6); shot('21-telescopic-12x')
        pg.click('#modes button[data-mode="2"]'); time.sleep(0.6)
        pg.click('#btnShot'); time.sleep(1.2); r['photo_bytes'] = pg.evaluate('window.__lastPhotoBytes||0'); shot('22-photo-capture'); pg.click('#photoClose')
        # tabs
        pg.click('#tabs button[data-tab="fortress"]'); pg.wait_for_function('VISOR.holoReady', timeout=20000); time.sleep(1.5)
        box = pg.locator('#holo').bounding_box(); cx, cy = box['x']+box['width']/2, box['y']+box['height']/2
        pg.mouse.move(cx, cy); pg.mouse.down(); pg.mouse.move(cx+120, cy+20, steps=8); pg.mouse.up(); time.sleep(0.5)
        r['fps']['fortress'] = pg.evaluate(f'({FPS})(2000)'); shot('30-fortress-hologram')
        pg.click('#holoPulse'); time.sleep(0.25); shot('31-fortress-resonate')
        pg.click('#tabs button[data-tab="hearing"]'); pg.click('#earStart'); time.sleep(2)
        r['mic_live'] = pg.evaluate("document.querySelector('#earStatus').textContent")
        r['fps']['hearing'] = pg.evaluate(f'({FPS})(2000)'); shot('40-super-hearing')
        pg.click('#tabs button[data-tab="flight"]'); time.sleep(1.5); pg.click('#flyBoost'); time.sleep(0.8)
        r['fps']['flight'] = pg.evaluate(f'({FPS})(2000)'); shot('50-flight-mode')
        pg.click('#tabs button[data-tab="glyphs"]'); pg.fill('#glyphIn', 'Hello Nick - up up and away'); pg.dispatch_event('#glyphIn', 'input'); time.sleep(0.4); shot('60-translator')
        pg.click('#glyphSpeak'); time.sleep(0.5)
        pg.click('#tabs button[data-tab="log"]'); pg.fill('#logIn', 'Spotted unusual heat signature near the Daily skyline. Investigating.'); pg.click('#logAdd'); time.sleep(0.3); shot('70-mission-log')
        r['log_entries'] = pg.evaluate("JSON.parse(localStorage.getItem('nickVisorLog')).length")
        pg.click('#tabs button[data-tab="settings"]'); time.sleep(1.2); shot('80-settings')
        pg.click('#themes button[data-theme="kryptonite"]'); pg.click('#tabs button[data-tab="vision"]'); pg.click('#modes button[data-mode="5"]'); time.sleep(1); shot('81-theme-kryptonite-night')
        pg.click('#tabs button[data-tab="settings"]'); pg.click('#qualSeg button[data-q="saver"]'); pg.click('#tabs button[data-tab="vision"]'); time.sleep(1.5)
        r['fps']['saver_mode'] = pg.evaluate(f'({FPS})(2000)')
        r['governor'] = pg.evaluate("document.querySelector('#govRead').textContent")
        r['errors'] = errs; results[engine] = r; b.close()
    for e in which: run(e)
print(json.dumps(results, indent=1))
