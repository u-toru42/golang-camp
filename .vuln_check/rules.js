/**
 * セキュリティ検査ルールエンジン
 * 思想: Clean Code, Go Best Practices, OWASP Top 10
 */

module.exports = function scanCode(sourceCode, filePath) {
    const findings = [];
    if (typeof sourceCode !== 'string') return findings;

    // 検出器のリスト
    const detectors = [
        detectSqlInjection,
        detectCommandInjection,
        detectXss,
        detectSsrf,
        detectHardcodedSecrets,
        detectSwallowedErrors // Clean Code & Logging
    ];

    // 各検出器を実行
    detectors.forEach(detector => {
        const issues = detector(sourceCode, filePath);
        if (issues) findings.push(...issues);
    });

    return findings;
};

// --- 検出ロジック群 ---

// 1. SQL Injection (OWASP A03:2021)
// 対策: 常にプレースホルダを使用し、fmt.Sprintfでのクエリ構築を避ける
function detectSqlInjection(code, file) {
    const sqlPattern = /fmt\.Sprintf\(["'`](SELECT|INSERT|UPDATE|DELETE|DROP).*%s/gi;
    if (sqlPattern.test(code)) {
        return [{
            title: 'SQL Injection',
            severity: 'CRITICAL',
            description: 'ユーザー入力がSQLクエリに直接埋め込まれています。database/sqlのプレースホルダを使用してください。',
            file, line: 1
        }];
    }
}

// 2. OS Command Injection (OWASP A03:2021)
// 対策: 外部入力をシェルコマンドの引数として直接渡さない
function detectCommandInjection(code, file) {
    const cmdPattern = /exec\.Command\(.*(sh|bash|cmd).*["'`](-c|\/c)["'`]/g;
    if (cmdPattern.test(code)) {
        return [{
            title: 'OS Command Injection',
            severity: 'CRITICAL',
            description: 'シェルを介したコマンド実行が検出されました。引数を個別に渡すか、専用のAPIを使用してください。',
            file, line: 1
        }];
    }
}

// 3. XSS - Cross-Site Scripting (OWASP A03:2021)
// 対策: html/templateの自動エスケープをバイパスしない
function detectXss(code, file) {
    const xssPattern = /template\.HTML\(|template\.JS\(|template\.URL\(/g;
    if (xssPattern.test(code)) {
        return [{
            title: 'Cross-Site Scripting (XSS)',
            severity: 'HIGH',
            description: '信頼できないデータをtemplate.HTML等でラップすると、自動エスケープが無効になり、XSSの危険があります。',
            file, line: 1
        }];
    }
}

// 4. SSRF - Server-Side Request Forgery (OWASP A10:2021)
// 対策: ユーザー入力からURLを動的に生成してリクエストを送らない
function detectSsrf(code, file) {
    const ssrfPattern = /http\.(Get|Post|Do)\(fmt\.Sprintf\(["'`].*%s/g;
    if (ssrfPattern.test(code)) {
        return [{
            title: 'SSRF Risk',
            severity: 'HIGH',
            description: 'リクエスト先URLが動的に生成されています。許可リスト（Allowlist）による検証が必要です。',
            file, line: 1
        }];
    }
}

// 5. Hardcoded Secrets (OWASP A02:2021)
// 対策: 機密情報は環境変数やVaultで管理する
function detectHardcodedSecrets(code, file) {
    const secretPattern = /(password|passwd|secret|api_key|token|access_token)\s*[:=]\s*["'`][^"'`]{8,}["'`]/gi;
    if (secretPattern.test(code)) {
        return [{
            title: 'Hardcoded Secret',
            severity: 'HIGH',
            description: 'ソースコード内にパスワードやAPIキーらしき文字列が直書きされています。',
            file, line: 1
        }];
    }
}

// 6. Swallowed Errors (Clean Code / OWASP A09:2021)
// 思想: "Errors should never pass silently." (Zen of Python / Kent Beck)
// 対策: エラーを `_` で無視したり、空のブロックで放置したりしない
function detectSwallowedErrors(code, file) {
    const swallowPattern = /if\s+err\s*!=\s*nil\s*{\s*}/g;
    if (swallowPattern.test(code)) {
        return [{
            title: 'Swallowed Error',
            severity: 'MEDIUM',
            description: 'エラーが検知されましたが、何も処理されていません。ログ記録または適切な復帰処理が必要です。',
            file, line: 1
        }];
    }
}
