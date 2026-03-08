const sdk = require('@caido/sdk-client');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log("🔗 Connecting to Caido instance at http://127.0.0.1:8082...");
  
  const client = new sdk.Client({
    url: 'http://127.0.0.1:8082',
    accessToken: process.env.CAIDO_API_TOKEN
  });

  // メソッド名の不一致を修正（重要！）
  // SDK内部が .mutation() を探し、ライブラリが .mutate() を持っている場合の橋渡し
  if (client.graphql && !client.graphql.mutation && client.graphql.mutate) {
    client.graphql.mutation = client.graphql.mutate;
  }

  // リサーチいただいた「sdk.from()」を使用して全サービスへアクセス可能にします
  const caido = sdk.from(client);

  const targetDir = './design_patterns';
  const workflowPath = './.caido/sast-scanner.json';

  try {
    // 1. プロジェクトの作成/選択
    const projectName = `SAST-Go-Patterns-${new Date().toISOString().split('T')[0]}`;
    console.log(`📂 Managing project: ${projectName}`);
    
    let project;
    try {
      project = await caido.projects.create({ name: projectName });
    } catch (e) {
      // 既に存在する場合は一覧から取得
      const projects = await caido.projects.list();
      project = projects.find(p => p.name === projectName);
    }
    
    await caido.projects.select(project.id);
    console.log(`✅ Project selected: ${project.id}`);

    // 2. ワークフローデータの準備
    if (!fs.existsSync(workflowPath)) throw new Error(`Workflow not found at ${workflowPath}`);
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

    // 3. Goファイルの収集
    const files = fs.readdirSync(targetDir, { recursive: true })
                   .filter(file => file.endsWith('.go'))
                   .map(file => path.join(targetDir, file));

    console.log(`🔍 Found ${files.length} Go files. Starting scan...`);

    const allFindings = [];

    // 4. スキャンの実行
    for (const filePath of files) {
      const sourceCode = fs.readFileSync(filePath, 'utf8');
      
      try {
        // caido.workflows または caido.automate を使用
        const manager = caido.workflows || caido.automate;
        // メソッド名は runWorkflow または run
        const runMethod = manager.runWorkflow || manager.run;
        
        const result = await runMethod.call(manager, workflowData, {
          input: sourceCode,
          fileName: filePath
        });

        if (result && result.findings) {
          allFindings.push(...result.findings);
        }
      } catch (scanErr) {
        console.warn(`⚠️  Skip ${filePath}: ${scanErr.message}`);
      }
    }

    // 5. 結果の保存
    const finalResult = {
      findings: allFindings,
      scannedAt: new Date().toISOString()
    };

    fs.writeFileSync('results.json', JSON.stringify(finalResult, null, 2));
    console.log(`✨ Scan completed. Found ${allFindings.length} issues.`);

  } catch (error) {
    console.error("❌ SDK Runtime Error:", error.message);
    console.error(error.stack);
    fs.writeFileSync('results.json', JSON.stringify({ error: error.message }, null, 2));
    process.exit(1);
  }
}

run();