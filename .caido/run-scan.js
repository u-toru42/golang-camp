const fs = require('fs');
const path = require('path');

// CaidoのJSONルールからJavascriptの検査コードを抽出する関数
function extractRuleFromCaidoJson(jsonPath) {
    const workflowData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    // JSノードを探す
    const jsNode = workflowData.graph.nodes.find(n => n.definition_id === 'caido/js');
    if (!jsNode) throw new Error("Javascript node not found in Caido workflow.");
    
    const codeInput = jsNode.inputs.find(i => i.alias === 'code');
    if (!codeInput) throw new Error("Code input not found in Javascript node.");
    
    // Caidoの export function run(input, sdk) { ... } を抽出
    const rawCode = codeInput.value.data;
    
    // Node.jsで実行可能な関数に変換
    const runnableCode = rawCode.replace(/export\s+function\s+run/, 'function run') + '\nreturn run;';
    return new Function(runnableCode)();
}

function run() {
    console.log("🚀 Starting Lightweight Caido SAST Engine...");
    
    const targetDir = './design_patterns';
    const workflowPath = './.caido/sast-scanner.json';
    const resultsFile = 'results.json';

    try {
        // 1. Caidoルールの読み込み
        const scanRule = extractRuleFromCaidoJson(workflowPath);
        console.log("✅ Caido Rule loaded successfully.");

        // 2. Goファイルの収集
        const files = fs.readdirSync(targetDir, { recursive: true })
            .filter(file => file.endsWith('.go'))
            .map(file => path.join(targetDir, file));

        console.log(`🔍 Scanning ${files.length} Go files...`);
        const allFindings = [];

        // 3. スキャン実行（Caidoエンジンをエミュレート）
        for (const filePath of files) {
            const sourceCode = fs.readFileSync(filePath, 'utf8');
            try {
                // Caidoのルールにソースコードを渡して判定させる
                const result = scanRule(sourceCode, {});
                
                if (result && result.findings && result.findings.length > 0) {
                    // PRコメント用に結果を整形
                    result.findings.forEach(f => {
                        f.file = filePath;
                        f.line = f.line || 1;
                        f.message = `[${f.title}] ${f.description}`;
                    });
                    allFindings.push(...result.findings);
                }
            } catch (scanErr) {
                console.warn(`⚠️ Skip ${filePath}: ${scanErr.message}`);
            }
        }

        // 4. 結果の保存
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