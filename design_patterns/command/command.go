package command

type Command interface {
	Execute() string
}

type Light struct{}

func (l *Light) On() string {
	return "Light is On"
}

func (l *Light) Off() string {
	return "Light is Off"
}

type LightOnCommand struct {
	light *Light
}

func NewLightOnCommand(light *Light) *LightOnCommand {
	return &LightOnCommand{
		light: light,
	}
}

func (c *LightOnCommand) Execute() string {
	return c.light.On()
}

type SimpleRemoteControl struct {
	slot Command
}

func (r *SimpleRemoteControl) SetCommand(cmd Command) {
	r.slot = cmd
}

func (r *SimpleRemoteControl) ButtonWasPressed() string {
	if r.slot != nil {
		return r.slot.Execute()
	}
	return "No command assigned"
}
