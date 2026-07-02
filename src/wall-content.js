// Wall ページの静的コンテンツ設定。character-config.js / oc-layers.js と同じ
// 「データとレンダリングを分離する」方針 — 内容を変えたいときはここだけ編集する。
// Steam のプレイ実績は手動スナップショット（Obsidian vault の 2026 游戏时间线.md /
// steam_games.json から転記）で、実行時に Steam Web API を叩くことはしない
// （静的サイトなので key を隠すプロキシが立てられず、そもそもこのページに
// リアルタイム性は不要なため）。

const steamUrl = (appid) => `https://store.steampowered.com/app/${appid}`;

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

  // 月ごとに棚を1本ずつ並べる。cover が無いもの(appid 不明/カバー未取得)は
  // ShelfSection 側でジャケ無しの背表紙風プレースホルダーにフォールバックする。
  timeline: [
    {
      month: '6〜7月',
      games: [
        { appid: 2868840, name: 'Slay the Spire 2', cover: 'wall/covers/2868840_vertical.jpg', hours: 204.3, url: steamUrl(2868840) },
        { appid: 1256670, name: 'Library Of Ruina', cover: 'wall/covers/1256670_vertical.jpg', hours: 102.6, note: '直近2週間で74.1h', url: steamUrl(1256670) },
        { appid: 2445690, name: '失落城堡2', cover: 'wall/covers/2445690_header.jpg', hours: 40.4, url: steamUrl(2445690) },
        { appid: 2863680, name: '归零巡礼：亡谍镇魂曲', cover: 'wall/covers/2863680_hero.jpg', hours: 36.5, url: steamUrl(2863680) },
        { appid: 3357650, name: 'PRAGMATA', cover: 'wall/covers/3357650_hero.jpg', hours: 1.9, note: '未発売', url: steamUrl(3357650) },
        {
          appid: 3974650, name: '鬼武者 Way of the Sword DEMO',
          cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/3974650/67c0395623cb98c44b829bf62a570b0553066ac5/header.jpg',
          hours: 1.1, note: '体験版', url: steamUrl(3974650),
        },
        { name: '白之追猎 Hunter White Demo', cover: null, note: '体験版', url: null },
        { appid: 2638890, name: '鬼武者 Way of the Sword', cover: null, url: steamUrl(2638890) },
      ],
    },
    {
      month: '5月',
      games: [
        { appid: 2057760, name: '奥秘 消退', cover: null, hours: 24.7, url: steamUrl(2057760) },
        { name: '喵喵的结合', cover: null, url: null },
      ],
    },
    {
      month: '4月',
      games: [
        { name: '孤山独影', cover: null, url: null },
        { appid: 3265700, name: '吸血鬼爬行者：屠戮地牢的吸血鬼幸存者', cover: null, url: steamUrl(3265700) },
      ],
    },
    {
      month: '3月',
      games: [
        { appid: 2285550, name: '多洛可小镇', cover: null, hours: 135.7, url: steamUrl(2285550) },
      ],
    },
    {
      month: '1月',
      games: [
        { name: 'Lobotomy Corporation', cover: null, url: null },
        { name: '逃离鸭科夫', cover: null, url: null },
      ],
    },
  ],

  // [フェーズ3] ポスター安利：特にオススメの1本
  posterGame: null,
};
