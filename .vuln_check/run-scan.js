const fs = require('fs');
const path = require('path');

/**
 * 🛡️ Security Engine (Line-by-Line Analysis)
 * 思想: 正規表現の複雑さを排除し、堅牢性を最優先する。
 */
function scanCode(code, file) {
    const findings = [];
    const lines = code.split('\n');
    const add = (title, severity, desc, lineNo) => 
        findings.push({ title, severity, description: desc, file, line: lineNo });

    // ファイル全体でのフラグ（複数行にまたがる検知用）
    let hasSprintf = false;
    let hasHttpCall = false;

    lines.forEach((line, index) => {
        const lineNo = index + 1;
        const trimmedLine = line.trim();

        // 1. SQL Injection: 同じ行、もしくは近くの行に Sprintf と SQLコマンドがあるか
        if (/fmt\.Sprintf/i.test(line) && /(SELECT|INSERT|UPDATE|DELETE|DROP)/i.test(line)) {
            add('SQL Injection', 'CRITICAL', 'fmt.Sprintfによる動的SQL構築。', lineNo);
        }

        // 2. OS Command Injection: exec.Command とシェル指定
        if (/exec\.Command/i.test(line) && /(sh|bash|cmd)/i.test(line)) {
            add('OS Command Injection', 'CRITICAL', 'シェルを介したコマンド実行。', lineNo);
        }

        // 3. XSS
        if (/template\.(HTML|JS|URL)/.test(line)) {
            add('Cross-Site Scripting (XSS)', 'HIGH', 'HTMLエスケープのバイパス。', lineNo);
        }

        // 4. SSRF 用のフラグ収集
        if (/fmt\.Sprintf/i.test(line) && /https?:\/\//i.test(line)) hasSprintf = true;
        if (/http\.(Get|Post|Do|NewRequest)/.test(line)) hasHttpCall = true;

        // 5. Hardcoded Secret: 変数名に秘密情報っぽさがあり、かつ長い文字列が代入されている
        // 文字列のキャラクタセットを [^"'`]+ (引用符以外すべて) に広げて確実にキャッチ
        if (/(api_?key|password|secret|token|passwd)/i.test(line) && /[:=]\s*["'`]([^"'`]{16,})["'`]/i.test(line)) {
            add('Hardcoded Secret', 'HIGH', '機密情報の直書き。', lineNo);
        }

        // 6. Swallowed Error: if err != nil { } (1行、または2行にまたがる空ブロック)
        if (/if\s+err\s*!=\s*nil\s*\{\s*\}/.test(trimmedLine)) {
            add('Swallowed Error', 'MEDIUM', 'エラーの黙殺（空ブロック）。', lineNo);
        }
    });

    // 4. SSRF の判定（ファイル内に両方の要素があれば警告）
    if (hasSprintf && hasHttpCall) {
        add('SSRF Risk', 'HIGH', '動的なURL生成とHTTPリクエストの混在。', 1);
    }

    // 特殊ケース: 複数行にわたる Swallowed Error (go fmt用)
    if (/if\s+err\s*!=\s*nil\s*\{\s*[\r\n]+\s*\}/.test(code)) {
        add('Swallowed Error', 'MEDIUM', 'エラーの黙殺（複数行の空ブロック）。', 1);
    }

    return findings;
}

function run() {
    console.log("🚀 Custom SAST Engine: Version 5.0 (Line-by-Line)");
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
            console.log(`   ✅ Found ${results.length} issues!`);
            allFindings.push(...results.map(r => ({ ...r, message: `[${r.title}] ${r.description}` })));
        }
    });

    fs.writeFileSync('results.json', JSON.stringify({ findings: allFindings }, null, 2));
    console.log(`=== ✨ Scan completed. Total: ${allFindings.length} ===`);
}

run();
