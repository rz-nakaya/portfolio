// お知らせのデータ。ここに1件足すと、TOPの「お知らせ」とお知らせ一覧の両方に反映される。
// url を書いた記事だけ詳細ページへのリンクになる(サイトのルートからの相対パス)。
window.HARUKAZE_NEWS = [
  { date: "2026-09-24", category: "equipment", title: "三次元測定機を1台増設し、全数検査の体制を強化しました", url: "news/cmm-2026/" },
  { date: "2026-08-30", category: "recruit", title: "2027年度 新卒採用のエントリー受付を開始しました" },
  { date: "2026-07-11", category: "info", title: "夏季休業のお知らせ(8月12日〜8月16日)" },
  { date: "2026-05-20", category: "info", title: "「ものづくり技術展 2026」に出展しました" },
  { date: "2026-04-01", category: "recruit", title: "新入社員5名が入社しました" },
  { date: "2026-02-16", category: "equipment", title: "第二工場に5軸マシニングセンタを2台導入しました" }
];

window.HARUKAZE_NEWS_CATEGORIES = {
  info: "お知らせ",
  equipment: "設備",
  recruit: "採用"
};
