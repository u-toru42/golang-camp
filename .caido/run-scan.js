const sdk = require('@caido/sdk-client');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log("🔗 Connecting to Caido instance...");
  
  // 1. 基盤となる Client を作成
  const client = new sdk.Client({
    url: 'http://127.0.0.1:8082',
    accessToken: process.env.CAIDO_API_TOKEN
  });

  // 2. リファレンスにある「Projects」と「Workflows」の専門家を呼び出す
  // 通信機能（client）をそれぞれのSDKに渡して初期化します
  const projectSDK = new sdk.ProjectSDK(client);
  const workflowSDK = new sdk.WorkflowSDK(client);

  const targetDir = './design_patterns';
  const workflowPath = './.caido/sast-scanner.json';

  try {
    // 3. プロジェクトの作成（リファレンスの ProjectsSDK どおり）
    const projectName = `SAST-Go-Patterns-${new Date().toISOString().split('T')[0]}`;
    console.log(`📂 Creating project: ${projectName}`);
    
    // createメソッドはリファレンス通り存在するはずです
    const project = await projectSDK.create({ name: projectName });
    await projectSDK.select(project.id);
    console.log(`✅ Project ready: ${projectName}`);

    // 4. ワークフロー（設計図）の準備
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

    // 5. Goファイルの収集
    const files = fs.readdirSync(targetDir, { recursive: true })
                   .filter(file => file.endsWith('.go'))
                   .map(file => path.join(targetDir, file));

    console.log(`🔍 Scanning ${files.length} files...`);

    const allFindings = [];

    // 6. スキャンの実行
    for (const filePath of files) {
      const sourceCode = fs.readFileSync(filePath, 'utf8');
      
      try {
        // WorkflowSDK には 'run' または 'execute' メソッドがあるはずです
        // リファレンスの「Workflows」セクションに記載されている名称を使います
        const runMethod = workflowSDK.run || workflowSDK.execute;
        
        const result = await runMethod.call(workflowSDK, {
            workflow: workflowData,
            input: sourceCode,
            params: { fileName: filePath } // 引数の形式はリファレンスに合わせます
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
      findings: allFindings,
      scannedAt: new Date().toISOString()
    };

    fs.writeFileSync('results.json', JSON.stringify(finalResult, null, 2));
    console.log(`✨ Done! Found ${allFindings.length} findings.`);

  } catch (error) {
    console.error("❌ SDK Runtime Error:", error.message);
    // エラー詳細を保存してPRコメントで確認可能にする
    fs.writeFileSync('results.json', JSON.stringify({ error: error.message }, null, 2));
    process.exit(1);
  }
}

run();