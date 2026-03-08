const sdk = require('@caido/sdk-client');
const fs = require('fs');
const path = require('path');

const CaidoClass = sdk.Client; 

async function run() {
  // 修正ポイント：host/port ではなく url 文字列として渡す
  // また、プロパティ名が accessToken になっている可能性が高いです
  console.log("🔗 Connecting to Caido instance at http://127.0.0.1:8082...");
  
  const client = new CaidoClass({
    url: 'http://127.0.0.1:8082',
    accessToken: process.env.CAIDO_API_TOKEN
  });

  const targetDir = './design_patterns';
  const workflowPath = './.caido/sast-scanner.json';

  try {
    // 1. プロジェクトの作成
    const projectName = `SAST-Go-Patterns-${new Date().toISOString().split('T')[0]}`;
    console.log(`📂 Creating/Selecting project: ${projectName}`);
    
    // 最近のSDKでは projects.getOrCreate などが推奨される場合がありますが、
    // まずは既存のロジックを最新プロパティで修正します
    const project = await client.projects.create({ name: projectName });
    await client.projects.select(project.id);

    // 2. ワークフローの読み込み
    if (!fs.existsSync(workflowPath)) {
        throw new Error(`Workflow file not found at ${workflowPath}`);
    }
    const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

    // 3. Goファイルの収集
    const files = fs.readdirSync(targetDir, { recursive: true })
                   .filter(file => file.endsWith('.go'))
                   .map(file => path.join(targetDir, file));

    console.log(`🔍 Found ${files.length} Go files. Starting analysis...`);

    const allFindings = [];

    // 4. スキャンの実行
    for (const filePath of files) {
      const sourceCode = fs.readFileSync(filePath, 'utf8');
      
      try {
        // SDK v0.55+ では automate.runWorkflow の引数構造も確認が必要ですが
        // まずはここまでの接続を確認します
        const result = await client.automate.runWorkflow(workflow.id || workflow, {
          input: sourceCode,
          fileName: filePath
        });

        if (result && result.findings) {
          allFindings.push(...result.findings);
        }
      } catch (scanErr) {
        console.warn(`⚠️  Skip file ${filePath}: ${scanErr.message}`);
      }
    }

    const finalResult = {
      project: projectName,
      findings: allFindings,
      scannedAt: new Date().toISOString()
    };

    fs.writeFileSync('results.json', JSON.stringify(finalResult, null, 2));
    console.log(`✨ Scan completed. Found ${allFindings.length} issues.`);

  } catch (error) {
    console.error("❌ SDK Runtime Error:", error.message);
    // エラー内容を results.json に書き出して GitHub Comment で確認できるようにする
    fs.writeFileSync('results.json', JSON.stringify({ error: error.message }, null, 2));
    process.exit(1);
  }
}

run();
