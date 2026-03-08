module.exports = function scanCode(code, file) {
    const findings = [];
    
    // 1. SQL Injection (より柔軟に)
    // カッコ、スペース、改行をすべて許容するように [\\s\\S] を使用
    if (/fmt\.Sprintf\s*\(\s*["'`](SELECT|INSERT|UPDATE|DELETE|DROP)[\s\S]*?%s/i.test(code)) {
        findings.push({ title: 'SQL Injection', severity: 'CRITICAL', description: 'fmt.Sprintfによるクエリ構築', file, line: 1 });
    }

    // 2. OS Command Injection
    if (/exec\.Command\s*\(\s*.*(sh|bash|cmd).*["'`](-c|\/c)["'`]/.test(code)) {
        findings.push({ title: 'OS Command Injection', severity: 'CRITICAL', description: 'シェルの直接呼び出し', file, line: 1 });
    }

    // 3. XSS
    if (/template\.(HTML|JS|URL)\s*\(/.test(code)) {
        findings.push({ title: 'Cross-Site Scripting (XSS)', severity: 'HIGH', description: 'HTMLエスケープのバイパス', file, line: 1 });
    }

    // 4. SSRF (二段階チェック)
    const hasDynamicUrl = /fmt\.Sprintf\s*\(\s*["'`](https?|ftp):\/\/[\s\S]*?%s/i.test(code);
    const hasHttpCall = /http\.(Get|Post|Do|Head|NewRequest)\s*\(/.test(code);
    if (hasDynamicUrl && hasHttpCall) {
        findings.push({ title: 'SSRF Risk', severity: 'HIGH', description: 'URLの動的生成とリクエスト', file, line: 1 });
    }

    // 5. Hardcoded Secret (命名規則をより広くカバー)
    if (/(pass(word|wd)|secret|api_?key|token|access_token|credential)\s*[:=]\s*["'`][^"'`]{8,}/i.test(code)) {
        findings.push({ title: 'Hardcoded Secret', severity: 'HIGH', description: '機密情報の直書き', file, line: 1 });
    }

    // 6. Swallowed Error (Clean Code)
    if (/if\s+err\s*!=\s*nil\s*\{\s*\}/.test(code)) {
        findings.push({ title: 'Swallowed Error', severity: 'MEDIUM', description: 'エラーの黙殺', file, line: 1 });
    }

    return findings;
};
