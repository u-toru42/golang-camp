const fs = require('fs');
const path = require('path');

const CAIDO_URL = 'http://127.0.0.1:8082/graphql';
const API_TOKEN = process.env.CAIDO_API_TOKEN;

async function graphqlRequest(query, variables = {}) {
  const response = await fetch(CAIDO_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`
    },
    body: JSON.stringify({ query, variables })
  });

  const json = await response.json();
  if (json.errors) {
    throw new Error(json.errors.map(e => e.message).join(', '));
  }
  return json.data;
}

async function run() {
  console.log("🔗 Connecting to Caido instance via Raw GraphQL...");
  
  const targetDir = './design_patterns';
  const workflowPath = './.caido/sast-scanner.json';

  try {
    const projectName = `SAST-Go-Patterns-${new Date().toISOString().split('T')[0]}`;
    console.log(`📂 Creating project: ${projectName}`);
    
    // 修正1: temporary フィールドが必須になったCaidoの最新仕様に対応
    const createProjectQuery = `
      mutation CreateProject($input: CreateProjectInput!) {
        createProject(input: $input) {
          project { id name }
        }
      }
    `;

    let projectId;
    try {
      // temporary: false を明示的に渡す
      const data = await graphqlRequest(createProjectQuery, { 
          input: { name: projectName, temporary: false } 
      });
      projectId = data.createProject.project.id;
      console.log(`✅ Project created: ${projectId}`);
    } catch (e) {
      console.log(`⚠️  Creation failed (${e.message}), attempting to list projects...`);
      // 修正2: edges を使わないフラットなリスト形式に修正
      const listProjectsQuery = `query { projects { id name } }`;
      const listData = await graphqlRequest(listProjectsQuery);
      
      const existing = listData.projects.find(p => p.name === projectName);
      if (!existing) throw new Error("Failed to find or create project.");
      projectId = existing.id;
      console.log(`✅ Project found: ${projectId}`);
    }

    // プロジェクトの選択
    const selectProjectQuery = `mutation SelectProject($id: ID!) { selectProject(id: $id) { id } }`;
    await graphqlRequest(selectProjectQuery, { id: projectId });
    console.log(`✅ Project selected.`);

    if (!fs.existsSync(workflowPath)) throw new Error(`Workflow not found at ${workflowPath}`);
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

    const files = fs.readdirSync(targetDir, { recursive: true })
                   .filter(file => file.endsWith('.go'))
                   .map(file => path.join(targetDir, file));

    console.log(`🔍 Found ${files.length} Go files. Starting scan...`);

    const allFindings = [];

    // ワークフロー実行クエリ
    const runWorkflowQuery = `
      mutation RunWorkflow($workflow: JSON!, $input: String!, $fileName: String) {
        runWorkflow(input: { workflow: $workflow, payload: $input, params: { fileName: $fileName } }) {
          findings {
            title
            description
            severity
            filePath
          }
        }
      }
    `;

    for (const filePath of files) {
      const sourceCode = fs.readFileSync(filePath, 'utf8');
      
      try {
        const result = await graphqlRequest(runWorkflowQuery, {
          workflow: workflowData,
          input: sourceCode,
          fileName: filePath
        });

        if (result.runWorkflow && result.runWorkflow.findings) {
          allFindings.push(...result.runWorkflow.findings);
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
    console.error("❌ Fatal Error:", error.message);
    fs.writeFileSync('results.json', JSON.stringify({ error: error.message }, null, 2));
    process.exit(1);
  }
}

run();