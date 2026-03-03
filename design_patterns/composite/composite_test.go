package main

import (
	"testing"
)

func TestCompositeSize(t *testing.T) {
	tests := []struct {
		name     string
		setup    func() FileSystemNode
		expected int
	}{
		{
			name: "単一のファイルのサイズ",
			setup: func() FileSystemNode {
				return &File{name: "test.txt", size: 100}
			},
			expected: 100,
		},
		{
			name: "空のディレクトリのサイズ",
			setup: func() FileSystemNode {
				return NewDirectory("empty_dir")
			},
			expected: 0,
		},
		{
			name: "ファイルが複数入ったディレクトリのサイズ",
			setup: func() FileSystemNode {
				dir := NewDirectory("docs")
				dir.Add(&File{name: "a.txt", size: 10})
				dir.Add(&File{name: "b.txt", size: 20})
				return dir
			},
			expected: 30,
		},
		{
			name: "入れ子になったディレクトリ",
			setup: func() FileSystemNode {
				rootDir := NewDirectory("root")
				subDir := NewDirectory("sub")

				subDir.Add(&File{name: "sub_file.txt", size: 50})
				rootDir.Add(subDir)
				rootDir.Add(&File{name: "root_file.txt", size: 100})

				return rootDir
			},
			expected: 150,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			node := tt.setup()
			actual := node.Size()

			if actual != tt.expected {
				t.Errorf("got %d, want %d", actual, tt.expected)
			}
		})
	}
}
