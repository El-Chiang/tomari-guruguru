import React, { useEffect, useRef } from 'react';
import { MeshCharacterRenderer } from './renderer';

export default function MeshCharacter({
  parameters,
  mode,
  wireframe,
  surfaceSettings,
  onReady,
  onStats,
}) {
  const hostRef = useRef(null);
  const rendererRef = useRef(null);
  const propsRef = useRef({ parameters, mode, wireframe, surfaceSettings });
  propsRef.current = { parameters, mode, wireframe, surfaceSettings };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const renderer = new MeshCharacterRenderer(host, { onStats });
    rendererRef.current = renderer;
    let alive = true;

    renderer.ready.then(() => {
      if (!alive) return;
      const latest = propsRef.current;
      renderer.setMode(latest.mode);
      renderer.setWireframe(latest.wireframe);
      renderer.setSurfaceSettings(latest.surfaceSettings);
      renderer.update(latest.parameters);
      onReady?.();
    });

    return () => {
      alive = false;
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => rendererRef.current?.setMode(mode), [mode]);
  useEffect(() => rendererRef.current?.setWireframe(wireframe), [wireframe]);
  useEffect(() => rendererRef.current?.setSurfaceSettings(surfaceSettings), [surfaceSettings]);
  useEffect(() => rendererRef.current?.update(parameters), [parameters]);

  return <div ref={hostRef} className="mesh-host" aria-label="2.5D character preview"></div>;
}

