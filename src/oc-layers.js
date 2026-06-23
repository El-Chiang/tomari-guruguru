// レイヤー設定 — See-through で分割した透明PNGを奥行き順に並べる
//
// public/oc-layers/ に各レイヤー（全画布RGBA）を置き、layers を実際の
// ファイル名・奥行き順（先頭=一番奥, 末尾=一番手前）に書き換える。
//
// group: 所属する部位グループ（まとまった動きのため）
//   'backhair' 後ろ髪。z順は奥だが、頭の傾き(首かしげ)には頭と同期して追従する
//   'body'     首・服。頭の傾きには追従しない（静止）
//   'head'     頭部（顔・耳・前髪・髪飾り等）。首かしげで一緒に動く
//   'eyes'     目（瞳・まつ毛）。まばたきの対象。瞳だけ eyemove で動かす
// hair:   髪揺れを与えるレイヤーに { amp:振幅倍率, phase:位相(秒) }
// eyemove: 目線で動かすレイヤー（瞳のみ。まつ毛・眼窩は動かさない）
//
// ※呼吸・bob・首かしげ・体ゆれ・目線・まばたきは oc-live.jsx 側でグループ
//   単位にかかる。

export default {
  basePath: 'oc-layers',
  ext: 'webp',

  // 奥 → 手前。z順: 体(後ろ髪・服) → 首 → 頭。
  // ※See-through出力では topwear が首の上端を上書きして灰色に見えるため、
  //   neck を topwear より手前に置く（首=肌色がちゃんと出る）。
  //   ただし首は頭の傾きには追従しない(body扱い)。
  layers: [
    { id: 'back_hair',  file: 'back_hair',  group: 'backhair', hair: { amp: 1.2, phase: 0.5 } },
    { id: 'topwear',    file: 'topwear',    group: 'body' },
    { id: 'neck',       file: 'neck',       group: 'body' },
    { id: 'ears',       file: 'ears',       group: 'head' },
    { id: 'face',       file: 'face',       group: 'head' },
    { id: 'nose',       file: 'nose',       group: 'head' },
    { id: 'mouth',      file: 'mouth',      group: 'head' },
    { id: 'eyebrow',    file: 'eyebrow',    group: 'head' },
    { id: 'irides',     file: 'irides',     group: 'eyes', eyemove: true },
    { id: 'eyelash',    file: 'eyelash',    group: 'eyes' },
    { id: 'front_hair', file: 'front_hair', group: 'head', hair: { amp: 1.0, phase: 0 } },
    { id: 'headwear',   file: 'headwear',   group: 'head', hair: { amp: 0.5, phase: 0.15 } },
  ],

  src(file) {
    return `${this.basePath}/${file}.${this.ext}`;
  },
};
