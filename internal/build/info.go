// Package build exposes build-time metadata for the running binary.
// Values are injected via -ldflags "-X github.com/indica-ai/indica-ai/internal/build.Commit=..."
// during `docker build`. Defaults keep local dev builds debuggable.
package build

var (
	Commit = "dev"
)
