package adapter

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
