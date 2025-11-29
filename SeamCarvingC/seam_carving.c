#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <math.h>
#include <stdbool.h>
#include <float.h>

// --- Constants & Structs ---

#define COLOR_RED 0xFF0000
#define COLOR_BLACK 0x000000
#define COLOR_WHITE 0xFFFFFF

typedef struct Pixel Pixel;

typedef struct Pixel {
    uint32_t color;
    struct Pixel *up;
    struct Pixel *down;
    struct Pixel *left;
    struct Pixel *right;
    double energy_cache;
    double brightness_cache;
    bool energy_valid;
    bool brightness_valid;
    bool is_border; // To simulate BorderPixel behavior
    bool being_removed; // Flag for visualization, kept for struct parity
} Pixel;

Pixel BORDER_PIXEL_STRUCT;
Pixel *BORDER_PIXEL = &BORDER_PIXEL_STRUCT;

// --- Utils Prototypes ---

void connect_left_to_right(Pixel *on_left, Pixel *on_right);
void connect_down_to_up(Pixel *on_bottom, Pixel *on_top);

// --- Pixel Functions ---

Pixel* create_pixel(uint32_t color);
void pixel_init_border();
double pixel_brightness(Pixel *p);
double pixel_energy(Pixel *p);
double pixel_horiz_energy(Pixel *p);
double pixel_vert_energy(Pixel *p);
void pixel_invalidate_energy(Pixel *p);

// Slide functions (Ported from JS)
void pixel_slide_still(Pixel *p);
void pixel_slide_left(Pixel *p);
void pixel_slide_right(Pixel *p);
void pixel_slide_still_horiz(Pixel *p);
void pixel_slide_up(Pixel *p);
void pixel_slide_down(Pixel *p);

// --- PPM I/O ---

typedef struct {
    int width;
    int height;
    Pixel ***pixels; // 2D array of pointers: pixels[y][x]
} Image;

Image* load_ppm(const char *filename);
void save_ppm(const char *filename, Image *img);

// --- Seam Carving Logic ---

void construct_pixel_graph(Image *img);
void remove_vertical_seam(Image *img);
void remove_horizontal_seam(Image *img);
Image* transpose_image_array(Image *img); // Only transposes the array, not graph
void seam_carve(Image *img, int mode); // 0=vert, 1=horiz

// --- Implementations ---

void pixel_init_border() {
    BORDER_PIXEL->is_border = true;
    BORDER_PIXEL->color = COLOR_BLACK;
    BORDER_PIXEL->up = BORDER_PIXEL;
    BORDER_PIXEL->down = BORDER_PIXEL;
    BORDER_PIXEL->left = BORDER_PIXEL;
    BORDER_PIXEL->right = BORDER_PIXEL;
    BORDER_PIXEL->energy_cache = 0;
    BORDER_PIXEL->brightness_cache = 0;
    BORDER_PIXEL->energy_valid = true;
    BORDER_PIXEL->brightness_valid = true;
}

Pixel* create_pixel(uint32_t color) {
    Pixel *p = (Pixel*)malloc(sizeof(Pixel));
    p->color = color;
    p->is_border = false;
    p->being_removed = false;
    p->up = BORDER_PIXEL;
    p->down = BORDER_PIXEL;
    p->left = BORDER_PIXEL;
    p->right = BORDER_PIXEL;
    p->energy_valid = false;
    p->brightness_valid = false;
    return p;
}

void connect_left_to_right(Pixel *on_left, Pixel *on_right) {
    // onLeft.setRight(onRight)
    on_left->right = on_right;
    pixel_invalidate_energy(on_left);
    pixel_invalidate_energy(on_left->up);
    pixel_invalidate_energy(on_left->down);

    // onRight.setLeft(onLeft)
    on_right->left = on_left;
    pixel_invalidate_energy(on_right);
    pixel_invalidate_energy(on_right->up);
    pixel_invalidate_energy(on_right->down);
}

void connect_down_to_up(Pixel *on_bottom, Pixel *on_top) {
    // onBottom.setUp(onTop)
    on_bottom->up = on_top;
    pixel_invalidate_energy(on_bottom);
    pixel_invalidate_energy(on_bottom->left);
    pixel_invalidate_energy(on_bottom->right);

    // onTop.setDown(onBottom)
    on_top->down = on_bottom;
    pixel_invalidate_energy(on_top);
    pixel_invalidate_energy(on_top->left);
    pixel_invalidate_energy(on_top->right);
}

void pixel_invalidate_energy(Pixel *p) {
    if (!p->is_border) {
        p->energy_valid = false;
    }
}

double pixel_brightness(Pixel *p) {
    if (p->is_border) return 0.0;
    if (!p->brightness_valid) {
        uint32_t c = p->color;
        int r = (c >> 16) & 0xFF;
        int g = (c >> 8) & 0xFF;
        int b = c & 0xFF;
        p->brightness_cache = (r + g + b) / 765.0;
        p->brightness_valid = true;
    }
    return p->brightness_cache;
}

double pixel_horiz_energy(Pixel *p) {
    if (p->is_border) return 0.0;
    return (
        pixel_brightness(p->left->up) +
        2 * pixel_brightness(p->left) +
        pixel_brightness(p->left->down) -
        (pixel_brightness(p->right->up) +
         2 * pixel_brightness(p->right) +
         pixel_brightness(p->right->down))
    );
}

double pixel_vert_energy(Pixel *p) {
    if (p->is_border) return 0.0;
    return (
        pixel_brightness(p->up->left) +
        2 * pixel_brightness(p->up) +
        pixel_brightness(p->up->right) -
        (pixel_brightness(p->down->left) +
         2 * pixel_brightness(p->down) +
         pixel_brightness(p->down->right))
    );
}

double pixel_energy(Pixel *p) {
    if (p->is_border) return 0.0;
    if (!p->energy_valid) {
        double h = pixel_horiz_energy(p);
        double v = pixel_vert_energy(p);
        p->energy_cache = sqrt(h*h + v*v);
        p->energy_valid = true;
    }
    return p->energy_cache;
}

// --- Slide Logic ---

void pixel_slide_still(Pixel *p) {
    connect_left_to_right(p->left, p->right);
}

void pixel_slide_left(Pixel *p) {
    connect_left_to_right(p->left, p->right);
    connect_down_to_up(p->right, p->up);
}

void pixel_slide_right(Pixel *p) {
    connect_left_to_right(p->left, p->right);
    connect_down_to_up(p->left, p->up);
}

void pixel_slide_still_horiz(Pixel *p) {
    connect_down_to_up(p->down, p->up);
}

void pixel_slide_up(Pixel *p) {
    connect_down_to_up(p->down, p->up);
    connect_left_to_right(p->left, p->down);
}

void pixel_slide_down(Pixel *p) {
    connect_down_to_up(p->down, p->up);
    connect_left_to_right(p->left, p->up);
}

// --- PPM I/O ---


#include <ctype.h>

// Safe integer reader that skips comments and whitespace
int read_int(FILE *f) {
    int c;
    while (1) {
        c = fgetc(f);
        if (c == EOF) return -1;
        if (c == '#') {
            while (c != '\n' && c != EOF) c = fgetc(f);
        } else if (isspace(c)) {
            continue;
        } else {
            ungetc(c, f);
            break;
        }
    }
    int val;
    if (fscanf(f, "%d", &val) == 1) return val;
    return -1;
}

Image* load_ppm(const char *filename) {
    FILE *f = fopen(filename, "r");
    if (!f) {
        perror("Error opening file");
        exit(1);
    }

    char format[16];
    if (fscanf(f, "%15s", format) != 1) {
        fprintf(stderr, "Error reading header\n");
        exit(1);
    }
    
    // Check format
    if (strcmp(format, "P3") != 0) {
        fprintf(stderr, "Only PPM P3 supported. Got %s\n", format);
        exit(1);
    }

    int width = read_int(f);
    int height = read_int(f);
    int max_val = read_int(f);
    
    if (width <= 0 || height <= 0 || max_val <= 0) {
        fprintf(stderr, "Invalid dimensions or max_val: %d %d %d\n", width, height, max_val);
        exit(1);
    }

    Image *img = (Image*)malloc(sizeof(Image));
    img->width = width;
    img->height = height;
    img->pixels = (Pixel***)malloc(height * sizeof(Pixel**));

    for (int y = 0; y < height; y++) {
        img->pixels[y] = (Pixel**)malloc(width * sizeof(Pixel*));
        for (int x = 0; x < width; x++) {
            int r = read_int(f);
            int g = read_int(f);
            int b = read_int(f);
            
            if (r == -1 || g == -1 || b == -1) {
                fprintf(stderr, "Error reading pixel data at %d, %d\n", x, y);
                exit(1);
            }
            uint32_t color = ((r & 0xFF) << 16) | ((g & 0xFF) << 8) | (b & 0xFF);
            img->pixels[y][x] = create_pixel(color);
        }
    }
    fclose(f);
    return img;
}

void save_ppm(const char *filename, Image *img) {
    FILE *f = fopen(filename, "w");
    if (!f) {
        perror("Error writing file");
        exit(1);
    }

    fprintf(f, "P3\n%d %d\n255\n", img->width, img->height);
    for (int y = 0; y < img->height; y++) {
        for (int x = 0; x < img->width; x++) {
            uint32_t c = img->pixels[y][x]->color;
            int r = (c >> 16) & 0xFF;
            int g = (c >> 8) & 0xFF;
            int b = c & 0xFF;
            fprintf(f, "%d %d %d ", r, g, b);
        }
        fprintf(f, "\n");
    }
    fclose(f);
}

// --- Graph Construction ---

void construct_pixel_graph(Image *img) {
    Pixel *front_of_row = BORDER_PIXEL;
    
    for (int y = 0; y < img->height; y++) {
        Pixel *new_front = img->pixels[y][0];
        connect_down_to_up(new_front, front_of_row);
        front_of_row = new_front;
        Pixel *pixel = new_front;

        for (int x = 1; x < img->width; x++) {
            Pixel *next_pixel = img->pixels[y][x];
            connect_left_to_right(pixel, next_pixel);
            connect_down_to_up(next_pixel, pixel->up->right);
            pixel = next_pixel;
        }
    }
}

// --- Seam Logic ---

// Helper to find min seam
// Returns array of indices (length = height) representing the seam path from top to bottom
int* find_seam(Image *img) {
    int w = img->width;
    int h = img->height;
    float *energies = (float*)malloc(w * h * sizeof(float));
    int *parents = (int*)malloc(w * h * sizeof(int)); // Stores index in prev row

    // Initialize first row
    for (int x = 0; x < w; x++) {
        energies[x] = (float)pixel_energy(img->pixels[0][x]);
        parents[x] = -1;
    }

    // DP
    for (int y = 1; y < h; y++) {
        int row_offset = y * w;
        int prev_row_offset = (y - 1) * w;

        for (int x = 0; x < w; x++) {
            Pixel *p = img->pixels[y][x];
            float energy = (float)pixel_energy(p);

            // Default top neighbor
            int min_parent_idx = prev_row_offset + x;
            float min_parent_cost = energies[min_parent_idx];

            // Top-Left
            if (x > 0) {
                int left_idx = prev_row_offset + (x - 1);
                if (energies[left_idx] < min_parent_cost) {
                    min_parent_cost = energies[left_idx];
                    min_parent_idx = left_idx;
                }
            }

            // Top-Right
            if (x < w - 1) {
                int right_idx = prev_row_offset + (x + 1);
                if (energies[right_idx] < min_parent_cost) {
                    min_parent_cost = energies[right_idx];
                    min_parent_idx = right_idx;
                }
            }

            energies[row_offset + x] = min_parent_cost + energy;
            parents[row_offset + x] = min_parent_idx;
        }
    }

    // Find best seam end
    int min_seam_idx = -1;
    float min_seam_cost = FLT_MAX;
    int last_row_offset = (h - 1) * w;

    for (int x = 0; x < w; x++) {
        int idx = last_row_offset + x;
        if (energies[idx] < min_seam_cost) {
            min_seam_cost = energies[idx];
            min_seam_idx = idx;
        }
    }

    // Backtrack
    int *path = (int*)malloc(h * sizeof(int));
    int curr_idx = min_seam_idx;
    for (int y = h - 1; y >= 0; y--) {
        path[y] = curr_idx % w; // Store x coordinate
        curr_idx = parents[curr_idx];
    }

    free(energies);
    free(parents);
    return path;
}

void remove_vertical_seam_logic(Image *img, int *path) {
    // Process bottom-up to match JS recursion logic, though order matters mostly for pointer updates
    // JS code recurses: calls removeSelf on parent (y-1) then updates self (y).
    // This implies top-down processing if we unwind the stack?
    // JS: 
    //  seam.removeSelf(row):
    //    if cameFrom != null: cameFrom.removeSelf(row-1)
    //    slide...
    // So it updates row 0, then row 1, etc. Top-down order of EFFECT.
    
    for (int y = 0; y < img->height; y++) {
        int x = path[y];
        Pixel *p = img->pixels[y][x];
        
        // Determine slide direction based on parent relationship
        if (y > 0) {
            // Compare with parent in previous row
            // Parent is path[y-1]
            // Pixel is path[y] (at x)
            // In JS: if cameFrom.pixel.sameIPixelAs(pixel.up) -> SlideStill
            //        if cameFrom.pixel.sameIPixelAs(pixel.up.right) -> SlideLeft
            //        if cameFrom.pixel.sameIPixelAs(pixel.up.left) -> SlideRight
            
            // We need to check the pointer relationships because x-indices are from the array,
            // but the graph might be twisted? No, the array is consistent with the graph until we modify it.
            // Actually, using indices is safer if the array is valid.
            // Parent x_prev = path[y-1]
            // Current x = path[y]
            
            // But wait, the JS logic uses `pixel.up` pointers. 
            // If we use indices: 
            // parent x is x_prev. 
            // p->up should be pixels[y-1][x].
            // p->up->right should be pixels[y-1][x+1].
            // p->up->left should be pixels[y-1][x-1].
            
            int x_prev = path[y-1];
            
            // If parent is directly above (x_prev == x) -> SlideStill
            // If parent is top-right (x_prev == x + 1) -> SlideLeft (The seam moved Left from parent)
            // If parent is top-left (x_prev == x - 1) -> SlideRight (The seam moved Right from parent)
            
            if (x_prev == x) {
                pixel_slide_still(p);
            } else if (x_prev == x + 1) {
                // Parent is to the right. 
                // JS: cameFrom == pixel.up.right
                pixel_slide_left(p);
            } else if (x_prev == x - 1) {
                // Parent is to the left.
                // JS: cameFrom == pixel.up.left
                pixel_slide_right(p);
            } else {
               // Should not happen in 8-connected seam
               // Fallback or error
            }
        } else {
            // Top row always SlideStill (no parent)
            pixel_slide_still(p);
        }

        // Remove from array
        // Shift rest of row
        for (int k = x; k < img->width - 1; k++) {
            img->pixels[y][k] = img->pixels[y][k+1];
        }
        img->pixels[y][img->width - 1] = NULL; // Clear last
    }
    img->width--;
}

void remove_horizontal_seam_logic(Image *img, int *path) {
    // path contains row indices for each column (since we are operating on transposed array conceptually)
    // But here `img` is the TRANSPOSED array passed to this function.
    // So logic is identical to remove_vertical_seam_logic BUT using Horiz specific slide functions.
    
    // Wait, if I transpose the array, the "graph" pointers are NOT transposed.
    // So `p->up` is still the neighbor above in the ORIGINAL image.
    // But in the transposed array, `p` at `[y][x]` corresponds to Original `[x][y]`.
    // So `Transposed[y][x]` -> `Original[col][row]`.
    // Increasing `y` in Transposed means increasing `col` in Original (moving Right).
    // Increasing `x` in Transposed means increasing `row` in Original (moving Down).
    
    // So iterating `y` from 0 to `height` (Original Width) corresponds to moving Left->Right in Original.
    // `path[y]` gives the `x` (Original Row) to remove at that column.
    
    // JS `HorizSeamInfo.removeSelf`:
    // Checks `cameFrom` (Previous Column).
    // If `cameFrom` is `pixel.left` -> SlideStillHoriz
    // If `cameFrom` is `pixel.left.down` -> SlideUp
    // If `cameFrom` is `pixel.left.up` -> SlideDown
    
    for (int y = 0; y < img->height; y++) { // y is Col index in original
        int x = path[y]; // x is Row index in original
        Pixel *p = img->pixels[y][x];
        
        if (y > 0) {
            int x_prev = path[y-1];
            
            // x_prev is row index in previous column.
            // x is row index in current column.
            // `pixel.left` is pixel in previous column at same row.
            
            if (x_prev == x) {
                // Parent is same row, prev col -> Left
                pixel_slide_still_horiz(p);
            } else if (x_prev == x + 1) {
                // Parent is row below (x+1), prev col.
                // JS: cameFrom == pixel.left.down
                pixel_slide_up(p);
            } else if (x_prev == x - 1) {
                // Parent is row above (x-1), prev col.
                // JS: cameFrom == pixel.left.up
                pixel_slide_down(p);
            }
        } else {
            pixel_slide_still_horiz(p);
        }
        
        // Remove from array (Transposed array, so removing "x" from row "y")
        for (int k = x; k < img->width - 1; k++) {
            img->pixels[y][k] = img->pixels[y][k+1];
        }
        img->pixels[y][img->width - 1] = NULL;
    }
    img->width--; // Decrease "width" of transposed array (which is Original Height)
}

// Creates a new Image struct with transposed array
// Does NOT copy pixels, just pointers.
Image* transpose_image_array(Image *img) {
    Image *new_img = (Image*)malloc(sizeof(Image));
    new_img->width = img->height;
    new_img->height = img->width;
    new_img->pixels = (Pixel***)malloc(new_img->height * sizeof(Pixel**));
    
    for (int y = 0; y < new_img->height; y++) {
        new_img->pixels[y] = (Pixel**)malloc(new_img->width * sizeof(Pixel*));
        for (int x = 0; x < new_img->width; x++) {
            new_img->pixels[y][x] = img->pixels[x][y];
        }
    }
    return new_img;
}

// Update original image struct from transposed one (just dimensions and array pointer)
void update_from_transposed(Image *original, Image *transposed) {
    // The transposed image has `width` = `original->height - 1` (after removal)
    // and `height` = `original->width`.
    
    // We need to rebuild `original->pixels` which should be `original->height - 1` x `original->width`? 
    // No, horizontal seam removal reduces Height.
    // Transposed `width` decreased. So `original->height` should decrease.
    
    // Free old array structure of original
    for(int y=0; y<original->height; y++) free(original->pixels[y]);
    free(original->pixels);
    
    original->height = transposed->width; // The dimension that was reduced
    original->width = transposed->height; // The dimension that stayed same
    
    // Reconstruct array from transposed
    original->pixels = (Pixel***)malloc(original->height * sizeof(Pixel**));
    for (int y = 0; y < original->height; y++) {
        original->pixels[y] = (Pixel**)malloc(original->width * sizeof(Pixel*));
        for (int x = 0; x < original->width; x++) {
            original->pixels[y][x] = transposed->pixels[x][y];
        }
    }
}

void free_image_struct(Image *img) {
    // Only frees the array structure, not the pixels (pixels are shared)
    for(int y=0; y<img->height; y++) free(img->pixels[y]);
    free(img->pixels);
    free(img);
}

void seam_carve(Image *img, int mode) {
    if (mode == 0) { // Vert
        int *path = find_seam(img);
        remove_vertical_seam_logic(img, path);
        free(path);
    } else { // Horiz
        Image *transposed = transpose_image_array(img);
        int *path = find_seam(transposed); // Find seam on transposed (Vertical in transposed = Horizontal in real)
        remove_horizontal_seam_logic(transposed, path); // Use special logic for graph updates
        update_from_transposed(img, transposed);
        free(path);
        free_image_struct(transposed);
    }
}

int main(int argc, char **argv) {
    if (argc < 5) {
        printf("Usage: %s <input.ppm> <output.ppm> <v_seams> <h_seams>\n", argv[0]);
        return 1;
    }

    pixel_init_border();

    printf("Loading %s...\n", argv[1]);
    Image *img = load_ppm(argv[1]);
    
    printf("Constructing graph...\n");
    construct_pixel_graph(img);

    int v_seams = atoi(argv[3]);
    int h_seams = atoi(argv[4]);

    printf("Removing %d vertical seams...\n", v_seams);
    for (int i = 0; i < v_seams; i++) {
        if (img->width <= 1) break;
        seam_carve(img, 0);
        if (i % 10 == 0) printf(".");
        fflush(stdout);
    }
    printf("\n");

    printf("Removing %d horizontal seams...\n", h_seams);
    for (int i = 0; i < h_seams; i++) {
        if (img->height <= 1) break;
        seam_carve(img, 1);
        if (i % 10 == 0) printf(".");
        fflush(stdout);
    }
    printf("\n");

    printf("Saving to %s...\n", argv[2]);
    save_ppm(argv[2], img);

    printf("Done.\n");
    return 0;
}

