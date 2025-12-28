# カスタムURI `file-explorer:` 導入ドキュメント

Windows環境で、一瞬の黒い窓（コンソール）を出さずに、カスタムURIからエクスプローラーを起動するための最終設定をまとめました。

---

## 1. VBSファイルの作成

PowerShellを完全に非表示で実行するための中継スクリプトを作成します。

* **保存場所:** `C:\bin\fileopen.vbs`
* **内容:** 以下のコードをコピーして保存してください。

```vbs
Set shell = CreateObject("WScript.Shell")
If WScript.Arguments.Count > 0 Then
    arg = WScript.Arguments(0)
    ' pwsh.exe を非表示(0)で実行し、URIをパスに変換してエクスプローラーを起動
    psCommand = "pwsh.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command ""$v='" & arg & "'.Replace('file-explorer:','').TrimStart('/'); Add-Type -AssemblyName System.Web; $v=[System.Web.HttpUtility]::UrlDecode($v); $v=$v -replace '/','\'; explorer.exe $v"""
    shell.Run psCommand, 0, True
End If

```

---

## 2. レジストリの登録

カスタムURIスキーム `file-explorer:` をシステムに登録し、作成したVBSファイルに関連付けます。

* **ファイル名:** `file-explorer.reg`（任意）
* **内容:** 以下の内容を保存し、ダブルクリックして結合してください。

```reg
Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\SOFTWARE\Classes\file-explorer]
@="URL:File Explorer Protocol"
"URL Protocol"=""

[HKEY_CURRENT_USER\SOFTWARE\Classes\file-explorer\shell\open\command]
@="wscript.exe \"C:\\bin\\fileopen.vbs\" \"%1\""

```

---

## 3. 仕様と動作確認

### 動作の仕組み

1. **呼び出し**: ブラウザ等が `file-explorer://path` を検知。
2. **中継**: `wscript.exe` がVBSを非表示モードで起動。
3. **整形**: VBS内のPowerShell 7 (`pwsh`) が以下の処理を実行。

* スキーム名 (`file-explorer:`) の除去。
* URLデコード（日本語やスペースの復元）。
* スラッシュ (`/`) を Windows形式 (`\`) へ変換。

1. **実行**: 最終的なパスを `explorer.exe` で開く。

### テスト用URL

ブラウザのアドレスバーに以下を入力して動作を確認してください。

* **基本:** `file-explorer:C:\`
* **日本語・スペースを含むパス:** `file-explorer://C:/Users/Public/Documents/`

---

## 4. メンテナンスについて

* **パスの変更**: VBSファイルを別の場所に移動した場合は、レジストリの `command` 内にあるパスも書き換えてください。
* **PowerShell 7非搭載環境**: もし `pwsh.exe` がないPCで使う場合は、VBS内の `pwsh.exe` を `powershell.exe` に書き換えるだけで動作します。

---

このドキュメントをテキストファイルとして保存しておけば、他のPCへの展開もスムーズです。この他、特定の引数（ファイルをハイライト表示するなど）を追加したい場合はいつでもお知らせください。
