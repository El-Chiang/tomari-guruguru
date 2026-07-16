import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import MeshCharacter from './MeshCharacter';
import {
  DEFAULT_SURFACE_SETTINGS,
  ICHIGO_LAYERS,
  PITCH_DOWN_LIMIT_DEG,
  PITCH_UP_LIMIT_DEG,
  YAW_LIMIT_DEG,
} from './ichigo-model';
import { ParameterController, clamp } from './parameter-controller';
import './mesh-turn.css';

const { useCallback } = React;

const REFERENCE_LAYERS = [
  'back_hair', 'topwear', 'neck', 'ears', 'face', 'nose', 'mouth',
  'eyebrow', 'irides', 'eyelash', 'front_hair', 'headwear',
];

const POSE_ENDPOINTS = [
  { label: '↖', name: '抬头左转', yaw: -YAW_LIMIT_DEG, pitch: -1 },
  { label: '抬头', name: '抬头正面', yaw: 0, pitch: -1 },
  { label: '↗', name: '抬头右转', yaw: YAW_LIMIT_DEG, pitch: -1 },
  { label: '左转', name: '平视左转', yaw: -YAW_LIMIT_DEG, pitch: 0 },
  { label: '正面', name: '平视正面', yaw: 0, pitch: 0 },
  { label: '右转', name: '平视右转', yaw: YAW_LIMIT_DEG, pitch: 0 },
  { label: '↙', name: '低头左转', yaw: -YAW_LIMIT_DEG, pitch: 1 },
  { label: '低头', name: '低头正面', yaw: 0, pitch: 1 },
  { label: '↘', name: '低头右转', yaw: YAW_LIMIT_DEG, pitch: 1 },
];

function pitchToDegrees(value) {
  return value < 0 ? value * PITCH_UP_LIMIT_DEG : value * PITCH_DOWN_LIMIT_DEG;
}

function degreesToPitch(value) {
  return value < 0 ? value / PITCH_UP_LIMIT_DEG : value / PITCH_DOWN_LIMIT_DEG;
}

function ReferenceStack({ visible }) {
  return (
    <div className={`reference-stack${visible ? ' is-visible' : ''}`} aria-hidden="true">
      {REFERENCE_LAYERS.map((id) => (
        <img key={id} src={`${import.meta.env.BASE_URL}oc-layers/${id}.webp`} alt=""></img>
      ))}
    </div>
  );
}

function Range({ label, value, min, max, step, unit = '', onChange }) {
  return (
    <label className="range-row">
      <span>{label}</span>
      <input type="range" value={value} min={min} max={max} step={step}
        onChange={(event) => onChange(Number(event.target.value))}></input>
      <output>{Number(value).toFixed(step < 1 ? 2 : 0)}{unit}</output>
    </label>
  );
}

function Toggle({ children, active, onClick }) {
  return <button type="button" className={`toggle${active ? ' active' : ''}`} onClick={onClick}>{children}</button>;
}

function App() {
  const controller = useMemo(() => new ParameterController(), []);
  const [mode, setMode] = useState('B');
  const [yawDeg, setYawDeg] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [pointerFollow, setPointerFollow] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [reference, setReference] = useState(false);
  const [ready, setReady] = useState(false);
  const [fps, setFps] = useState(0);
  const [surfaceSettings, setSurfaceSettings] = useState({ ...DEFAULT_SURFACE_SETTINGS });
  const stageRef = useRef(null);
  const meshRef = useRef(null);
  const yawRef = useRef(yawDeg);
  const pitchRef = useRef(pitch);
  yawRef.current = yawDeg;
  pitchRef.current = pitch;
  const pitchDeg = pitchToDegrees(pitch);

  const setSurface = useCallback((name, value) => {
    setSurfaceSettings((previous) => ({ ...previous, [name]: value }));
  }, []);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    const tick = (now) => {
      const delta = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      controller.setTarget('headYaw', yawRef.current / YAW_LIMIT_DEG);
      controller.setTarget('headPitch', pitchRef.current);
      meshRef.current?.updateParameters(controller.update(delta));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [controller]);

  useEffect(() => {
    if (!pointerFollow) return undefined;
    const onMove = (event) => {
      const bounds = stageRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const normalizedX = clamp((event.clientX - (bounds.left + bounds.width / 2)) / (bounds.width * 0.42));
      const normalizedY = clamp((event.clientY - (bounds.top + bounds.height / 2)) / (bounds.height * 0.42));
      setYawDeg(normalizedX * YAW_LIMIT_DEG);
      setPitch(normalizedY);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [pointerFollow]);

  const chooseYaw = (value) => {
    setPointerFollow(false);
    setYawDeg(value);
  };

  const choosePitchDegrees = (value) => {
    setPointerFollow(false);
    setPitch(clamp(degreesToPitch(value)));
  };

  const choosePose = (yaw, nextPitch) => {
    setPointerFollow(false);
    setYawDeg(yaw);
    setPitch(nextPitch);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">ICHIGO / WEB MESH STUDY 01</p>
          <h1>2.5D 手工曲面转头</h1>
        </div>
        <div className="status-cluster">
          <span className={`status-dot${ready ? ' ready' : ''}`}></span>
          <span>{ready ? '模型已加载' : '正在加载纹理'}</span>
          <span className="fps">{fps ? `${fps} FPS` : '— FPS'}</span>
        </div>
      </header>

      <section className="workspace">
        <div className="viewport-card" ref={stageRef}>
          <div className="viewport-labels">
            <span>HEAD POSE</span>
            <div className="pose-readout">
              <strong>Y {yawDeg > 0 ? '+' : ''}{yawDeg.toFixed(1)}°</strong>
              <strong>X {pitchDeg > 0 ? '+' : ''}{pitchDeg.toFixed(1)}°</strong>
            </div>
          </div>
          <div className="character-frame">
            <MeshCharacter ref={meshRef} mode={mode} wireframe={wireframe}
              surfaceSettings={surfaceSettings} onReady={() => setReady(true)} onStats={setFps}></MeshCharacter>
            <ReferenceStack visible={reference}></ReferenceStack>
          </div>
          <div className="axis-line"><i></i></div>
          <div className="endpoint-buttons pose-endpoints" aria-label="Head pose endpoints">
            {POSE_ENDPOINTS.map((endpoint) => (
              <button key={endpoint.name} type="button" title={endpoint.name}
                className={Math.abs(yawDeg - endpoint.yaw) < 0.01 && Math.abs(pitch - endpoint.pitch) < 0.01 ? 'active' : ''}
                onClick={() => choosePose(endpoint.yaw, endpoint.pitch)}>{endpoint.label}</button>
            ))}
          </div>
        </div>

        <aside className="control-panel">
          <section>
            <div className="section-title"><span>01</span><h2>原型比较</h2></div>
            <div className="segmented">
              <Toggle active={mode === 'A'} onClick={() => setMode('A')}>A · 数学曲面</Toggle>
              <Toggle active={mode === 'B'} onClick={() => setMode('B')}>B · 美术修正</Toggle>
            </div>
            <p className="hint">A 只有真实 Z 曲面和 X/Y 旋转；B 叠加脸型、远近眼、五官与发梢关键形。</p>
          </section>

          <section>
            <div className="section-title"><span>02</span><h2>转头参数</h2></div>
            <Range label="HeadYaw" value={yawDeg} min={-YAW_LIMIT_DEG} max={YAW_LIMIT_DEG}
              step={0.1} unit="°" onChange={chooseYaw}></Range>
            <Range label="HeadPitch" value={pitchDeg} min={-PITCH_UP_LIMIT_DEG} max={PITCH_DOWN_LIMIT_DEG}
              step={0.1} unit="°" onChange={choosePitchDegrees}></Range>
            <div className="button-grid">
              <Toggle active={pointerFollow} onClick={() => setPointerFollow((value) => !value)}>跟随鼠标</Toggle>
              <Toggle active={wireframe} onClick={() => setWireframe((value) => !value)}>显示网格</Toggle>
              <Toggle active={reference} onClick={() => setReference((value) => !value)}>正面叠图</Toggle>
            </div>
          </section>

          <section>
            <div className="section-title"><span>03</span><h2>手工曲面</h2></div>
            <Range label="脸部深度" value={surfaceSettings.faceDepth} min={0} max={100} step={1}
              onChange={(value) => setSurface('faceDepth', value)}></Range>
            <Range label="头发壳层" value={surfaceSettings.hairDepth} min={0} max={70} step={1}
              onChange={(value) => setSurface('hairDepth', value)}></Range>
            <Range label="立体投影" value={surfaceSettings.perspective} min={0} max={0.5} step={0.01}
              onChange={(value) => setSurface('perspective', value)}></Range>
            <Range label="端点修正" value={surfaceSettings.corrective} min={0} max={1.8} step={0.05}
              onChange={(value) => setSurface('corrective', value)}></Range>
            <Range label="点头修正" value={surfaceSettings.pitchCorrective} min={0} max={1.8} step={0.05}
              onChange={(value) => setSurface('pitchCorrective', value)}></Range>
            <button className="reset" type="button"
              onClick={() => setSurfaceSettings({ ...DEFAULT_SURFACE_SETTINGS })}>恢复默认曲面</button>
          </section>

          <footer>
            <span>{ICHIGO_LAYERS.length} layers</span>
            <span>1024² model space</span>
          </footer>
        </aside>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App></App>);
