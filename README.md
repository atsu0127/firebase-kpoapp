# firebase-kpoapp

## これは何

KpoApp のための firebase の設定です。

## Security Rule の作成とテスト

### 下準備

`firebase-tools`をインストールします。npm は入っている前提です。
その後諸々インストールします。

```commandline
npm install -g firebase-tools
npm i
```

### 実行

jest でやってます。

```commandline
npm test
```

### security rule 実装

`firestore.rules`を編集してください。
書き方は前例に習ってください。

### テスト実装

`test/rules.test.ts`を編集してください。
書き方は前例に習ってください。

### PR 作成前に ESLint を通す

以下の方法で ESLint などを通してください。

```
npm run lint
# npm-run-allがないと言われたら以下を実行してください
npm install --save-dev npm-run-all
```
