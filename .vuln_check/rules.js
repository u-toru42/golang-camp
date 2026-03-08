/**
 * アップグレード版：柔軟な検知ルール
 */

module.exports = function scanCode(code, file) {
    const findings = [];
    if (typeof code !== 'string') return findings;

    const detectors = [
        detectSqlInjection,
        detectCommandInjection,
        detectXss,
        detectSsrf, // 強化版
        detectHardcodedSecrets, // 強化版
        detectSwallowedErrors
    ];

    detectors.forEach(detector => {
        const issues = detector(code, file);
        if (issues) findings.push(...issues);
    });

    return findings;
};

function detectSqlInjection(code, file) {
    const sqlPattern = /fmt\.Sprintf\(["'`](SELECT|INSERT|UPDATE|DELETE|DROP).*%s/gi;
    if (sqlPattern.test(code)) {
        return [{ title: 'SQL Injection', severity: 'CRITICAL', description: 'fmt.Sprintfによるクエリ構築', file, line: 1 }];
    }
}

function detectCommandInjection(code, file) {
    const cmdPattern = /exec\.Command\(.*(sh|bash|cmd).*["'`](-c|\/c)["'`]/g;
    if (cmdPattern.test(code)) {
        return [{ title: 'OS Command Injection', severity: 'CRITICAL', description: 'シェルの直接呼び出し', file, line: 1 }];
    }
}

function detectXss(code, file) {
    const xssPattern = /template\.HTML\(|template\.JS\(|template\.URL\(/g;
    if (xssPattern.test(code)) {
        return [{ title: 'Cross-Site Scripting (XSS)', severity: 'HIGH', description: 'HTMLエスケープのバイパス', file, line: 1 }];
    }
}

// 🌐 強化版：SSRF (変数を介した呼び出しにも対応)
function detectSsrf(code, file) {
    // 1行での呼び出し、または同じファイル内に fmt.Sprintf と http.Get が共存しているパターンを検知
    const hasSprintfUrl = /fmt\.Sprintf\(["'`].*https?:\/\/.*%s/g.test(code);
    const hasHttpGet = /http\.(Get|Post|Do)\(/g.test(code);
    
    if (hasSprintfUrl && hasHttpGet) {
        return [{
            title: 'SSRF Risk',
            severity: 'HIGH',
            description: 'URLを動的に生成してHTTPリクエストを送っています。許可リストによる検証を検討してください。',
            file, line: 1
        }];
    }
}

// 🔑 強化版：Hardcoded Secret (キャメルケース/スネークケース両対応)
function detectHardcodedSecrets(code, file) {
    // api_key, ApiKey, apikey, password, Password 等に幅広く対応
    const secretPattern = /(pass(word|wd)|secret|api_?key|token|access_token)\s*[:=]\s*["'`][^"'`]{8,}["'`]/gi;
    if (secretPattern.test(code)) {
        return [{
            title: 'Hardcoded Secret',
            severity: 'HIGH',
            description: '機密情報のリテラル代入を検知しました。',
            file, line: 1
        }];
    }
}

function detectSwallowedErrors(code, file) {
    const swallowPattern = /if\s+err\s*!=\s*nil\s*{\s*}/g;
    if (swallowPattern.test(code)) {
        return [{ title: 'Swallowed Error', severity: 'MEDIUM', description: 'エラーの黙殺', file, line: 1 }];
    }
}