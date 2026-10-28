# Boatrace Replay Links

日付・場・レース番号から、BOATCAST のレースリプレイ（2020-01-01 以降）へのリンクを作る静的ページです。

- 映像は埋め込まず、BOATCAST の再生ページを新しいタブで開きます。
- 開催場の一覧は [boatraceopenapi/programs](https://github.com/boatraceopenapi/programs) の出走表データから取得します。
- 非公式のツールで、BOATCAST とは関係ありません。

## API

1日1ファイルの静的 JSON です。2020-01-01 から前日（JST）までを毎朝 7:00 JST に追加します。

```
https://shimomo.github.io/boatrace-replay-links/api/v1/YYYY/YYYYMMDD.json
```

```json
{"date":"2024-04-09","stadiums":{"1":{"name":"桐生","title":"開催タイトル","races":{"1":{"subtitle":"一般","replay_url":"https://front.player.boatrace-cdn.jp/player/vod?..."}}}}}
```

`stadiums["<場番号>"].races["<レース番号>"].replay_url` でリプレイ URL を引けます。開催のない場は含まれません。

生成は [boatraceopenapi/programs](https://github.com/boatraceopenapi/programs) の v3 データから行います。

```bash
# ローカルの clone から（バックフィル）
node scripts/build.mjs --source <clone>/docs/v3 --from 2020-01-01

# HTTP から（日次。作成済みの日は飛ばす）
node scripts/build.mjs --source http --from 2020-01-01 --missing-only
```

## License

Boatrace Replay Links は [MIT license](LICENSE) の元で公開されています。
