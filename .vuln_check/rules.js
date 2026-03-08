module.exports = function scanCode(code, file) {
    const findings = [];
    if (typeof code !== 'string') return findings;

    // 1. SQL Injection (OWASP A03)
    // 柔軟性アップ: fmt.Sprintf の後の空白や改行を許容
    const sqlPattern = /fmt\.Sprintf\s*\(\s*["'`](SELECT|INSERT|UPDATE|DELETE|DROP)[\s\S]*?%s/i;
    if (sqlPattern.test(code)) {
        findings.push({
            title: 'SQL Injection',
            severity: 'CRITICAL',
            description: 'fmt.Sprintfによる動的SQL構築を検知。',
            file, line: 1
        });
    }

    // 2. OS Command Injection (OWASP A03)
    const cmdPattern = /exec\.Command\s*\(\s*.*(sh|bash|cmd).*["'`](-c|\/c)["'`]/;
    if (cmdPattern.test(code)) {
        findings.push({
            title: 'OS Command Injection',
            severity: 'CRITICAL',
            description: '外部入力を伴うシェルの呼び出しを検知。',
            file, line: 1
        });
    }

    // 3. XSS (OWASP A03)
    const xssPattern = /template\.(HTML|JS|URL)\s*\(/;
    if (xssPattern.test(code)) {
        findings.push({
            title: 'Cross-Site Scripting (XSS)',
            severity: 'HIGH',
            description: 'template.HTML等によるエスケープの無効化。',
            file, line: 1
        });
    }

    // 4. SSRF (OWASP A10) - より広範囲な検知
    // fmt.SprintfでURLを作っており、かつhttp.Getなどがある場合
    const hasSprintfUrl = /fmt\.Sprintf\s*\(\s*["'`](https?|ftp):\/\/[\s\S]*?%s/i.test(code);
    const hasHttpCall = /http\.(Get|Post|Do|Head)\s*\(/.test(code);
    if (hasSprintfUrl && hasHttpCall) {
        findings.push({
            title: 'SSRF Risk',
            severity: 'HIGH',
            description: '動的に生成されたURLへのHTTPリクエスト。',
            file, line: 1
        });
    }

    // 5. Hardcoded Secret (OWASP A02)
    // 変数名と値の間のスペースや改行を \s* で許容
    const secretPattern = /(pass(word|wd)|secret|api_?key|token|access_token)\s*[:=]\s*["'`][^"'`]{8,}/i;
    if (secretPattern.test(code)) {
        findings.push({
            title: 'Hardcoded Secret',
            severity: 'HIGH',
            description: '機密情報の直書きを検知。',
            file, line: 1
        });
    }

    // 6. Swallowed Error (Clean Code)
    // 空の中カッコ { } の間にスペースや改行があっても検知
    const swallowPattern = /if\s+err\s*!=\s*nil\s*\{\s*\}/;
    if (swallowPattern.test(code)) {
        findings.push({
            title: 'Swallowed Error',
            severity: 'MEDIUM',
            description: 'エラーの黙殺（空のifブロック）。',
            file, line: 1
        });
    }

    return findings;
};
