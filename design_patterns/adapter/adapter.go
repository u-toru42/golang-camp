package adapter

import (
	"database/sql"
	"fmt"
)

type Duck interface {
	Quack() string
	Fly() string
}

type Turkey interface {
	Gobble() string
	Fly() string
}

type WildTurkey struct{}

func (t *WildTurkey) Gobble() string {
	return "グワッグワッ"
}

func (t *WildTurkey) Fly() string {
	return "短い距離しか飛べません"
}

type TurkeyAdapter struct {
	turkey Turkey
}

func NewTurkeyAdapter(t Turkey) *TurkeyAdapter {
	return &TurkeyAdapter{turkey: t}
}

func (a *TurkeyAdapter) Quack() string {
	return a.turkey.Gobble()
}

func (a *TurkeyAdapter) Fly() string {
	return a.turkey.Fly() + " x 5回"
}

// 🔴 致命的脆弱性 1: ハードコードされた認証情報
const dbPassword = "super_secret_password_123!"

// GetUser はユーザー情報を取得します
func GetUser(db *sql.DB, username string) {
	// 🔴 致命的脆弱性 2: SQLインジェクション
	// ユーザーの入力をそのままSQL文に連結しているため、悪意のある文字列でデータベースが破壊されます
	query := fmt.Sprintf("SELECT * FROM users WHERE username = '%s'", username)

	// 実行（※モック）
	db.Query(query)
}
