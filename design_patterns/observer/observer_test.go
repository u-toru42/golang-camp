package main

import (
	"testing"
)

func TestObserverNortification(t *testing.T) {
	// 準備
	item := NewItem("PlayStation 5")
	customer1 := &Customer{id: "TestUser1"}
	customer2 := &Customer{id: "TestUser2"}

	item.Register(customer1)
	item.Register(customer2)

	// 実行
	item.UpdateAvailability()

	// 検証
	if len(customer1.ReceivedMsgs) != 1 {
		t.Errorf("customer1 should have exactly 1 message, got %d", len(customer1.ReceivedMsgs))
	}
	expectedMsg1 := "お客様 TestUser1: PlayStation 5 が入荷しましたよ!"
	if customer1.ReceivedMsgs[0] != expectedMsg1 {
		t.Errorf("got %q, want %q", customer1.ReceivedMsgs[0], expectedMsg1)
	}

	if len(customer2.ReceivedMsgs) != 1 {
		t.Errorf("customer2 should have exactly 1 message, got %d", len(customer2.ReceivedMsgs))
	}
}
