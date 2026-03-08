// クラス名を CaidoClient から Caido に変更
const sdk = require('@caido/sdk-client');
const fs = require('fs');
const path = require('path');

// デバッグ用：SDKの中身に何が入っているか確認
console.log("SDK Exports:", Object.keys(sdk));

// Caidoクラスを取得（環境によって名前が違う場合の対策）
const CaidoClass = sdk.Caido || sdk.CaidoClient;

if (!CaidoClass) {
  console.error("❌ Error: Could not find Caido class in SDK. Available exports:", Object.keys(sdk));
  process.exit(1);
}

async function run() {
  const client = new CaidoClass({
    host: '127.0.0.1',
    port: 8082,
    apiKey: process.env.CAIDO_API_TOKEN
  });

  const targetDir = './design_patterns';
  const workflowPath = './.caido/sast-scanner.json';

  try {
    console.log(`🚀 Scanning directory: ${targetDir}`);
    
    // プロジェクトの作成
    const projectName = `SAST-Go-Patterns-${new Date().toISOString().split('T')[0]}`;
    const project = await client.projects.create({ name: projectName });
    await client.projects.select(project.id);
    console.log(`✅ Project created: ${projectName}`);

    // ワークフローの読み込み
    if (!fs.existsSync(workflowPath)) {
        throw new Error(`Workflow file not found at ${workflowPath}`);
    }
    const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

    // Goファイルの収集
    const files = fs.readdirSync(targetDir, { recursive: true })
                   .filter(file => file.endsWith('.go'))
                   .map(file => path.join(targetDir, file));

    console.log(`🔍 Found ${files.length} Go files. Starting analysis...`);

    const allFindings = [];

    for (const filePath of files) {
      const sourceCode = fs.readFileSync(filePath, 'utf8');
      
      // 実行。SDKのバージョンにより automate.runWorkflow または automate.run
      const result = await client.automate.runWorkflow(workflow, {
        input: sourceCode,
        fileName: filePath
      });

      if (result && result.findings) {
        allFindings.push(...result.findings);
      }
    }

    const finalResult = {
      project: projectName,
      findings: allFindings,
      scannedAt: new Date().toISOString()
    };

    fs.writeFileSync('results.json', JSON.stringify(finalResult, null, 2));
    console.log(`✨ Scan completed. Results saved to results.json`);

  } catch (error) {
    console.error("❌ SDK Error:", error.message);
    // 詳細なスタックトレースを表示
    console.error(error);
    process.exit(1);
  }
}

run();
