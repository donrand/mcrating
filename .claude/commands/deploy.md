ビルドチェックを実行し、問題なければ git push してデプロイする。

1. `npm run build` を実行してエラーがないか確認する
2. エラーがあれば修正してから再度ビルドする
3. `git add -A && git commit -m "<変更内容>" && git push` を実行する
4. Vercel が main への push で自動デプロイを開始することを伝える
