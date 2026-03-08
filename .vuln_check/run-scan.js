const fs = require('fs');
const path = require('path');

// 同じ .vuln_check フォルダ内にある rules.js を読み込む
const scanRule = require(path.join(__dirname, 'rules.js'));

function run() {
    console.log("🚀 Starting Custom SAST Engine...");
    
    const targetDir = './design_patterns';
    const resultsFile = 'results.json';

    try {
        const files = fs.readdirSync(targetDir, { recursive: true })
            .filter(file => file.endsWith('.go'))
            .map(file => path.join(targetDir, file));

        console.log(`🔍 Scanning ${files.length} Go files...`);
        files.forEach(f => console.log(`👉 Checking: ${f}`));
        
        const allFindings = [];

        for (const filePath of files) {
            const sourceCode = fs.readFileSync(filePath, 'utf8');
            try {
                const findings = scanRule(sourceCode, filePath);
                
                if (findings && findings.length > 0) {
                    findings.forEach(f => {
                        f.message = `[${f.title}] ${f.description}`;
                    });
                    allFindings.push(...findings);
                }
            } catch (scanErr) {
                console.warn(`⚠️ Skip ${filePath}: ${scanErr.message}`);
            }
        }

        const finalResult = {
            findings: allFindings,
            scannedAt: new Date().toISOString()
        };

        fs.writeFileSync(resultsFile, JSON.stringify(finalResult, null, 2));
        console.log(`✨ Scan completed. Found ${allFindings.length} vulnerabilities.`);

    } catch (error) {
        console.error("❌ Fatal Error:", error.message);
        fs.writeFileSync(resultsFile, JSON.stringify({ error: error.message }, null, 2));
        process.exit(1);
    }
}

run();