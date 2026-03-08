const fs = require('fs');
const path = require('path');

/**
 * 🛡️ Security Rules (Super-Greedy Version)
 * go fmt による改行や空白の影響を完全に無効化し、キーワードの組み合わせで検知します。
 */
function scanCode(code, file) {
    const findings = [];
    const add = (title, severity, desc) => findings.push({ title, severity, description: desc, file, line: 1 });

    // 1. SQL Injection
    // Sprintf と SQLキーワード、そして %s が含まれているか（距離制限なし）
    if (/fmt\.Sprintf[\s\S]*?(SELECT|INSERT|UPDATE|DELETE|DROP)[\s\S]*?%s/i.test(code)) {
        add('SQL Injection', 'CRITICAL', 'fmt.Sprintfによる動的SQL構築を検知。');
    }

    // 2. OS Command Injection
    // exec.Command と sh/bash/cmd、-c が含まれているか
    if (/exec\.Command[\s\S]*?(sh|bash|cmd)[\s\S]*?(-c|\/c)/i.test(code)) {
        add('OS Command Injection', 'CRITICAL', 'シェルを介したコマンド実行を検知。');
    }

    // 3. XSS
    if (/template\.(HTML|JS|URL)/.test(code)) {
        add('Cross-Site Scripting (XSS)', 'HIGH', 'HTMLエスケープのバイパスを検知。');
    }

    // 4. SSRF
    // SprintfでURLを作っており、かつ httpパッケージの呼び出しがあるか
    const hasDynamicUrl = /fmt\.Sprintf[\s\S]*?https?:\/\/[\s\S]*?%s/i.test(code);
    const hasHttpCall = /http\.(Get|Post|Do|NewRequest)/.test(code);
    if (hasDynamicUrl && hasHttpCall) {
        add('SSRF Risk', 'HIGH', '動的に生成されたURLへのHTTPリクエストを検知。');
    }

    // 5. Hardcoded Secret
    // api_key等のキーワードの後に引用符で囲まれた16文字以上の文字列があるか
    if (/(api_?key|password|secret|token)[\s\S]*?[:=][\s\S]*?["'`]([a-zA-Z0-9_\-]{16,})["'`]/i.test(code)) {
        add('Hardcoded Secret', 'HIGH', '機密情報の直書きを検知。');
    }

    // 6. Swallowed Error (Clean Code)
    // if err != nil { } の間に何（改行・スペース）があっても検知
    if (/if\s+err\s*!=\s*nil\s*\{[\s\n\r]*\}/.test(code)) {
        add('Swallowed Error', 'MEDIUM', 'エラーの黙殺（空のifブロック）を検知。');
    }

    return findings;
}

/**
 * 🚀 Main Engine
 */
function run() {
    console.log("🚀 Custom SAST Engine: Version 4.0 (Super-Greedy)");
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
