// Wall ページの静的コンテンツ設定。character-config.js / oc-layers.js と同じ
// 「データとレンダリングを分離する」方針 — 内容を変えたいときはここだけ編集する。
// Steam のプレイ実績は手動スナップショット（Obsidian vault の recent_games.json /
// steam_games.json から転記）で、実行時に Steam Web API を叩くことはしない
// （静的サイトなので key を隠すプロキシが立てられず、そもそもこのページに
// リアルタイム性は不要なため）。

export default {
  profile: {
    name: 'トマリ',
    tagline: '私はもう十分可愛いもの、これ以上は世界が危険よ',
    bio: 'マウスを動かすと こっちを見る。放っておくと ひとりで過ごすよ。',
    links: [
      { label: 'Steam ↗', url: 'https://steamcommunity.com/profiles/76561198325807650' },
    ],
    steamUrl: 'https://steamcommunity.com/profiles/76561198325807650',
  },

  // [フェーズ1] 最近よく遊んでいる2本
  shelfGames: [
    {
      appid: 2868840,
      name: 'Slay the Spire 2',
      cover: 'wall/covers/2868840_vertical.jpg',
      hours: 204.3,
      lastPlayed: null,
      url: 'https://store.steampowered.com/app/2868840',
    },
    {
      appid: 1256670,
      name: 'Library Of Ruina',
      cover: 'wall/covers/1256670_vertical.jpg',
      hours: 102.6,
      lastPlayed: '直近2週間で74.1h',
      url: 'https://store.steampowered.com/app/1256670',
    },
  ],

  // [フェーズ2] 散らばる4枚のカード：タイムラインの他の作品
  scatterGames: [],

  // [フェーズ3] ポスター安利：特にオススメの1本
  posterGame: null,
};
