# Seam Carving in C

This is a high-performance C implementation of Seam Carving with a real-time visualization GUI.

## Features
- **Real-time Visualization**: Watch the seams being removed.
- **Interactive Control**: Pause, play, step, and switch modes.
- **JPEG Support**: Supports loading and saving JPEG/PNG/BMP/TGA images.
- **Graph-Based**: Uses a dynamic graph structure for efficient seam removal.

## Dependencies
- **SDL2**: Required for the GUI window.
  - macOS: `brew install sdl2`
  - Linux: `sudo apt-get install libsdl2-dev`

## Compilation

```bash
gcc -O3 seam_carving.c -o seamcarve $(sdl2-config --cflags --libs) -lm
```

## Usage

```bash
./seamcarve <image_file> [output_file]
```

### Controls
- **SPACE**: Pause / Play
- **V**: Remove Vertical Seams (Automatic)
- **H**: Remove Horizontal Seams (Automatic)
- **R**: Remove Random Seams (Automatic)
- **S**: Save current image to file
- **ESC**: Quit

### Example

```bash
./seamcarve jack.jpeg result.jpg
```
