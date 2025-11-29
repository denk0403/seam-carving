.PHONY: all build clean serve

PKG_DIR = pkg
JS_PKG_DIR = ../SeamCarvingJS/pkg

all: build

build:
	@echo "Building Rust WASM..."
	wasm-pack build --target web
	@echo "Copying pkg to SeamCarvingJS..."
	rm -rf $(JS_PKG_DIR)
	cp -r $(PKG_DIR) $(JS_PKG_DIR)
	@echo "Done! You can now open SeamCarvingJS/index.html in a web server."

clean:
	cargo clean
	rm -rf $(PKG_DIR)
	rm -rf $(JS_PKG_DIR)

serve: build
	@echo "Starting web server on http://localhost:8000"
	cd ../SeamCarvingJS && python3 -m http.server

