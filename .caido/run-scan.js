const sdk = require('@caido/sdk-client');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log("🔗 Connecting to Caido instance at http://127.0.0.1:8082...");
  
  const client = new sdk.Client({
    url: 'http://127.0.0.1:8082',
    accessToken: process.env.CAIDO_API_TOKEN
  });

  // 【最重要】Urql クライアントのメソッドをラッパーにバインドする
  if (client.graphql) {
    // ログから client.graphql または client.graphql.client が Urql クライアントであると判明
    const innerClient = client.graphql.client || client.graphql;
    
    // SDK 内部が求めている this.graphql.query と this.graphql.mutation を明示的に生やす
    if (innerClient.query) {
      client.graphql.query = innerClient.query.bind(innerClient);
    }
    if (innerClient.mutation) {
      client.graphql.mutation = innerClient.mutation.bind(innerClient);
    }
    
    // 念のため、古い SDK が期待するかもしれない request メソッドもシミュレート
    if (!client.graphql.request) {
      client.graphql.request = async (doc, vars) => {
         // Urql の query を Promisify して返すラッパー
         const result = await innerClient.query(doc, vars).toPromise();
         if (result.error) throw result.error;
         return result.data;
      };
    }
    
    console.log("🛠️  GraphQL Wrapper fully patched for Urql.");
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
      if (!project) throw new Error("Could not find or create project.");
      console.log(`✅ Project found: ${project.id}`);
    }
    
    await projectSDK.select(project.id);

    if (!fs.existsSync(workflowPath)) throw new Error(`Workflow not found at ${workflowPath}`);
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