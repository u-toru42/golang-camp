package security_test

import (
	"database/sql"
	"html/template"
	"log" // ログ出力用
	"net/http"
	"os" // 環境変数用
)

type SecureService struct {
	ApiKey string
}

func NewSecureService() *SecureService {
	// ✅ 対策5: 環境変数から読み込む (OWASP A02)
	// コードには「どこから持ってくるか」という意図だけを残す
	return &SecureService{
		ApiKey: os.Getenv("APP_API_KEY"),
	}
}

func (s *SecureService) ProcessData(db *sql.DB, userInput string) {
	// ✅ 対策1: プリペアドステートメント (OWASP A03)
	// 文字列連結をやめ、DB側にパラメータとして渡す
	const query = "SELECT * FROM products WHERE category = ?"
	rows, err := db.Query(query, userInput)

	// ✅ 対策6: 適切にログを吐く (Clean Code)
	// 「何か起きた」ことを記録し、沈黙させない
	if err != nil {
		log.Printf("Error querying database: %v", err)
		return
	}
	defer rows.Close()

	// ✅ 対策2 & 4: 外部ライブラリやバリデーション済みの入力を使う
	// (ここでは簡略化のため、直接実行を避ける設計への変更を推奨)
}

func (s *SecureService) RenderResponse(w http.ResponseWriter, userInput string) {
	// ✅ 対策3: デフォルトのエスケープに任せる (OWASP A03)
	// template.HTMLを使わず、ただの文字列としてテンプレートに渡す
	tmpl := template.Must(template.New("web").Parse("Result: {{.}}"))
	_ = tmpl.Execute(w, userInput)
}