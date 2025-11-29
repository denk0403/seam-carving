#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <math.h>
#include <stdbool.h>
#include <float.h>
#include <time.h>

#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"

#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "stb_image_write.h"

#include <SDL.h>

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

// --- Image Struct ---

typedef struct {
    int width;
    int height;
    Pixel ***pixels; // 2D array of pointers: pixels[y][x]
} Image;

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
    on_left->right = on_right;
    pixel_invalidate_energy(on_left);
    pixel_invalidate_energy(on_left->up);
    pixel_invalidate_energy(on_left->down);

    on_right->left = on_left;
    pixel_invalidate_energy(on_right);
    pixel_invalidate_energy(on_right->up);
    pixel_invalidate_energy(on_right->down);
}

void connect_down_to_up(Pixel *on_bottom, Pixel *on_top) {
    on_bottom->up = on_top;
    pixel_invalidate_energy(on_bottom);
    pixel_invalidate_energy(on_bottom->left);
    pixel_invalidate_energy(on_bottom->right);

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

// --- IO using STB ---

Image* load_image(const char *filename) {
    int w, h, channels;
    unsigned char *data = stbi_load(filename, &w, &h, &channels, 3); // Force 3 channels (RGB)
    if (!data) {
        fprintf(stderr, "Error loading image %s: %s\n", filename, stbi_failure_reason());
        exit(1);
    }

    Image *img = (Image*)malloc(sizeof(Image));
    img->width = w;
    img->height = h;
    img->pixels = (Pixel***)malloc(h * sizeof(Pixel**));

    for (int y = 0; y < h; y++) {
        img->pixels[y] = (Pixel**)malloc(w * sizeof(Pixel*));
        for (int x = 0; x < w; x++) {
            int idx = (y * w + x) * 3;
            uint32_t r = data[idx];
            uint32_t g = data[idx+1];
            uint32_t b = data[idx+2];
            uint32_t color = (r << 16) | (g << 8) | b;
            img->pixels[y][x] = create_pixel(color);
        }
    }
    
    stbi_image_free(data);
    return img;
}

void save_image(const char *filename, Image *img) {
    int w = img->width;
    int h = img->height;
    unsigned char *data = (unsigned char*)malloc(w * h * 3);
    
    for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
            uint32_t c = img->pixels[y][x]->color;
            int idx = (y * w + x) * 3;
            data[idx] = (c >> 16) & 0xFF;
            data[idx+1] = (c >> 8) & 0xFF;
            data[idx+2] = c & 0xFF;
        }
    }
    
    if (!stbi_write_jpg(filename, w, h, 3, data, 90)) {
        fprintf(stderr, "Error writing image to %s\n", filename);
    }
    free(data);
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

int* find_seam(Image *img) {
    int w = img->width;
    int h = img->height;
    float *energies = (float*)malloc(w * h * sizeof(float));
    int *parents = (int*)malloc(w * h * sizeof(int));

    for (int x = 0; x < w; x++) {
        energies[x] = (float)pixel_energy(img->pixels[0][x]);
        parents[x] = -1;
    }

    for (int y = 1; y < h; y++) {
        int row_offset = y * w;
        int prev_row_offset = (y - 1) * w;

        for (int x = 0; x < w; x++) {
            Pixel *p = img->pixels[y][x];
            float energy = (float)pixel_energy(p);

            int min_parent_idx = prev_row_offset + x;
            float min_parent_cost = energies[min_parent_idx];

            if (x > 0) {
                int left_idx = prev_row_offset + (x - 1);
                if (energies[left_idx] < min_parent_cost) {
                    min_parent_cost = energies[left_idx];
                    min_parent_idx = left_idx;
                }
            }

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

    int *path = (int*)malloc(h * sizeof(int));
    int curr_idx = min_seam_idx;
    for (int y = h - 1; y >= 0; y--) {
        path[y] = curr_idx % w;
        curr_idx = parents[curr_idx];
    }

    free(energies);
    free(parents);
    return path;
}

void remove_vertical_seam_logic(Image *img, int *path) {
    for (int y = 0; y < img->height; y++) {
        int x = path[y];
        Pixel *p = img->pixels[y][x];
        
        if (y > 0) {
            int x_prev = path[y-1];
            if (x_prev == x) {
                pixel_slide_still(p);
            } else if (x_prev == x + 1) {
                pixel_slide_left(p);
            } else if (x_prev == x - 1) {
                pixel_slide_right(p);
            }
        } else {
            pixel_slide_still(p);
        }

        for (int k = x; k < img->width - 1; k++) {
            img->pixels[y][k] = img->pixels[y][k+1];
        }
        img->pixels[y][img->width - 1] = NULL;
    }
    img->width--;
}

void remove_horizontal_seam_logic(Image *img, int *path) {
    for (int y = 0; y < img->height; y++) {
        int x = path[y];
        Pixel *p = img->pixels[y][x];
        
        if (y > 0) {
            int x_prev = path[y-1];
            if (x_prev == x) {
                pixel_slide_still_horiz(p);
            } else if (x_prev == x + 1) {
                pixel_slide_up(p);
            } else if (x_prev == x - 1) {
                pixel_slide_down(p);
            }
        } else {
            pixel_slide_still_horiz(p);
        }
        
        for (int k = x; k < img->width - 1; k++) {
            img->pixels[y][k] = img->pixels[y][k+1];
        }
        img->pixels[y][img->width - 1] = NULL;
    }
    img->width--;
}

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

void update_from_transposed(Image *original, Image *transposed) {
    for(int y=0; y<original->height; y++) free(original->pixels[y]);
    free(original->pixels);
    
    original->height = transposed->width;
    original->width = transposed->height;
    
    original->pixels = (Pixel***)malloc(original->height * sizeof(Pixel**));
    for (int y = 0; y < original->height; y++) {
        original->pixels[y] = (Pixel**)malloc(original->width * sizeof(Pixel*));
        for (int x = 0; x < original->width; x++) {
            original->pixels[y][x] = transposed->pixels[x][y];
        }
    }
}

void free_image_struct(Image *img) {
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
        int *path = find_seam(transposed);
        remove_horizontal_seam_logic(transposed, path);
        update_from_transposed(img, transposed);
        free(path);
        free_image_struct(transposed);
    }
}

// --- GUI Main ---

void update_texture(SDL_Texture *texture, Image *img) {
    void *pixels;
    int pitch;
    if (SDL_LockTexture(texture, NULL, &pixels, &pitch) < 0) {
        fprintf(stderr, "Failed to lock texture: %s\n", SDL_GetError());
        return;
    }

    // Pixel data in SDL texture is usually ARGB or ABGR depending on format
    // We asked for SDL_PIXELFORMAT_ARGB8888
    uint32_t *dst = (uint32_t*)pixels;
    
    for (int y = 0; y < img->height; y++) {
        for (int x = 0; x < img->width; x++) {
            uint32_t c = img->pixels[y][x]->color;
            // SDL ARGB8888: 0xAARRGGBB
            // Our color is 0xRRGGBB
            dst[y * (pitch / 4) + x] = 0xFF000000 | c; 
        }
    }
    SDL_UnlockTexture(texture);
}

int main(int argc, char **argv) {
    if (argc < 2) {
        printf("Usage: %s <image_file> [optional output_file]\n", argv[0]);
        printf("Controls:\n SPACE: Pause/Play\n R: Remove Random\n V: Remove Vertical\n H: Remove Horizontal\n S: Save Current\n ESC: Quit\n");
        return 1;
    }

    pixel_init_border();

    printf("Loading %s...\n", argv[1]);
    Image *img = load_image(argv[1]);
    printf("Image loaded: %dx%d\n", img->width, img->height);
    
    printf("Constructing graph...\n");
    construct_pixel_graph(img);
    printf("Graph constructed.\n");

    // SDL Init
    if (SDL_Init(SDL_INIT_VIDEO) < 0) {
        fprintf(stderr, "SDL could not initialize! SDL_Error: %s\n", SDL_GetError());
        return 1;
    }

    SDL_Window *window = SDL_CreateWindow("Seam Carving C", 
                                          SDL_WINDOWPOS_UNDEFINED, SDL_WINDOWPOS_UNDEFINED, 
                                          img->width, img->height, 
                                          SDL_WINDOW_SHOWN | SDL_WINDOW_RESIZABLE);
    if (!window) {
        fprintf(stderr, "Window could not be created! SDL_Error: %s\n", SDL_GetError());
        return 1;
    }

    SDL_Renderer *renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED);
    if (!renderer) {
        fprintf(stderr, "Renderer could not be created! SDL_Error: %s\n", SDL_GetError());
        return 1;
    }

    // Create a streaming texture
    SDL_Texture *texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_ARGB8888, 
                                             SDL_TEXTUREACCESS_STREAMING, 
                                             img->width, img->height);
    if (!texture) {
        fprintf(stderr, "Texture could not be created! SDL_Error: %s\n", SDL_GetError());
        return 1;
    }

    bool quit = false;
    bool paused = true;
    int mode = 2; // 0=Vert, 1=Horiz, 2=Random
    SDL_Event e;
    
    srand(time(NULL)); // Seed random number generator
    
    update_texture(texture, img);

    while (!quit) {
        while (SDL_PollEvent(&e) != 0) {
            if (e.type == SDL_QUIT) {
                quit = true;
            } else if (e.type == SDL_KEYDOWN) {
                switch (e.key.keysym.sym) {
                    case SDLK_ESCAPE: quit = true; break;
                    case SDLK_SPACE: paused = !paused; break;
                    case SDLK_v: mode = 0; paused = false; break;
                    case SDLK_h: mode = 1; paused = false; break;
                    case SDLK_r: mode = 2; paused = false; break;
                    case SDLK_s: 
                        if (argc > 2) {
                            printf("Saving to %s...\n", argv[2]);
                            save_image(argv[2], img);
                        } else {
                            printf("Saving to output.jpg...\n");
                            save_image("output.jpg", img);
                        }
                        break;
                }
            }
        }

        if (!paused && img->width > 1 && img->height > 1) {
            int current_mode = mode;
            if (mode == 2) {
                // Random heuristic similar to JS
                current_mode = ((float)rand() / RAND_MAX) >= (float)img->height / (img->width + img->height) ? 0 : 1;
            }
            seam_carve(img, current_mode);
            
            // We must recreate texture if dimensions change? 
            // SDL_UpdateTexture allows updating a rect, but the pitch assumes full width.
            // Easiest is to keep the large texture and render a smaller part of it?
            // Or update the subset. 
            // Let's just update the texture. Since img->width shrank, we need to be careful.
            // Actually, we can't resize a texture. We should destroy and recreate it if we want to fit exactly, 
            // or just write to top-left and render top-left.
            
            update_texture(texture, img);
        }

        // Render
        SDL_SetRenderDrawColor(renderer, 0, 0, 0, 255);
        SDL_RenderClear(renderer);
        
        // Render only the valid part of the image
        SDL_Rect srcRect = {0, 0, img->width, img->height};
        SDL_Rect dstRect = {0, 0, img->width, img->height};
        
        // Center in window
        int winW, winH;
        SDL_GetWindowSize(window, &winW, &winH);
        dstRect.x = (winW - img->width) / 2;
        dstRect.y = (winH - img->height) / 2;
        
        SDL_RenderCopy(renderer, texture, &srcRect, &dstRect);
        SDL_RenderPresent(renderer);
        
        // Simple FPS cap
        SDL_Delay(10);
    }

    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();

    return 0;
}
