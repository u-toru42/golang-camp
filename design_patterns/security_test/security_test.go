package security_test

import (
	"database/sql"
	"fmt"
	"html/template"
	"net/http"
	"os/exec"
)

// 脆弱性テスト用構造体
type VulnerableService struct {
	ApiKey string
}

func NewVulnerableService() *VulnerableService {
	// 🔴 5. Hardcoded Secret (OWASP A02:2021)
	// シークレットを直接コードに書くのは、Clean Codeでも「散らかった設計」の代表格です
	return &VulnerableService{
		ApiKey: "sk_live_51MzByuL9fX7vR2j8NqW2pL",
	}
}

func (s *VulnerableService) ProcessData(db *sql.DB, userInput string) {
	// 🔴 1. SQL Injection (OWASP A03:2021)
	// Martin Fowlerの「意図を明確にする」原則に反し、文字列操作でロジックを組み立ててしまっています
	query := fmt.Sprintf("SELECT * FROM products WHERE category = '%s'", userInput)
	rows, err := db.Query(query)

	// 🔴 6. Swallowed Error (Clean Code / OWASP A09:2021)
	// Kent Beckが最も嫌う「沈黙するエラー」。何か起きても誰も気づけません
	if err != nil {
	}
	defer rows.Close()

	// 🔴 2. OS Command Injection (OWASP A03:2021)
	// 外部入力をシェルに直接渡す、極めて危険な実装です
	cmd := exec.Command("sh", "-c", "ls "+userInput)
	_ = cmd.Run()

	// 🔴 4. SSRF - Server-Side Request Forgery (OWASP A10:2021)
	// サーバーが攻撃者の指定した内部ネットワーク等にアクセスさせられるリスクがあります
	targetURL := fmt.Sprintf("https://internal.api.com/v1/user/%s", userInput)
	_, _ = http.Get(targetURL)
}

func (s *VulnerableService) RenderResponse(w http.ResponseWriter, userInput string) {
	// 🔴 3. Cross-Site Scripting (XSS) (OWASP A03:2021)
	// html/templateの安全なエスケープ機能を自ら破壊（Bypass）しています
	safeHTML := template.HTML("<div>" + userInput + "</div>")
	fmt.Fprintf(w, "Result: %v", safeHTML)
}
