package security_test

import (
	"database/sql"
	"fmt"
	"html/template"
	"net/http"
	"os/exec"
)

func VulnerableFunction(db *sql.DB, input string, w http.ResponseWriter) {
	// 🔴 1. SQL Injection: fmt.Sprintf と SELECT がセット
	q := fmt.Sprintf("SELECT * FROM users WHERE name = '%s'", input)
	db.Query(q)

	// 🔴 2. OS Command Injection: sh -c が含まれる
	exec.Command("sh", "-c", "echo "+input)

	// 🔴 3. XSS: template.HTML を使用
	_ = template.HTML("<div>" + input + "</div>")

	// 🔴 4. SSRF: http://...%s と http.Get
	url := fmt.Sprintf("http://example.com/api/%s", input)
	http.Get(url)

	// 🔴 5. Hardcoded Secret: ApiKey = "長い文字列"
	const ApiKey = "sk_live_1234567890abcdefghij"

	// 🔴 6. Swallowed Error: if err != nil { } が空
	_, err := db.Query("SELECT 1")
	if err != nil {
	}
}
