const sdk = require('@caido/sdk-client');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log("🔗 Connecting to Caido instance at http://127.0.0.1:8082...");
  
  const client = new sdk.Client({
    url: 'http://127.0.0.1:8082',
    accessToken: process.env.CAIDO_API_TOKEN
  });

  // 1. 【重要】GraphQLのメソッド名の不一致を解消するパッチ
  // SDK内部が .mutation() を探し、実際には .mutate() しか存在しない問題を解決します
  if (client.graphql) {
    if (!client.graphql.mutation && client.graphql.mutate) {
      console.log("🛠️  Patching client.graphql.mutation with client.graphql.mutate");
      client.graphql.mutation = client.graphql.mutate;
    }
  }

  // 2. 各SDKサービスを個別に初期化
  // sdk.from に頼らず、確実に存在が確認できているクラスをインスタンス化します
  const projectSDK = new sdk.ProjectSDK(client);
  const workflowSDK = new sdk.WorkflowSDK(client);

  const targetDir = './design_patterns';
  const workflowPath = './.caido/sast-scanner.json';

  try {
    // 3. プロジェクトの作成または取得
    const projectName = `SAST-Go-Patterns-${new Date().toISOString().split('T')[0]}`;
    console.log(`📂 Managing project: ${projectName}`);
    
    let project;
    try {
      project = await projectSDK.create({ name: projectName });
      console.log(`✅ Project created: ${project.id}`);
    } catch (e) {
      console.log("⚠️  Project might exist, fetching list...");
      const projects = await projectSDK.list();
      project = projects.find(p => p.name === projectName);
      if (!project) throw new Error("Could not find or create project.");
      console.log(`✅ Project found: ${project.id}`);
    }
    
    await projectSDK.select(project.id);

    // 4. ワークフローデータの準備
    if (!fs.existsSync(workflowPath)) throw new Error(`Workflow not found at ${workflowPath}`);
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

    // 5. Goファイルの収集
    const files = fs.readdirSync(targetDir, { recursive: true })
                   .filter(file => file.endsWith('.go'))
                   .map(file => path.join(targetDir, file));

    console.log(`🔍 Found ${files.length} Go files. Starting scan...`);

    const allFindings = [];

    // 6. スキャンの実行
    for (const filePath of files) {
      const sourceCode = fs.readFileSync(filePath, 'utf8');
      
      try {
        // SDKのバージョンにより名称が異なる可能性があるため柔軟に対応
        const runMethod = workflowSDK.runWorkflow || workflowSDK.run || workflowSDK.execute;
        
        const result = await runMethod.call(workflowSDK, workflowData, {
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

    // 7. 結果の保存
    const finalResult = {
      findings: allFindings,
      scannedAt: new Date().toISOString()
    };

    fs.writeFileSync('results.json', JSON.stringify(finalResult, null, 2));
    console.log(`✨ Scan completed. Found ${allFindings.length} issues.`);

  } catch (error) {
    console.error("❌ SDK Runtime Error:", error.message);
    // エラー情報を書き出して GitHub Actions のコメントで確認できるようにする
    fs.writeFileSync('results.json', JSON.stringify({ error: error.message, stack: error.stack }, null, 2));
    process.exit(1);
  }
}

run();
