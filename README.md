# KF-MemoryCards

> 忘却曲線に基づくスマート暗記カードアプリ。暗記が覚えられない人のために。

## The Problem

暗記カードを作っても、いつ復習すべかわからず、結局忘れてしまう。

## How It Works

1. カードを追加（表面＝質問、裏面＝答え）
2. 「今日の復習」で復習すべきカードが表示される
3. カードをクリックして裏面を確認、「覚えた/あいまい/忘れた」を選択
4. SM-2アルゴリズムが次の復習日を自動計算
5. カードのインポート/エクスポート（JSON）に対応

## Technologies Used

- **HTML + CSS + JavaScript** — フレームワーク不要のバニラJS
- **SM-2 Algorithm** — SuperMemoの間隔反復アルゴリズムを簡易実装
- **LocalStorage** — 全データをブラウザに保存（サーバー不要）
- **CSS Flip Animation** — カードをクリックで裏返すアニメーション

## Development

```bash
# ローカルで確認（任意のHTTPサーバー）
npx serve .
```

## Deployment

Hosted on [Cloudflare Pages](https://pages.cloudflare.com/).

---

Part of the [KaleidoFuture AI-Driven Development Research](https://kaleidofuture.com) — proving that everyday problems can be solved with existing libraries, no AI model required.
