# Seam Carving WASM

This project implements Seam Carving in Rust and compiles it to WebAssembly for use in the web interface.

## Prerequisites

- [Rust](https://www.rust-lang.org/tools/install)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)

## Building

Run the build script:

```bash
./build.sh
```

This will:
1. Build the Rust project in `SeamCarvingWasm`.
2. Generate the WASM and JS bindings in `SeamCarvingWasm/pkg`.
3. Copy the `pkg` folder to `SeamCarvingJS/pkg`.

## Running

Serve the `SeamCarvingJS` directory using a web server (needed for WASM loading).

Example with Python:

```bash
cd SeamCarvingJS
python3 -m http.server
```

Then open `http://localhost:8000`.

## Implementation Details

- **Rust**: `SeamCarvingWasm/src/lib.rs` contains the `SeamCarver` struct and logic.
- **JS**: `SeamCarvingJS/script.js` imports the WASM module and wraps it to interface with the UI.
- **Algorithm**: Uses the same energy function (Sobel-like on brightness) and dynamic programming approach as the JS version, but operates on a flat `Vec<u8>` buffer for performance.

