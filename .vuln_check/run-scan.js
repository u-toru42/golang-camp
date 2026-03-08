const fs = require('fs');
const path = require('path');

// ルールのインポートをより確実に
const rulesPath = path.resolve(__dirname, 'rules.js');
const scanRule = require(rulesPath);

function run() {
    console.log("🚀 Custom SAST Engine Initialized");
    const targetDir = './design_patterns';
    
    // ディレクトリが存在するか念のため再確認
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

    for (const filePath of files) {
        const sourceCode = fs.readFileSync(filePath, 'utf8');
        const relativePath = path.relative(process.cwd(), filePath);
        
        console.log(`👉 Scanning: ${relativePath} (${sourceCode.length} chars)`);
        
        try {
            // スキャン実行
            const findings = scanRule(sourceCode, relativePath);
            if (findings && findings.length > 0) {
                findings.forEach(f => {
                    f.message = `[${f.title}] ${f.description}`;
                    allFindings.push(f);
                });
            }
        } catch (err) {
            console.error(`   ❌ Error in ${relativePath}: ${err.message}`);
        }
    }

    fs.writeFileSync('results.json', JSON.stringify({ findings: allFindings }, null, 2));
    console.log(`=== ✨ Scan completed. Total Issues: ${allFindings.length} ===`);
}

run();
