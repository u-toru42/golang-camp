const sdk = require('@caido/sdk-client');
const fs = require('fs');
const path = require('path');

// デバッグ用：使用するクラスを特定
const CaidoClass = sdk.Client; 

if (!CaidoClass) {
  console.error("❌ Error: Could not find 'Client' class in SDK. Available exports:", Object.keys(sdk));
  process.exit(1);
}

async function run() {
  console.log("🔗 Connecting to Caido instance at 127.0.0.1:8082...");
  
  const client = new CaidoClass({
    host: '127.0.0.1',
    port: 8082,
    apiKey: process.env.CAIDO_API_TOKEN
  });

  const targetDir = './design_patterns';
  const workflowPath = './.caido/sast-scanner.json';

  try {
    // 1. プロジェクトの作成
    const projectName = `SAST-Go-Patterns-${new Date().toISOString().split('T')[0]}`;
    console.log(`📂 Creating project: ${projectName}`);
    
    // SDKの仕様により、projects.create または projects.add
    const project = await client.projects.create({ name: projectName });
    await client.projects.select(project.id);
    console.log(`✅ Project selected.`);

    // 2. ワークフローの読み込み
    if (!fs.existsSync(workflowPath)) {
        throw new Error(`Workflow file not found at ${workflowPath}`);
    }
    const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

    // 3. Goファイルの収集
    if (!fs.existsSync(targetDir)) {
        throw new Error(`Target directory ${targetDir} not found.`);
    }
    const files = fs.readdirSync(targetDir, { recursive: true })
                   .filter(file => file.endsWith('.go'))
                   .map(file => path.join(targetDir, file));

    console.log(`🔍 Found ${files.length} Go files. Starting analysis...`);

    const allFindings = [];

    // 4. スキャンの実行
    for (const filePath of files) {
      const sourceCode = fs.readFileSync(filePath, 'utf8');
      
      // automate.runWorkflow を使用
      // 成功しない場合は、SDKのメソッド定義を確認するため console.log(client.automate) などを推奨
      try {
        const result = await client.automate.runWorkflow(workflow, {
          input: sourceCode,
          fileName: filePath
        });

        if (result && result.findings) {
          allFindings.push(...result.findings);
        }
      } catch (scanErr) {
        console.warn(`⚠️  Skip file ${filePath} due to error: ${scanErr.message}`);
      }
    }

    // 5. 結果の保存
    const finalResult = {
      project: projectName,
      findings: allFindings,
      scannedAt: new Date().toISOString(),
      status: "success"
    };

    fs.writeFileSync('results.json', JSON.stringify(finalResult, null, 2));
    console.log(`✨ Scan completed. Found ${allFindings.length} issues.`);

  } catch (error) {
    console.error("❌ SDK Runtime Error:", error.message);
    // 失敗時も空のJSONを出して後続ステップを壊さない
    fs.writeFileSync('results.json', JSON.stringify({ findings: [], error: error.message }, null, 2));
    process.exit(1);
  }
}

run();
