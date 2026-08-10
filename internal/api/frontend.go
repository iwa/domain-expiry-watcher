package api

import (
	"fmt"
	"io/fs"
	"net/http"

	frontend "github.com/iwa/Expira/web"
)

func FrontendHandler() http.Handler {
	dist, err := fs.Sub(frontend.Dist, "dist")
	if err != nil {
		panic(fmt.Sprintf("embedded frontend is missing dist: %v", err))
	}

	return http.FileServer(http.FS(dist))
}
