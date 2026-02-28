package command

import "testing"

func TestSimpleRemoteControl(t *testing.T) {
	// 1. 準備
	remote := &SimpleRemoteControl{}
	light := &Light{}

	lightOnCmd := NewLightOnCommand(light)

	remote.SetCommand(lightOnCmd)

	// 2. 実行
	result := remote.ButtonWasPressed()

	// 3. 検証
	expected := "Light is On"
	if result != expected {
		t.Errorf("期待値: %v, 実際: %v", expected, result)
	}
}
