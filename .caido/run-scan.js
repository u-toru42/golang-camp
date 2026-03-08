const { CaidoClient } = require('@caido/sdk-client');
const fs = require('fs');

async function run() {
  // 1. クライアントの初期化（ローカルインスタンスに接続）
  const client = new CaidoClient({
    host: '127.0.0.1',
    port: 8082,
    apiKey: process.env.CAIDO_API_TOKEN // 必要に応じて設定
  });

  try {
    console.log("Connecting to Caido...");
    
    // 2. プロジェクトの作成または選択
    const project = await client.projects.create({ name: "CI-Scan-" + Date.now() });
    await client.projects.select(project.id);

    // 3. ワークフロー（JSONファイル）の読み込み
    const workflowData = JSON.parse(fs.readFileSync('.caido/sast-scanner.json', 'utf8'));
    
    console.log("Starting Workflow...");
    // 4. オートメーションの実行
    // ※SDKの仕様によりメソッド名は微調整が必要な場合があります
    const result = await client.automate.runWorkflow(workflowData, {
      input: "." // スキャン対象のパス
    });

    // 5. 結果を保存
    fs.writeFileSync('results.json', JSON.stringify(result, null, 2));
    console.log("Scan completed successfully.");

  } catch (error) {
    console.error("SDK Error:", error);
    process.exit(1);
  }
}

run();