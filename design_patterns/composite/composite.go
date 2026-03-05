package main

import "fmt"

type FileSystemNode interface {
	Name() string
	Size() int
}

type File struct {
	name string
	size int
}

func (f *File) Name() string {
	return f.name
}

func (f *File) Size() int {
	return f.size
}

type Directory struct {
	name     string
	children []FileSystemNode
}

func NewDirectory(name string) *Directory {
	return &Directory{
		name:     name,
		children: []FileSystemNode{},
	}
}

func (d *Directory) Add(node FileSystemNode) {
	d.children = append(d.children, node)
}

func (d *Directory) Name() string {
	return d.name
}

func (d *Directory) Size() int {
	totalSize := 0
	for _, child := range d.children {
		totalSize += child.Size()
	}
	return totalSize
}

func main() {
	root := NewDirectory("root")
	bin := NewDirectory("bin")
	tmp := NewDirectory("tmp")

	file1 := &File{name: "vi", size: 1000}
	file2 := &File{name: "latex", size: 2000}
	file3 := &File{name: "temp.txt", size: 500}

	bin.Add(file1)
	bin.Add(file2)
	bin.Add(file3)

	root.Add(bin)
	root.Add(tmp)

	fmt.Printf("Directory '%s' total size: %d\n", root.Name(), root.Size())
}
