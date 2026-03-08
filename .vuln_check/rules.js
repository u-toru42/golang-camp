module.exports = function scanCode(code, file) {
    const findings = [];
    console.log(`   🔍 [Analysis] Running 6 detectors on ${file}...`);

    // 1. SQL Injection (もっとも柔軟なパターン)
    if (/Sprintf[\s\S]*?(SELECT|INSERT|UPDATE|DELETE)[\s\S]*?%s/i.test(code)) {
        console.log("   🚩 [DEBUG] SQL Injection match!");
        findings.push({ title: 'SQL Injection', severity: 'CRITICAL', description: '動的なSQL構築を検知', file, line: 1 });
    }

    // 2. OS Command Injection
    if (/exec\.Command[\s\S]*?(sh|bash|cmd)[\s\S]*?-c/i.test(code)) {
        console.log("   🚩 [DEBUG] Command Injection match!");
        findings.push({ title: 'OS Command Injection', severity: 'CRITICAL', description: 'シェルの直接呼び出しを検知', file, line: 1 });
    }

    // 3. XSS
    if (/template\.(HTML|JS|URL)/.test(code)) {
        console.log("   🚩 [DEBUG] XSS match!");
        findings.push({ title: 'Cross-Site Scripting (XSS)', severity: 'HIGH', description: 'HTMLエスケープのバイパスを検知', file, line: 1 });
    }

    // 4. SSRF
    const hasSprintfUrl = /Sprintf[\s\S]*?https?:\/\/[\s\S]*?%s/i.test(code);
    const hasHttpCall = /http\.(Get|Post|Do|Head|NewRequest)/.test(code);
    if (hasSprintfUrl && hasHttpCall) {
        console.log("   🚩 [DEBUG] SSRF match!");
        findings.push({ title: 'SSRF Risk', severity: 'HIGH', description: 'URLの動的生成とリクエストを検知', file, line: 1 });
    }

    // 5. Hardcoded Secret (単語が含まれているかだけでもチェック)
    if (/(ApiKey|password|secret|token)[\s\S]*?[:=][\s\S]*?["'`]([a-zA-Z0-9_/=+-]{16,})["'`]/i.test(code)) {
        console.log("   🚩 [DEBUG] Secret match!");
        findings.push({ title: 'Hardcoded Secret', severity: 'HIGH', description: '機密情報の直書きを検知', file, line: 1 });
    }

    // 6. Swallowed Error
    if (/if\s+err\s*!=\s*nil\s*\{\s*\}/.test(code)) {
        console.log("   🚩 [DEBUG] Swallowed Error match!");
        findings.push({ title: 'Swallowed Error', severity: 'MEDIUM', description: 'エラーの黙殺を検知', file, line: 1 });
    }

    return findings;
};
