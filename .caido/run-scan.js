const fs = require('fs');
const path = require('path');
// SDKの不具合を回避するため、標準の fetch を使用します

const CAIDO_URL = 'http://127.0.0.1:8082/graphql';
const API_TOKEN = process.env.CAIDO_API_TOKEN;

// GraphQLリクエストを送信する共通関数
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
    // 1. プロジェクトの作成 (Raw GraphQL Mutation)
    const projectName = `SAST-Go-Patterns-${new Date().toISOString().split('T')[0]}`;
    console.log(`📂 Creating project: ${projectName}`);
    
    const createProjectQuery = `
      mutation CreateProject($input: CreateProjectInput!) {
        createProject(input: $input) {
          project {
            id
            name
          }
        }
      }
    `;

    let projectId;
    try {
      const data = await graphqlRequest(createProjectQuery, { input: { name: projectName } });
      projectId = data.createProject.project.id;
      console.log(`✅ Project created: ${projectId}`);
    } catch (e) {
      console.log(`⚠️  Creation failed (${e.message}), attempting to list projects...`);
      // プロジェクト一覧の取得
      const listProjectsQuery = `query { projects { edges { node { id name } } } }`;
      const listData = await graphqlRequest(listProjectsQuery);
      const existing = listData.projects.edges.find(e => e.node.name === projectName);
      if (!existing) throw new Error("Failed to find or create project.");
      projectId = existing.node.id;
      console.log(`✅ Project found: ${projectId}`);
    }

    // 2. プロジェクトの選択
    const selectProjectQuery = `mutation SelectProject($id: ID!) { selectProject(id: $id) { id } }`;
    await graphqlRequest(selectProjectQuery, { id: projectId });
    console.log(`✅ Project selected.`);

    // 3. ワークフローデータの準備
    if (!fs.existsSync(workflowPath)) throw new Error(`Workflow not found at ${workflowPath}`);
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

    // 4. Goファイルの収集
    const files = fs.readdirSync(targetDir, { recursive: true })
                   .filter(file => file.endsWith('.go'))
                   .map(file => path.join(targetDir, file));

    console.log(`🔍 Found ${files.length} Go files. Starting scan...`);

    const allFindings = [];

    // 5. スキャンの実行 (Automate Run Workflow)
    // ワークフローを実行するGraphQL Mutation
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

        // 実行結果（finding）があれば追加
        if (result.runWorkflow && result.runWorkflow.findings) {
          allFindings.push(...result.runWorkflow.findings);
        }
      } catch (scanErr) {
         // GraphQLの仕様上、ここはエラーになりにくいですが、フィールド名違いなどのため捕捉
         // Caidoのバージョンによっては mutation 名が異なる可能性があります
         console.warn(`⚠️  Skip ${filePath}: ${scanErr.message}`);
      }
    }

    // 6. 結果の保存
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