const fs = require('fs');
const path = require('path');

/**
 * 🛡️ Security Engine (Normalized Search)
 * 思想: フォーマットの差を「正規化」で無効化し、パターンの意図を確実に抽出する。
 */
function scanCode(rawCode, file) {
    const findings = [];
    const add = (title, severity, desc) => findings.push({ title, severity, description: desc, file, line: 1 });

    // 【重要】コードの正規化: 全ての改行と連続する空白を1つのスペースに変換
    const code = rawCode.replace(/\s+/g, ' ');

    // 1. SQL Injection
    // fmt.Sprintf の後に SQLキーワードがあり、かつ %s が含まれるかを判定
    if (/fmt\.Sprintf\s*\(\s*["'`](SELECT|INSERT|UPDATE|DELETE|DROP)[\s\S]*?%s/i.test(code)) {
        add('SQL Injection', 'CRITICAL', '動的なSQL構築（fmt.Sprintf）を検知。');
    }

    // 2. OS Command Injection
    // exec.Command の引数にシェル(sh/bash/cmd)とフラグ(-c)が含まれるかを判定
    if (/exec\.Command\s*\([\s\S]*?(sh|bash|cmd)[\s\S]*?(-c|\/c)/i.test(code)) {
        add('OS Command Injection', 'CRITICAL', '外部入力を伴うシェルコマンド実行を検知。');
    }

    // 3. XSS (既に検知できているが、正規化版でより確実に)
    if (/template\.(HTML|JS|URL)\s*\(/.test(code)) {
        add('Cross-Site Scripting (XSS)', 'HIGH', 'HTMLエスケープのバイパスを検知。');
    }

    // 4. SSRF
    // http://...%s という形式のURL生成と、http.Getなどの実行が両方ある場合
    if (/Sprintf[\s\S]*?https?:\/\/[\s\S]*?%s/i.test(code) && /http\.(Get|Post|Do|NewRequest)/.test(code)) {
        add('SSRF Risk', 'HIGH', '動的に生成されたURLへのHTTPリクエストを検知。');
    }

    // 5. Hardcoded Secret
    // ApiKey などの名前の後に、16文字以上の引用符で囲まれた文字列がある場合
    if (/(api_?key|password|secret|token)[\s\S]*?[:=][\s\S]*?["'`]([a-zA-Z0-9_\-]{16,})["'`]/i.test(code)) {
        add('Hardcoded Secret', 'HIGH', 'ソースコード内の機密情報を検知。');
    }

    // 6. Swallowed Error (Clean Code / OWASP A09)
    // 正規化されたコードで if err != nil { } を探す（中身が空）
    if (/if\s+err\s*!=\s*nil\s*\{\s*\}/.test(code)) {
        add('Swallowed Error', 'MEDIUM', 'エラーの黙殺（空のifブロック）を検知。');
    }

    return findings;
}

function run() {
    console.log("🚀 Custom SAST Engine: Version 6.0 (Normalization Mode)");
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

    fs.writeFileSync('results.json', JSON.stringify({ findings: allFindings }, null, 2));
    console.log(`=== ✨ Scan completed. Total Issues: ${allFindings.length} ===`);
}

run();
