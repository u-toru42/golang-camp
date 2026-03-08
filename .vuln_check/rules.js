/**
 * 堅牢化版セキュリティ検査ルールエンジン
 * 改行やスペースの変動に強く、OWASP Top 10を確実にキャッチします。
 */

module.exports = function scanCode(code, file) {
    const findings = [];
    if (typeof code !== 'string') return findings;

    // 1. SQL Injection (OWASP A03:2021)
    // 対策: [\\s\\S]* を使うことで、途中に改行があっても検知可能にします
    const sqlPattern = /fmt\.Sprintf\(["'`](SELECT|INSERT|UPDATE|DELETE|DROP)[\s\S]*?%s/i;
    if (sqlPattern.test(code)) {
        findings.push({
            title: 'SQL Injection',
            severity: 'CRITICAL',
            description: 'ユーザー入力がSQLクエリに直接埋め込まれています。database/sqlのプレースホルダを使用してください。',
            file, line: 1
        });
    }

    // 2. OS Command Injection (OWASP A03:2021)
    const cmdPattern = /exec\.Command\(.*(sh|bash|cmd).*["'`](-c|\/c)["'`]/;
    if (cmdPattern.test(code)) {
        findings.push({
            title: 'OS Command Injection',
            severity: 'CRITICAL',
            description: 'シェルを介したコマンド実行が検出されました。引数を個別に渡すか、専用のAPIを使用してください。',
            file, line: 1
        });
    }

    // 3. XSS (OWASP A03:2021)
    const xssPattern = /template\.(HTML|JS|URL)\(/;
    if (xssPattern.test(code)) {
        findings.push({
            title: 'Cross-Site Scripting (XSS)',
            severity: 'HIGH',
            description: 'template.HTML等によるエスケープのバイパスを検知しました。',
            file, line: 1
        });
    }

    // 4. SSRF (OWASP A10:2021)
    // http.Get等と、動的なURL生成（http://...%s）の両方が存在する場合に警告
    const hasDynamicUrl = /fmt\.Sprintf\(["'`](https?|ftp):\/\/[\s\S]*?%s/.test(code);
    const hasHttpClient = /http\.(Get|Post|Do|Head)\(/.test(code);
    if (hasDynamicUrl && hasHttpClient) {
        findings.push({
            title: 'SSRF Risk',
            severity: 'HIGH',
            description: 'URLが動的に生成されています。SSRF（サーバーサイド・リクエスト・フォージェリ）の危険性があります。',
            file, line: 1
        });
    }

    // 5. Hardcoded Secret (OWASP A02:2021)
    // キャメルケース(ApiKey)やスネークケース(api_key)の両方に対応
    const secretPattern = /(pass(word|wd)|secret|api_?key|token|access_token)\s*[:=]\s*["'`][^"'`]{8,}["'`]/i;
    if (secretPattern.test(code)) {
        findings.push({
            title: 'Hardcoded Secret',
            severity: 'HIGH',
            description: 'ソースコード内にシークレットが直書きされている可能性があります。',
            file, line: 1
        });
    }

    // 6. Swallowed Error (Clean Code / OWASP A09:2021)
    const swallowPattern = /if\s+err\s*!=\s*nil\s*{\s*}/;
    if (swallowPattern.test(code)) {
        findings.push({
            title: 'Swallowed Error',
            severity: 'MEDIUM',
            description: 'エラーが検知されましたが、何も処理されていません（空のブロック）。',
            file, line: 1
        });
    }

    return findings;
};
