import React from 'react';
import ReactDOM from 'react-dom/client';
import charConfig from './character-config';
import layerConfig from './oc-layers';

const { useState, useEffect, useRef, useMemo } = React;

// ぐるぐる = 2モード:
//   ・active(マウス追従) … 差分シートで顔ごと向ける(25方向)
//   ・idle(待機)        … See-through 分层立绘 ＋ 微表情(瞳の随机看/まばたき/
//                          挑眉/髪揺れ/首かしげ/呼吸/上下ゆれ/口型)
//   マウスが動けば active、idleDelay 秒静止で idle。両モードを opacity で crossfade。
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "followRange": 340,
  "smoothing": 0.3,
  "idleDelay": 1.6,
  "eyeOn": true,     "eyeAmp": 4,
  "blinkOn": true,
  "browOn": true,    "browAmp": 1.2,  "browDur": 7,
  "hairOn": true,    "hairAmp": 2,    "hairDur": 3.6,
  "tiltOn": true,    "tiltAmp": 4,    "tiltDur": 4,
  "swayOn": false,   "swayAmp": 1.5,  "swayDur": 6,
  "breatheOn": true, "breatheDur": 4,
  "bobOn": true,
  "talkOn": false,
  "charSize": 48,
  "bgColor": "#FFF8EE",
  "showDebug": false
}/*EDITMODE-END*/;

const { rows: ROWS, cols: COLS } = charConfig;
const SRC = (r, c) => charConfig.src(charConfig.sheets.eyesOpen.close, r, c);
const BLINK_SRC = (r, c) => charConfig.src(charConfig.sheets.eyesClosed.close, r, c);

const MOUTH_MID = 'mouth_mid';
const MOUTH_ORIGIN = '48% 49%';

const BG_OPTIONS = ['#FFF8EE', '#FDEFEF', '#EEF4FB', '#2B2926'];

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

// 分层をグループに振り分け（奥行き順を保持）— oc-live と同じ
function bucketize(layers) {
  const backhair = [], body = [], headPre = [], eyes = [], headPost = [];
  let seenEye = false;
  for (const ly of layers) {
    if (ly.group === 'backhair') backhair.push(ly);
    else if (ly.group === 'body') body.push(ly);
    else if (ly.group === 'eyes') { eyes.push(ly); seenEye = true; }
    else (seenEye ? headPost : headPre).push(ly);
  }
  return { backhair, body, headPre, eyes, headPost };
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [cell, setCell] = useState({ r: 2, c: 2 });
  const [pressed, setPressed] = useState(false);
  const [blink, setBlink] = useState(false);
  const [isIdle, setIsIdle] = useState(false);

  const stageRef = useRef(null);
  const charRef = useRef(null);
  const target = useRef({ x: 0, y: 0 });    // sheet追従の目標 -1..1
  const current = useRef({ x: 0, y: 0 });   // 平滑後
  const lastMove = useRef(0);               // 最後にマウスが動いた時刻(ms)
  const isIdleRef = useRef(false);
  const gazeSac = useRef({ x: 0, y: 0 });   // idle: 瞳の随机看(saccade)
  const gazeCur = useRef({ x: 0, y: 0 });
  const mouthOpen = useRef(0);              // idle: 口の開口度(平滑後)
  const mouthTarget = useRef(0);
  const tweaksRef = useRef(t);
  tweaksRef.current = t;

  // マウス追従（active）+ idle を抜ける
  useEffect(() => {
    function onMove(e) {
      const el = charRef.current;
      if (!el) return;
      lastMove.current = performance.now();
      if (isIdleRef.current) { isIdleRef.current = false; setIsIdle(false); }
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height * 0.45;
      const range = tweaksRef.current.followRange;
      target.current.x = clamp((e.clientX - cx) / range, -1, 1);
      target.current.y = clamp((e.clientY - cy) / range, -1, 1);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerdown', onMove);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
    };
  }, []);

  // メインループ: idle判定 / sheet平滑+切替 / 瞳saccade / 口型平滑 を CSS変数へ
  useEffect(() => {
    let raf;
    let last = { r: 2, c: 2 };
    const SMOOTH = 0.16;
    function tick(now) {
      const tw = tweaksRef.current;
      if (!lastMove.current) lastMove.current = now;   // 起動直後の基準
      const idle = (now - lastMove.current) / 1000 > tw.idleDelay;
      if (idle !== isIdleRef.current) { isIdleRef.current = idle; setIsIdle(idle); }

      // idle に入ったら sheet 側は正面(0,0)へ戻す → 分层立绘(正面)と揃って crossfade が滑らか
      if (idle) {
        target.current.x += (0 - target.current.x) * 0.06;
        target.current.y += (0 - target.current.y) * 0.06;
      }
      const k = tw.smoothing;
      current.current.x += (target.current.x - current.current.x) * k;
      current.current.y += (target.current.y - current.current.y) * k;
      const c = clamp(Math.round((current.current.x + 1) / 2 * (COLS - 1)), 0, COLS - 1);
      const r = clamp(Math.round((current.current.y + 1) / 2 * (ROWS - 1)), 0, ROWS - 1);
      if (r !== last.r || c !== last.c) { last = { r, c }; setCell(last); }

      // idle: 瞳の随机看（saccade）→ --gaze-x/y
      const on = tw.eyeOn;
      const dx = on ? gazeSac.current.x : 0;
      const dy = on ? gazeSac.current.y : 0;
      gazeCur.current.x += (dx - gazeCur.current.x) * SMOOTH;
      gazeCur.current.y += (dy - gazeCur.current.y) * SMOOTH;

      // idle: 口型 開口度を目標へ平滑
      mouthOpen.current += (mouthTarget.current - mouthOpen.current) * 0.35;

      const el = stageRef.current;
      if (el) {
        el.style.setProperty('--gaze-x', gazeCur.current.x.toFixed(4));
        el.style.setProperty('--gaze-y', gazeCur.current.y.toFixed(4));
        el.style.setProperty('--mouth-open', mouthOpen.current.toFixed(4));
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // saccade: たまに瞳をピッと逸らして戻す（idle中の「随机看」の素）
  useEffect(() => {
    let alive = true, timer;
    const rand = (a, b) => a + Math.random() * (b - a);
    function flick() {
      if (!alive) return;
      gazeSac.current.x = rand(-0.5, 0.5);
      gazeSac.current.y = rand(-0.35, 0.35);
      timer = setTimeout(() => {
        if (!alive) return;
        gazeSac.current.x = 0; gazeSac.current.y = 0;
        schedule();
      }, rand(500, 1100));
    }
    function schedule() { if (!alive) return; timer = setTimeout(flick, rand(900, 2600)); }
    schedule();
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  // 自動まばたき（自然なゆらぎ）— sheet/分层 両モード共用
  useEffect(() => {
    if (!t.blinkOn) { setBlink(false); return; }
    let alive = true, timer;
    const rand = (a, b) => a + Math.random() * (b - a);
    function blinkOnce(dur, after) {
      setBlink(true);
      timer = setTimeout(() => {
        if (!alive) return;
        setBlink(false);
        timer = setTimeout(after, rand(120, 220));
      }, dur);
    }
    function doBlink() {
      if (!alive) return;
      const roll = Math.random();
      if (roll < 0.22) blinkOnce(rand(80, 120), () => { if (alive) blinkOnce(rand(70, 110), schedule); });
      else if (roll < 0.28) blinkOnce(rand(260, 420), schedule);
      else blinkOnce(rand(90, 150), schedule);
    }
    function schedule() {
      if (!alive) return;
      const u = Math.random();
      let wait;
      if (u < 0.15) wait = rand(400, 900);
      else if (u < 0.85) wait = rand(1000, 2600);
      else wait = rand(2600, 5000);
      timer = setTimeout(doBlink, wait);
    }
    schedule();
    return () => { alive = false; clearTimeout(timer); };
  }, [t.blinkOn]);

  // ランダム口パク（idle・demo）。目標開口度を小刻みに → rAF が連続補間
  useEffect(() => {
    if (!t.talkOn) { mouthTarget.current = 0; return; }
    let alive = true, timer;
    const rand = (a, b) => a + Math.random() * (b - a);
    function step() {
      if (!alive) return;
      mouthTarget.current = Math.random() < 0.15 ? 0 : rand(0.35, 1);
      timer = setTimeout(step, rand(70, 160));
    }
    step();
    return () => { alive = false; clearTimeout(timer); mouthTarget.current = 0; };
  }, [t.talkOn]);

  const frames = useMemo(() => {
    const arr = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) arr.push({ r, c });
    return arr;
  }, []);

  const dark = t.bgColor === '#2B2926';
  const inkColor = dark ? 'rgba(255,248,238,0.85)' : 'rgba(60,48,38,0.8)';
  const subColor = dark ? 'rgba(255,248,238,0.45)' : 'rgba(60,48,38,0.45)';

  const sizeVmin = t.charSize * 4 / 3;
  const { backhair, body, headPre, eyes, headPost } = bucketize(layerConfig.layers);

  // 微動の強さ/速さ・視線量をコンテナへ流す
  const rootVars = {
    '--hair-dur': `${t.hairDur}s`,
    '--breathe-dur': `${t.breatheDur}s`,
    '--tilt-amp': `${t.tiltAmp}deg`,    '--tilt-dur': `${t.tiltDur}s`,
    '--sway-amp': `${t.swayAmp}deg`,    '--sway-dur': `${t.swayDur}s`,
    '--eye-amp-x': `${(t.eyeAmp * 0.16).toFixed(3)}%`,
    '--eye-amp-y': `${(t.eyeAmp * 0.10).toFixed(3)}%`,
    '--brow-amp': `${(t.browAmp * 0.55).toFixed(3)}%`, '--brow-dur': `${t.browDur}s`,
  };

  // ── 分层(idle)レンダラ — oc-live と同じ構造 ──
  const fill = { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' };
  const hide = (e) => { e.currentTarget.style.opacity = 0; };
  const renderLayer = (ly) => {
    if (ly.id === 'mouth') {
      // 閉口を底に、中口を scaleY で連続開閉（--mouth-open を rAF が駆動）
      return (
        <React.Fragment key={ly.id}>
          <img src={layerConfig.src('mouth')} alt="" draggable="false" style={fill} onError={hide}></img>
          <img src={layerConfig.src(MOUTH_MID)} alt="" draggable="false"
            style={{ ...fill, transformOrigin: MOUTH_ORIGIN, transform: 'scaleY(var(--mouth-open, 0))', willChange: 'transform' }}
            onError={hide}></img>
        </React.Fragment>
      );
    }
    const style = { ...fill };
    let cls = '';
    if (ly.hair && t.hairOn) {
      cls = 'ly-hair';
      style['--hair-amp'] = `calc(${t.hairAmp}deg * ${ly.hair.amp ?? 1})`;
      if (ly.hair.phase) style.animationDelay = `${-ly.hair.phase}s`;
    } else if (ly.brow && t.browOn) {
      cls = 'ly-brow';
    }
    return (
      <img key={ly.id} className={cls} src={layerConfig.src(ly.file)} alt="" draggable="false"
        style={style} onError={hide}></img>
    );
  };
  const wrapL = (on, cls, children, key) => (
    <div key={key} className={on ? cls : ''} style={{ position: 'absolute', inset: 0 }}>{children}</div>
  );
  // 目: 瞳(eyemove)だけ視線方向へ、まつ毛は固定。まばたきは目グループを縦に潰す
  const eyeNode = eyes.length ? (
    <div key="eyes" className={`ly-eyes${blink ? ' blinking' : ''}`} style={{ position: 'absolute', inset: 0 }}>
      {eyes.map((ly) => ly.eyemove
        ? wrapL(t.eyeOn, 'ly-eyemove', renderLayer(ly), `em-${ly.id}`)
        : renderLayer(ly))}
    </div>
  ) : null;
  const headNode = wrapL(t.tiltOn, 'ly-tilt',
    [...headPre.map(renderLayer), eyeNode, ...headPost.map(renderLayer)], 'head');
  const backHairNode = wrapL(t.tiltOn, 'ly-tilt', backhair.map(renderLayer), 'backhair-tilt');
  const liveLayers = wrapL(t.breatheOn, 'ly-breathe',
    wrapL(t.swayOn, 'ly-sway', [backHairNode, ...body.map(renderLayer), headNode], 'sway'), 'breathe');

  const fadeT = 'opacity 0.45s ease';

  return (
    <div
      ref={stageRef}
      style={{
        position: 'fixed', inset: 0, background: t.bgColor,
        overflow: 'hidden', transition: 'background 0.4s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', cursor: 'crosshair',
        fontFamily: "'Zen Maru Gothic', sans-serif", ...rootVars
      }}
    >
      <div
        ref={charRef}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        style={{
          position: 'relative',
          width: `${sizeVmin}vmin`, height: `${sizeVmin}vmin`,
          maxWidth: 1200, maxHeight: 1200,
          userSelect: 'none', touchAction: 'none'
        }}
      >
        {/* 上下ゆれは両モード共用で一番外に */}
        <div className={t.bobOn ? 'bob' : ''} style={{ position: 'absolute', inset: 0 }}>
          {/* active: 差分シート(顔ごと追従) */}
          <div style={{
            position: 'absolute', inset: 0, opacity: isIdle ? 0 : 1,
            transition: fadeT,
            transform: pressed ? 'scale(0.94)' : 'scale(1)',
          }}>
            {frames.map(({ r, c }) => (
              <img key={`${r}-${c}`} src={SRC(r, c)} alt="" draggable="false"
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  opacity: r === cell.r && c === cell.c ? 1 : 0, pointerEvents: 'none'
                }}></img>
            ))}
            {blink ? (
              <img src={BLINK_SRC(cell.r, cell.c)} alt="" draggable="false"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}></img>
            ) : null}
          </div>

          {/* idle: See-through 分层立绘 ＋ 微表情 */}
          <div style={{ position: 'absolute', inset: 0, opacity: isIdle ? 1 : 0, transition: fadeT, pointerEvents: 'none' }}>
            {liveLayers}
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: '4.5vh', left: 0, right: 0,
        textAlign: 'center', pointerEvents: 'none'
      }}>
        <div style={{ fontSize: 'clamp(18px, 2.4vmin, 26px)', fontWeight: 700, color: inkColor, letterSpacing: '0.18em' }}>私はもう十分可愛いもの、これ以上は世界が危険よ</div>
        <div style={{ fontSize: 'clamp(12px, 1.6vmin, 16px)', color: subColor, marginTop: 6, letterSpacing: '0.08em' }}>マウスを動かすと こっちを見る・放っておくと ひとりで過ごすよ</div>
      </div>

      <a href="talk.html" style={{
        position: 'absolute', top: 18, right: 18, fontSize: 13, fontWeight: 700,
        color: subColor, textDecoration: 'none', letterSpacing: '0.06em'
      }}>口パク版 →</a>

      {t.showDebug ? (
        <div style={{
          position: 'absolute', top: 16, left: 16,
          background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 10,
          padding: '10px 12px', fontSize: 12, fontFamily: 'ui-monospace, monospace',
          pointerEvents: 'none', lineHeight: 1.5
        }}>
          <div>{isIdle ? 'IDLE (分层)' : 'ACTIVE (sheet)'} · row {cell.r} / col {cell.c}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 14px)', gap: 3, marginTop: 6 }}>
            {frames.map(({ r, c }) => (
              <div key={`d${r}-${c}`} style={{
                width: 14, height: 14, borderRadius: 3,
                background: r === cell.r && c === cell.c ? '#FFB13D' : 'rgba(255,255,255,0.22)'
              }}></div>
            ))}
          </div>
        </div>
      ) : null}

      <TweaksPanel>
        <TweakSection label="追従（マウス）"></TweakSection>
        <TweakSlider label="追従範囲" value={t.followRange} min={120} max={1200} step={10} unit="px"
          onChange={(v) => setTweak('followRange', v)}></TweakSlider>
        <TweakSlider label="追従速度" value={t.smoothing} min={0.04} max={0.5} step={0.01}
          onChange={(v) => setTweak('smoothing', v)}></TweakSlider>
        <TweakSlider label="待機までの時間" value={t.idleDelay} min={0.5} max={8} step={0.1} unit="s"
          onChange={(v) => setTweak('idleDelay', v)}></TweakSlider>

        <TweakSection label="待機の微表情（分层）"></TweakSection>
        <TweakToggle label="瞳の随机看" value={t.eyeOn}
          onChange={(v) => setTweak('eyeOn', v)}></TweakToggle>
        <TweakSlider label="瞳の動き量" value={t.eyeAmp} min={0} max={10} step={0.5}
          onChange={(v) => setTweak('eyeAmp', v)}></TweakSlider>
        <TweakToggle label="まばたき" value={t.blinkOn}
          onChange={(v) => setTweak('blinkOn', v)}></TweakToggle>
        <TweakToggle label="挑眉" value={t.browOn}
          onChange={(v) => setTweak('browOn', v)}></TweakToggle>
        <TweakSlider label="挑眉 強さ" value={t.browAmp} min={0} max={3} step={0.1}
          onChange={(v) => setTweak('browAmp', v)}></TweakSlider>
        <TweakSlider label="挑眉 速さ" value={t.browDur} min={3} max={12} step={0.5} unit="s"
          onChange={(v) => setTweak('browDur', v)}></TweakSlider>
        <TweakToggle label="髪揺れ" value={t.hairOn}
          onChange={(v) => setTweak('hairOn', v)}></TweakToggle>
        <TweakSlider label="髪揺れ 強さ" value={t.hairAmp} min={0} max={6} step={0.2} unit="°"
          onChange={(v) => setTweak('hairAmp', v)}></TweakSlider>
        <TweakSlider label="髪揺れ 速さ" value={t.hairDur} min={1.5} max={8} step={0.1} unit="s"
          onChange={(v) => setTweak('hairDur', v)}></TweakSlider>
        <TweakToggle label="首かしげ" value={t.tiltOn}
          onChange={(v) => setTweak('tiltOn', v)}></TweakToggle>
        <TweakSlider label="首かしげ 強さ" value={t.tiltAmp} min={0} max={8} step={0.2} unit="°"
          onChange={(v) => setTweak('tiltAmp', v)}></TweakSlider>
        <TweakSlider label="首かしげ 速さ" value={t.tiltDur} min={2} max={9} step={0.1} unit="s"
          onChange={(v) => setTweak('tiltDur', v)}></TweakSlider>
        <TweakToggle label="体ゆれ" value={t.swayOn}
          onChange={(v) => setTweak('swayOn', v)}></TweakToggle>
        <TweakSlider label="体ゆれ 強さ" value={t.swayAmp} min={0} max={5} step={0.2} unit="°"
          onChange={(v) => setTweak('swayAmp', v)}></TweakSlider>
        <TweakSlider label="体ゆれ 速さ" value={t.swayDur} min={3} max={10} step={0.1} unit="s"
          onChange={(v) => setTweak('swayDur', v)}></TweakSlider>
        <TweakToggle label="呼吸" value={t.breatheOn}
          onChange={(v) => setTweak('breatheOn', v)}></TweakToggle>
        <TweakSlider label="呼吸 速さ" value={t.breatheDur} min={2} max={8} step={0.1} unit="s"
          onChange={(v) => setTweak('breatheDur', v)}></TweakSlider>
        <TweakToggle label="上下ゆれ" value={t.bobOn}
          onChange={(v) => setTweak('bobOn', v)}></TweakToggle>
        <TweakToggle label="口パク（待機中）" value={t.talkOn}
          onChange={(v) => setTweak('talkOn', v)}></TweakToggle>

        <TweakSection label="見た目"></TweakSection>
        <TweakSlider label="キャラサイズ" value={t.charSize} min={30} max={92} unit="vmin"
          onChange={(v) => setTweak('charSize', v)}></TweakSlider>
        <TweakColor label="背景色" value={t.bgColor} options={BG_OPTIONS}
          onChange={(v) => setTweak('bgColor', v)}></TweakColor>
        <TweakSection label="デバッグ"></TweakSection>
        <TweakToggle label="グリッド表示" value={t.showDebug}
          onChange={(v) => setTweak('showDebug', v)}></TweakToggle>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App></App>);
