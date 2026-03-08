const { CaidoClient } = require('@caido/sdk-client');
const fs = require('fs');
const path = require('path');

async function run() {
  const client = new CaidoClient({
    host: '127.0.0.1',
    port: 8082,
    apiKey: process.env.CAIDO_API_TOKEN
  });

  const targetDir = './design_patterns';
  const workflowPath = './.caido/sast-scanner.json';

  try {
    console.log(`🚀 Scanning directory: ${targetDir}`);
    
    // 1. プロジェクトの作成（一意の名前を付与）
    const projectName = `SAST-Go-Patterns-${new Date().toISOString().split('T')[0]}`;
    const project = await client.projects.create({ name: projectName });
    await client.projects.select(project.id);
    console.log(`✅ Project created: ${projectName}`);

    // 2. ワークフロー（JSON）の読み込み
    const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

    // 3. Goファイルの収集 (再帰的)
    const files = fs.readdirSync(targetDir, { recursive: true })
                   .filter(file => file.endsWith('.go'))
                   .map(file => path.join(targetDir, file));

    console.log(`🔍 Found ${files.length} Go files. Starting analysis...`);

    const allFindings = [];

    // 4. 各ファイルをワークフローに投入
    for (const filePath of files) {
      const sourceCode = fs.readFileSync(filePath, 'utf8');
      
      // ワークフローを実行
      // ※SDKのメソッド名は実際のバージョンにより `automate.run` 等に読み替えてください
      const result = await client.automate.runWorkflow(workflow, {
        input: sourceCode,
        fileName: filePath
      });

      if (result && result.findings) {
        allFindings.push(...result.findings);
      }
    }

    // 5. 結果の保存
    const finalResult = {
      project: projectName,
      findings: allFindings,
      scannedAt: new Date().toISOString()
    };

    fs.writeFileSync('results.json', JSON.stringify(finalResult, null, 2));
    console.log(`✨ Scan completed. Results saved to results.json`);

  } catch (error) {
    console.error("❌ SDK Error:", error.message);
    process.exit(1);
  }
}

run();