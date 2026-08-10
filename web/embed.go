package web

import "embed"

// Dist contains the static Astro build output.
//
// using all: prefix to include astro's assets
//
//go:embed all:dist
var Dist embed.FS
