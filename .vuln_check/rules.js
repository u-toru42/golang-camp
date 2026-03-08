module.exports = function scanCode(code, file) {
    const findings = [];

    // ヘルパー関数: 脆弱性を追加する
    const add = (title, severity, description) => {
        findings.push({ title, severity, description, file, line: 1 });
    };

    // 1. SQL Injection (OWASP A03)
    // 修正ポイント: Sprintf と SQLキーワードが「同じ領域」にあればヒットさせる
    if (/Sprintf\s*\([\s\S]*?["'`](SELECT|INSERT|UPDATE|DELETE|DROP)[\s\S]*?%s/i.test(code)) {
        add('SQL Injection', 'CRITICAL', 'fmt.Sprintfによる動的なSQLクエリ構築を検知しました。');
    }

    // 2. OS Command Injection
    // 修正ポイント: exec.Command の引数に sh/bash/cmd と -c が含まれているかを広範囲にチェック
    if (/exec\.Command\s*\([\s\S]*?(sh|bash|cmd)[\s\S]*?["'`](-c|\/c)["'`]/i.test(code)) {
        add('OS Command Injection', 'CRITICAL', '外部入力を伴うシェルコマンドの実行を検知しました。');
    }

    // 3. XSS (既に検知できているが、より堅牢に)
    if (/template\.(HTML|JS|URL)\s*\(/i.test(code)) {
        add('Cross-Site Scripting (XSS)', 'HIGH', 'HTMLエスケープのバイパス（template.HTML等）を検知しました。');
    }

    // 4. SSRF (OWASP A10)
    // 修正ポイント: SprintfでURLを作っており、かつ http.Getなどが同じファイルにある
    const dynamicUrl = /Sprintf\s*\([\s\S]*?https?:\/\/[\s\S]*?%s/i.test(code);
    const httpCall = /http\.(Get|Post|Do|Head|NewRequest)/.test(code);
    if (dynamicUrl && httpCall) {
        add('SSRF Risk', 'HIGH', '動的に生成されたURLへのHTTPリクエストを検知しました。');
    }

    // 5. Hardcoded Secret (OWASP A02)
    // 修正ポイント: キーワード（ApiKeyなど）の後に = または : があり、その後に長い文字列がある場合
    if (/(api_?key|password|secret|token|passwd)[\s\S]*?[:=][\s\S]*?["'`][a-zA-Z0-9_\-]{16,}/i.test(code)) {
        add('Hardcoded Secret', 'HIGH', '機密情報（APIキーやパスワード）の直書きを検知しました。');
    }

    // 6. Swallowed Error (Clean Code / OWASP A09)
    // 修正ポイント: if err != nil { } の間に改行やスペースがあっても検知
    // go fmt 後の { \n } という形に完全対応
    if (/if\s+err\s*!=\s*nil\s*\{[\s\n\r]*\}/.test(code)) {
        add('Swallowed Error', 'MEDIUM', 'エラーが発生しているのに、中身が空のifブロックで無視されています。');
    }

    return findings;
};
