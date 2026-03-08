const sdk = require('@caido/sdk-client');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log("🔗 Connecting to Caido instance at http://127.0.0.1:8082...");
  
  const client = new sdk.Client({
    url: 'http://127.0.0.1:8082',
    accessToken: process.env.CAIDO_API_TOKEN
  });

  // 【最重要】GraphQL 内部クライアントの配線修正
  if (client.graphql) {
    const internalClient = client.graphql.client;
    if (internalClient) {
      console.log("🔍 Internal GraphQL client found. Methods:", Object.keys(internalClient));
      
      // 通信メソッドを特定（request または query または execute）
      const execMethod = internalClient.request || internalClient.query || internalClient.execute;
      
      if (execMethod) {
        // ProjectSDKが期待する場所に、実体をバインドして配置
        client.graphql.query = execMethod.bind(internalClient);
        client.graphql.mutation = execMethod.bind(internalClient);
        console.log("🛠️  GraphQL bypass established using internal client.");
      }
    } else {
      // client プロパティがない場合の最終手段（直接 client.graphql をパッチ）
      client.graphql.query = client.graphql.query || client.graphql.request;
      client.graphql.mutation = client.graphql.mutation || client.graphql.request;
    }
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
      project = await projectSDK.create({ name: projectName });
      console.log(`✅ Project created: ${project.id}`);
    } catch (e) {
      console.log("⚠️  Creation failed, attempting to find existing project...");
      const projects = await projectSDK.list();
      project = projects.find(p => p.name === projectName);
      if (!project) throw new Error("Could not find or create project: " + e.message);
      console.log(`✅ Project found: ${project.id}`);
    }
    
    await projectSDK.select(project.id);

    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

    const files = fs.readdirSync(targetDir, { recursive: true })
                   .filter(file => file.endsWith('.go'))
                   .map(file => path.join(targetDir, file));

    console.log(`🔍 Found ${files.length} Go files. Starting scan...`);

    const allFindings = [];

    for (const filePath of files) {
      const sourceCode = fs.readFileSync(filePath, 'utf8');
      try {
        const runMethod = workflowSDK.runWorkflow || workflowSDK.run || workflowSDK.execute;
        const result = await runMethod.call(workflowSDK, workflowData, {
          input: sourceCode,
          fileName: filePath
        });
        if (result && result.findings) allFindings.push(...result.findings);
      } catch (scanErr) {
        console.warn(`⚠️ Skip ${filePath}: ${scanErr.message}`);
      }
    }

    const finalResult = { findings: allFindings, scannedAt: new Date().toISOString() };
    fs.writeFileSync('results.json', JSON.stringify(finalResult, null, 2));
    console.log(`✨ Done! Found ${allFindings.length} findings.`);

  } catch (error) {
    console.error("❌ SDK Runtime Error:", error.message);
    fs.writeFileSync('results.json', JSON.stringify({ error: error.message }, null, 2));
    process.exit(1);
  }
}

run();
