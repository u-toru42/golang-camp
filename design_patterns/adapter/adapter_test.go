package adapter

import (
	"testing"
)

func TestTurkeyAdapter(t *testing.T) {
	// 1. 準備: 既存の七面鳥を用意し、アダプターで包みます
	turkey := &WildTurkey{}
	adapter := NewTurkeyAdapter(turkey)

	// 2. 実行
	// 3. 検証
	expectedQuack := "グワッグワッ"
	if got := adapter.Quack(); got != expectedQuack {
		t.Errorf("Quack() の結果が違います。期待値: %v, 実際: %v", expectedQuack, got)
	}

	// アヒルとして「fly」したときに、七面鳥が5回飛ぶ動作に変換されているか確認する
	expectedFly := "短い距離しか飛べません x 5回"
	if got := adapter.Fly(); got != expectedFly {
		t.Errorf("Fly() の結果が違います。期待値: %v, 実際: %v", expectedFly, got)
	}
}
