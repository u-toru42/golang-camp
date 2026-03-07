package main

import "fmt"

type Observer interface {
	Update(itemName string)
}

type Subject interface {
	Register(observer Observer)
	Deregister(observer Observer)
	NotifyAll()
}

type Item struct {
	observerList []Observer
	name         string
	inStock      bool
}

type SystemLogger struct {
	LogData []string
}

func NewItem(name string) *Item {
	return &Item{
		name: name,
	}
}

func (i *Item) Register(o Observer) {
	i.observerList = append(i.observerList, o)
}

func (i *Item) Deregister(o Observer) {

}

func (i *Item) NotifyAll() {
	for _, observer := range i.observerList {
		observer.Update(i.name)
	}
}

func (i *Item) UpdateAvailability() {
	fmt.Printf("System: %s が入荷しましたよ!", i.name)
	i.inStock = true
	i.NotifyAll()
}

type Customer struct {
	id           string
	ReceivedMsgs []string
}

func (c *Customer) Update(itemName string) {
	msg := fmt.Sprintf("お客様 %s: %s が入荷しましたよ!\n", c.id, itemName)
	c.ReceivedMsgs = append(c.ReceivedMsgs, msg)
	fmt.Println(msg)
}

func (l *SystemLogger) Update(itemName string) {
	logMsg := fmt.Sprintf("[Log] システム記録: アイテム「%s」の入荷イベントを検知しました。\n", itemName)
	l.LogData = append(l.LogData, logMsg)
	fmt.Println(logMsg)
}

func main() {
	nintendoSwitch := NewItem("Nintendo Switch")

	customer1 := &Customer{id: "Alice"}
	customer2 := &Customer{id: "Bob"}

	logger := &SystemLogger{}

	nintendoSwitch.Register(customer1)
	nintendoSwitch.Register(customer2)

	nintendoSwitch.Register(logger)

	nintendoSwitch.UpdateAvailability()
}
