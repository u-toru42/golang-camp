const fs = require('fs');
const path = require('path');

/**
 * 🛡️ Security Engine (Normalized Search)
 */
function scanCode(rawCode, file) {
    const findings = [];
    const add = (title, severity, desc) => findings.push({ title, severity, description: desc, file, line: 1 });

    // 全ての改行と連続する空白を1つのスペースに正規化
    const code = rawCode.replace(/\s+/g, ' ');

    // 1. SQL Injection
    if (/fmt\.Sprintf\s*\(\s*["'`](SELECT|INSERT|UPDATE|DELETE|DROP)[\s\S]*?%s/i.test(code)) {
        add('SQL Injection', 'CRITICAL', '動的なSQL構築（fmt.Sprintf）を検知。');
    }

    // 2. OS Command Injection
    if (/exec\.Command\s*\([\s\S]*?(sh|bash|cmd)[\s\S]*?(-c|\/c)/i.test(code)) {
        add('OS Command Injection', 'CRITICAL', '外部入力を伴うシェルコマンド実行を検知。');
    }

    // 3. XSS
    if (/template\.(HTML|JS|URL)\s*\(/.test(code)) {
        add('Cross-Site Scripting (XSS)', 'HIGH', 'HTMLエスケープのバイパスを検知。');
    }

    // 4. SSRF
    if (/Sprintf[\s\S]*?https?:\/\/[\s\S]*?%s/i.test(code) && /http\.(Get|Post|Do|NewRequest)/.test(code)) {
        add('SSRF Risk', 'HIGH', '動的に生成されたURLへのHTTPリクエストを検知。');
    }

    // 5. Hardcoded Secret
    if (/(api_?key|password|secret|token)[\s\S]*?[:=][\s\S]*?["'`]([a-zA-Z0-9_\-]{16,})["'`]/i.test(code)) {
        add('Hardcoded Secret', 'HIGH', 'ソースコード内の機密情報を検知。');
    }

    // 6. Swallowed Error
    if (/if\s+err\s*!=\s*nil\s*\{\s*\}/.test(code)) {
        add('Swallowed Error', 'MEDIUM', 'エラーの黙殺（空のifブロック）を検知。');
    }

    return findings;
}

function run() {
    console.log("🚀 Custom SAST Engine: Version 6.0 (Integrated & Reporting)");
    const targetDir = './design_patterns';
    const files = [];

    function getFiles(dir) {
        if (!fs.existsSync(dir)) return;
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
        console.log(`👉 [SCANNING] ${relativePath}`);
        
        const results = scanCode(sourceCode, relativePath);
        if (results.length > 0) {
            console.log(`   🚩 [HIT] Found ${results.length} issues in ${relativePath}`);
            allFindings.push(...results.map(r => ({ ...r, message: `[${r.title}] ${r.description}` })));
        }
    });

    // --- 【重要】結果をファイルに保存（GitHub Script用） ---
    fs.writeFileSync('results.json', JSON.stringify({ findings: allFindings }, null, 2));

    if (allFindings.length > 0) {
        console.log(`=== ✨ Scan completed. Found ${allFindings.length} vulnerabilities. ===`);
        console.log("❌ Vulnerabilities found. Failing the build to prevent unsafe merge.");
        process.exit(1); 
    } else {
        console.log("=== ✨ Scan completed. Total Issues: 0 ===");
        console.log("✅ No vulnerabilities found. Build passed!");
        process.exit(0);
    }
}

run();
