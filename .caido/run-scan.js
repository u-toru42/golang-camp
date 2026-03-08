const sdk = require('@caido/sdk-client');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log("🔗 Connecting to Caido instance at http://127.0.0.1:8082...");
  
  const client = new sdk.Client({
    url: 'http://127.0.0.1:8082',
    accessToken: process.env.CAIDO_API_TOKEN
  });

  // 【最重要】GraphQLメソッドのユニバーサル・パッチ
  if (client.graphql) {
    console.log("🔍 Inspecting graphql client keys:", Object.keys(client.graphql));
    
    // query がない場合、mutate や execute を代わりに入れる
    client.graphql.query = client.graphql.query || client.graphql.mutate || client.graphql.execute || client.graphql.request;
    // mutation がない場合、mutate や execute を代わりに入れる
    client.graphql.mutation = client.graphql.mutation || client.graphql.mutate || client.graphql.execute || client.graphql.request;
    
    console.log("🛠️  GraphQL methods patched.");
  }

  const projectSDK = new sdk.ProjectSDK(client);
  const workflowSDK = new sdk.WorkflowSDK(client);

  const targetDir = './design_patterns';
  const workflowPath = './.caido/sast-scanner.json';

  try {
    const projectName = `SAST-Go-Patterns-${new Date().toISOString().split('T')[0]}`;
    console.log(`📂 Managing project: ${projectName}`);
    
    let project;
    try {
      // 内部で .query() や .mutation() を呼ぶため、上のパッチが効きます
      project = await projectSDK.create({ name: projectName });
      console.log(`✅ Project created: ${project.id}`);
    } catch (e) {
      console.log("⚠️  Creation failed, attempting to find existing project...");
      const projects = await projectSDK.list();
      project = projects.find(p => p.name === projectName);
      if (!project) throw new Error("Could not find or create project.");
      console.log(`✅ Project found: ${project.id}`);
    }
    
    await projectSDK.select(project.id);

    // ワークフロー準備
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

    // Goファイル収集
    const files = fs.readdirSync(targetDir, { recursive: true })
                   .filter(file => file.endsWith('.go'))
                   .map(file => path.join(targetDir, file));

    console.log(`🔍 Found ${files.length} Go files. Starting scan...`);

    const allFindings = [];

    for (const filePath of files) {
      const sourceCode = fs.readFileSync(filePath, 'utf8');
      
      try {
        // workflowSDK のメソッドも念のため柔軟に取得
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

    const finalResult = {
      findings: allFindings,
      scannedAt: new Date().toISOString()
    };

    fs.writeFileSync('results.json', JSON.stringify(finalResult, null, 2));
    console.log(`✨ Scan completed. Found ${allFindings.length} issues.`);

  } catch (error) {
    console.error("❌ SDK Runtime Error:", error.message);
    fs.writeFileSync('results.json', JSON.stringify({ error: error.message }, null, 2));
    process.exit(1);
  }
}

run();
