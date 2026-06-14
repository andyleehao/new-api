package router

import "testing"

func TestIsFrontendAssetRequest(t *testing.T) {
	tests := []struct {
		name string
		path string
		want bool
	}{
		{
			name: "hashed static js chunk",
			path: "/static/js/async/2748.220b46fea9.js",
			want: true,
		},
		{
			name: "top level favicon",
			path: "/favicon.ico",
			want: true,
		},
		{
			name: "spa app route",
			path: "/keys",
			want: false,
		},
		{
			name: "nested spa app route",
			path: "/usage-logs/common",
			want: false,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := isFrontendAssetRequest(test.path); got != test.want {
				t.Fatalf("isFrontendAssetRequest(%q) = %v, want %v", test.path, got, test.want)
			}
		})
	}
}
