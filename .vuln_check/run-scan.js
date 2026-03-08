const fs = require('fs');
const path = require('path');

/**
 * 🛡️ Security Rules (Integrated Version)
 * 正規表現を極限まで柔軟にし、go fmt 後のコードを確実に捉えます。
 */
function scanCode(code, file) {
    const findings = [];
    const add = (title, severity, desc) => findings.push({ title, severity, description: desc, file, line: 1 });

    // 1. SQL Injection (OWASP A03)
    // Sprintf と SQLコマンドが近くにあれば検知
    if (/Sprintf[\s\S]{0,50}["'`](SELECT|INSERT|UPDATE|DELETE|DROP)[\s\S]+?%s/i.test(code)) {
        add('SQL Injection', 'CRITICAL', 'fmt.Sprintfによる動的SQL構築を検知。');
    }

    // 2. OS Command Injection (OWASP A03)
    if (/exec\.Command[\s\S]{0,50}(sh|bash|cmd)[\s\S]+?(-c|\/c)/i.test(code)) {
        add('OS Command Injection', 'CRITICAL', 'シェルを介したコマンド実行を検知。');
    }

    // 3. XSS (OWASP A03)
    if (/template\.(HTML|JS|URL)/.test(code)) {
        add('Cross-Site Scripting (XSS)', 'HIGH', 'HTMLエスケープのバイパスを検知。');
    }

    // 4. SSRF (OWASP A10)
    if (/Sprintf[\s\S]{0,50}https?:\/\/[\s\S]+?%s/i.test(code) && /http\.(Get|Post|Do|NewRequest)/.test(code)) {
        add('SSRF Risk', 'HIGH', '動的に生成されたURLへのHTTPリクエストを検知。');
    }

    // 5. Hardcoded Secret (OWASP A02)
    if (/(api_?key|password|secret|token)[\s\S]{0,20}[:=][\s\S]{0,20}["'`]([a-zA-Z0-9_\-]{16,})/i.test(code)) {
        add('Hardcoded Secret', 'HIGH', '機密情報の直書きを検知。');
    }

    // 6. Swallowed Error (Clean Code)
    if (/if\s+err\s*!=\s*nil\s*\{[\s\n\r]*\}/.test(code)) {
        add('Swallowed Error', 'MEDIUM', 'エラーの黙殺（空のifブロック）を検知。');
    }

    return findings;
}

/**
 * 🚀 Main Engine
 */
function run() {
    console.log("🚀 Custom SAST Engine: Version 3.0 (Integrated)");
    const targetDir = './design_patterns';
    
    if (!fs.existsSync(targetDir)) {
        console.error(`❌ Target directory ${targetDir} not found!`);
        process.exit(1);
    }

    const files = [];
    function getFiles(dir) {
        const list = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of list) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) getFiles(fullPath);
            else if (item.name.endsWith('.go')) files.push(fullPath);
        }
    }
    getFiles(targetDir);

    console.log(`🔍 Found ${files.length} Go files.`);
    const allFindings = [];

    files.forEach(filePath => {
        const relativePath = path.relative(process.cwd(), filePath);
        const sourceCode = fs.readFileSync(filePath, 'utf8');
        
        // ログ出力を明確に変更（これがログに出れば最新版です）
        console.log(`👉 [SCANNING] ${relativePath} ...`);
        
        const results = scanCode(sourceCode, relativePath);
        if (results.length > 0) {
            console.log(`   🚩 Found ${results.length} issues!`);
            results.forEach(r => {
                r.message = `[${r.title}] ${r.description}`;
                allFindings.push(r);
            });
        }
    });

    fs.writeFileSync('results.json', JSON.stringify({ findings: allFindings }, null, 2));
    console.log(`=== ✨ Scan completed. Total Issues: ${allFindings.length} ===`);
}

run();