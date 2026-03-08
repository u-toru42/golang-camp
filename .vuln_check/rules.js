/**
 * セキュリティチェックのルールを定義するモジュール
 * @param {string} sourceCode - 検査対象のソースコード（文字列）
 * @param {string} filePath - 検査対象のファイルパス
 * @returns {Array} - 検知された脆弱性のリスト
 */
module.exports = function scanCode(sourceCode, filePath) {
    const findings = [];
    
    if (typeof sourceCode !== 'string') return findings;

    // 🔴 1. OSコマンドインジェクションの検知 (exec.Command)
    // ユーザー入力をそのままシェルに渡すと、任意のコマンドを実行される恐れがあります
    if (sourceCode.includes('exec.Command')) {
        findings.push({
            title: 'OS Command Injection',
            description: '危険な関数 exec.Command が使用されています。ユーザー入力を直接渡さないよう、引数を厳格にバリデーションするか、別の安全なAPIを検討してください。',
            severity: 'CRITICAL',
            file: filePath,
            line: 1 // シンプルな文字列マッチングのため1行目として出力
        });
    }

    // 🔴 2. SQLインジェクションの検知 (fmt.Sprintf + SELECT/UPDATE)
    // ユーザー入力を SQL 文に直接連結すると、データベースが不正操作される恐れがあります
    if (sourceCode.includes('fmt.Sprintf("SELECT') || sourceCode.includes('fmt.Sprintf("UPDATE')) {
        findings.push({
            title: 'SQL Injection',
            description: 'ユーザー入力を直接SQL文に連結している可能性があります。fmt.Sprintf ではなく、プリペアドステートメント（? や $1 などのプレースホルダ）を使用してください。',
            severity: 'CRITICAL',
            file: filePath,
            line: 1
        });
    }

    // 🟡 3. ハードコードされたシークレットの検知 (password/Password)
    // ソースコード内にパスワードを直接書き込むと、漏洩のリスクが非常に高まります
    if (sourceCode.includes('password = "') || sourceCode.includes('Password = "')) {
        findings.push({
            title: 'Hardcoded Secret',
            description: 'ソースコード内にパスワードやシークレットが直接書き込まれている可能性があります。環境変数 (.env) や AWS Secrets Manager などの管理ツールを使用してください。',
            severity: 'HIGH',
            file: filePath,
            line: 1
        });
    }

    return findings;
};