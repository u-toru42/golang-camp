const fs = require('fs');
const path = require('path');
const scanRule = require(path.join(__dirname, 'rules.js'));

function run() {
    console.log("🚀 Starting Custom SAST Engine...");
    const targetDir = './design_patterns';
    const resultsFile = 'results.json';

    try {
        const files = [];
        function getFiles(dir) {
            const dirents = fs.readdirSync(dir, { withFileTypes: true });
            for (const dirent of dirents) {
                const res = path.resolve(dir, dirent.name);
                if (dirent.isDirectory()) getFiles(res);
                else if (dirent.name.endsWith('.go')) files.push(res);
            }
        }
        getFiles(targetDir);
        console.log(`🔍 Found ${files.length} Go files.`);

        const allFindings = [];
        for (const filePath of files) {
            const relativePath = path.relative(process.cwd(), filePath);
            const sourceCode = fs.readFileSync(filePath, 'utf8');
            
            // ログを出力して進捗を確認
            console.log(`👉 Scanning: ${relativePath} (${sourceCode.length} chars)`);
            
            try {
                const findings = scanRule(sourceCode, relativePath);
                if (findings && findings.length > 0) {
                    console.log(`   ✅ [HIT] Found ${findings.length} issues!`);
                    findings.forEach(f => {
                        f.message = `[${f.title}] ${f.description}`;
                    });
                    allFindings.push(...findings);
                }
            } catch (scanErr) {
                console.error(`   ❌ Error in rules.js: ${scanErr.message}`);
            }
        }

        fs.writeFileSync(resultsFile, JSON.stringify({ findings: allFindings }, null, 2));
        console.log(`=== ✨ Scan completed. Total: ${allFindings.length} ===`);
    } catch (error) {
        console.error("❌ Fatal Error:", error.message);
        process.exit(1);
    }
}
run();
