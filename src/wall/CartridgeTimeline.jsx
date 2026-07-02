import React from 'react';

const { useRef, useState, useEffect, useCallback } = React;

// カセット時間軸。Figma の GAME CARD(node 1:201) のカセット写真を流用 ——
// ラベル窓(元は Xenogears のアート部分)をピクセル実測して透過で打ち抜いた
// cart-shell.png を上に重ね、下層の Steam カバーが窓から覗く構造。
// カバーの縦横比は問わない(object-fit: cover でクロップされるだけ)。
//
// 演出: 入場時に月ごと左から順に「上からストンと差し込まれる」、hover で
// 傾きが直って浮き上がり、名前+プレイ時間のツールチップが出る。
// 横幅が収まらないときはこのストリップだけが横スクロールする(端は fade)。

// cart-raw.png(320x460) 上のラベル窓実測値: x 22..298, y 26..364
const CART = { width: 66, height: 95 };
const LABEL = {
  left: (22 / 320) * 100 + '%',
  top: (26 / 460) * 100 + '%',
  width: ((298 - 22) / 320) * 100 + '%',
  height: ((364 - 26) / 460) * 100 + '%',
};
// 差し込み角度: index で決まる疑似ランダム(再現性があって並びが安定する)
const ROTATIONS = [-4, 3, -2, 4.5, -3.5, 2.5];

const font = "'IBM Plex Sans SC', sans-serif";

function Cartridge({ game, order }) {
  const rot = ROTATIONS[order % ROTATIONS.length];
  const body = (
    <div className="wall-cart-drop" style={{ animationDelay: `${order * 90}ms` }}>
      <div className="wall-cart" style={{
        position: 'relative', width: CART.width, height: CART.height,
        '--rot': `${rot}deg`, transform: `rotate(${rot}deg)`,
        filter: 'drop-shadow(0px 3px 4px rgba(0,0,0,0.35))',
      }}>
        <img
          src={game.cover} alt={game.name}
          style={{
            position: 'absolute', left: LABEL.left, top: LABEL.top,
            width: LABEL.width, height: LABEL.height, objectFit: 'cover',
          }}
        />
        <img
          src="wall/carts/cart-shell.png" alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
        <div className="wall-cart-tip" style={{
          position: 'absolute', bottom: '100%', left: '50%',
          transform: 'translate(-50%, -6px)',
          background: 'rgba(28,28,28,0.92)', color: '#eee', borderRadius: 4,
          padding: '4px 8px', whiteSpace: 'nowrap', pointerEvents: 'none',
          fontFamily: font, fontSize: 10, lineHeight: 1.5, textAlign: 'center',
        }}>
          <span style={{ fontWeight: 500 }}>{game.name}</span>
          {(game.hours != null || game.note) && (
            <span style={{ color: 'rgba(255,255,255,0.55)', marginLeft: 6 }}>
              {game.hours != null ? `${game.hours}h` : game.note}
            </span>
          )}
        </div>
      </div>
    </div>
  );
  if (!game.url) return <div>{body}</div>;
  return (
    <a href={game.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
      {body}
    </a>
  );
}

function MonthCluster({ month, games, startOrder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        {games.map((g, i) => <Cartridge key={g.appid ?? g.name} game={g} order={startOrder + i} />)}
      </div>
      {/* 時間軸との接点: 目盛り+月ラベル */}
      <div style={{ width: 1, height: 8, background: 'rgba(0,0,0,0.35)', marginTop: 10 }} />
      <p style={{
        margin: '4px 0 0', fontFamily: "'Fraunces', serif", fontWeight: 600,
        fontSize: 12, color: 'rgba(0,0,0,0.55)',
      }}>
        {month}
      </p>
    </div>
  );
}

// はみ出しがある側だけ端を fade させる。縦ホイールは横スクロールに変換
// （帯の上にポインタがあるときだけ）。
function useEdgeFade() {
  const ref = useRef(null);
  const [fade, setFade] = useState({ left: false, right: false });
  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setFade((prev) => {
      const next = { left: el.scrollLeft > 4, right: el.scrollLeft < max - 4 };
      return (next.left === prev.left && next.right === prev.right) ? prev : next;
    });
  }, []);
  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', update);
    };
  }, [update]);
  return { ref, fade, update };
}

export default function CartridgeTimeline({ months }) {
  const { ref, fade, update } = useEdgeFade();
  if (!months || !months.length) return null;
  let order = 0;
  const clusters = months.map((m) => {
    const c = <MonthCluster key={m.month} month={m.month} games={m.games} startOrder={order} />;
    order += m.games.length;
    return c;
  });
  // 時間軸の横線は カセット下端(=クラスタ内の目盛り開始位置) に合わせる:
  // tooltip 用の上余白 + カセット高 + 目盛りマージンの途中。
  const TIP_PAD = 34;
  const axisTop = TIP_PAD + CART.height + 14;
  return (
    <div style={{ position: 'relative' }}>
      <p style={{
        margin: '0 0 4px', fontFamily: "'Fraunces', serif", fontWeight: 600,
        fontSize: 20, color: 'rgba(0,0,0,0.8)',
      }}>
        2026 タイムライン
      </p>
      <p style={{
        margin: 0, fontFamily: font, fontSize: 10, color: 'rgba(0,0,0,0.4)',
      }}>
        今年遊んだゲームのカセット棚 · hoverで詳細
      </p>
      <div
        ref={ref} className="wall-tape-scroll" onScroll={update}
        style={{
          overflowX: 'auto', overflowY: 'hidden',
          WebkitMaskImage: `linear-gradient(to right, ${fade.left ? 'transparent 0, black 48px' : 'black 0'}, black calc(100% - 48px), ${fade.right ? 'transparent' : 'black'} 100%)`,
          maskImage: `linear-gradient(to right, ${fade.left ? 'transparent 0, black 48px' : 'black 0'}, black calc(100% - 48px), ${fade.right ? 'transparent' : 'black'} 100%)`,
        }}
      >
        <div style={{
          position: 'relative', display: 'inline-flex', alignItems: 'flex-end',
          gap: 34, paddingTop: TIP_PAD, paddingBottom: 4, paddingRight: 8,
        }}>
          {/* 連続した時間軸の横線(スクロール内容の全幅に伸びる) */}
          <div style={{
            position: 'absolute', left: 0, right: 0, top: axisTop,
            height: 1, background: 'rgba(0,0,0,0.25)',
          }} />
          {clusters}
        </div>
      </div>
      <style>{`
        .wall-tape-scroll { scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.2) transparent; }
        .wall-tape-scroll::-webkit-scrollbar { height: 6px; }
        .wall-tape-scroll::-webkit-scrollbar-track { background: transparent; }
        .wall-tape-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 999px; }

        .wall-cart { transition: transform 240ms cubic-bezier(0.34, 1.45, 0.64, 1), filter 240ms ease; }
        .wall-cart-tip { opacity: 0; transition: opacity 160ms ease 60ms; }
        a:hover .wall-cart, div:hover > .wall-cart-drop .wall-cart {
          transform: rotate(0deg) translateY(-9px) scale(1.06);
          filter: drop-shadow(0px 10px 10px rgba(0,0,0,0.3));
          z-index: 2;
        }
        a:hover .wall-cart-tip, div:hover > .wall-cart-drop .wall-cart-tip { opacity: 1; }

        @media (prefers-reduced-motion: no-preference) {
          .wall-cart-drop {
            animation: cartDrop 480ms cubic-bezier(0.22, 1.2, 0.36, 1) backwards;
          }
          @keyframes cartDrop {
            from { transform: translateY(-30px); opacity: 0; }
            to   { transform: translateY(0);     opacity: 1; }
          }
        }
      `}</style>
    </div>
  );
}
