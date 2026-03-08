const sdk = require('@caido/sdk-client');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log("🔗 Connecting to Caido instance at http://127.0.0.1:8082...");
  
  // 1. まず通信の土台（Client）を作る
  const client = new sdk.Client({
    url: 'http://127.0.0.1:8082',
    accessToken: process.env.CAIDO_API_TOKEN
  });

  // 2. Clientの通信機能（connection）を使って、各サービスを個別に初期化する
  // 前のログのExport一覧にあった 'ProjectSDK' や 'WorkflowSDK' を使います
  const projectSDK = new sdk.ProjectSDK(client.connection);
  const workflowSDK = new sdk.WorkflowSDK(client.connection);

  const targetDir = './design_patterns';
  const workflowPath = './.caido/sast-scanner.json';

  try {
    // 3. プロジェクトの作成
    const projectName = `SAST-Go-Patterns-${new Date().toISOString().split('T')[0]}`;
    console.log(`📂 Creating project: ${projectName}`);
    
    // sdk.projects.create ではなく、初期化した projectSDK を使います
    const project = await projectSDK.create({ name: projectName });
    await projectSDK.select(project.id);
    console.log(`✅ Project ready: ${projectName}`);

    // 4. ワークフローの読み込み
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

    // 5. Goファイルの収集
    const files = fs.readdirSync(targetDir, { recursive: true })
                   .filter(file => file.endsWith('.go'))
                   .map(file => path.join(targetDir, file));

    console.log(`🔍 Scanning ${files.length} files...`);

    const allFindings = [];

    // 6. 実行ループ
    for (const filePath of files) {
      const sourceCode = fs.readFileSync(filePath, 'utf8');
      
      try {
        // workflowSDK の実行メソッド（run または execute）を試します
        const result = await workflowSDK.run(workflowData, {
          input: sourceCode,
          fileName: filePath
        });

        if (result && result.findings) {
          allFindings.push(...result.findings);
        }
      } catch (scanErr) {
        console.warn(`⚠️ Skip ${filePath}: ${scanErr.message}`);
      }
    }

    // 7. 結果の保存
    const finalResult = {
      project: projectName,
      findings: allFindings,
      scannedAt: new Date().toISOString()
    };

    fs.writeFileSync('results.json', JSON.stringify(finalResult, null, 2));
    console.log(`✨ Done! Found ${allFindings.length} findings.`);

  } catch (error) {
    console.error("❌ SDK Runtime Error:", error.message);
    fs.writeFileSync('results.json', JSON.stringify({ error: error.message, stack: error.stack }, null, 2));
    process.exit(1);
  }
}

run();
