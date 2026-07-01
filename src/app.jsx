import React from 'react';
import ReactDOM from 'react-dom/client';
import WallPage from './wall/WallPage';

// guruguru.html のエントリ。OC の実描画（追従/微表情）は src/oc-portrait.jsx、
// 壁面レイアウトは src/wall/ 以下に分離済み。ここは Tweaks 状態を持って
// WallPage に渡すだけの薄い殻。
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
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
  "showDebug": false
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  return (
    <>
      <WallPage tweaks={t}></WallPage>

      <TweaksPanel>
        <TweakSection label="追従（マウス）"></TweakSection>
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

        <TweakSection label="デバッグ"></TweakSection>
        <TweakToggle label="グリッド表示" value={t.showDebug}
          onChange={(v) => setTweak('showDebug', v)}></TweakToggle>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App></App>);
