use wasm_bindgen::prelude::*;
use rayon::prelude::*;

pub use wasm_bindgen_rayon::init_thread_pool;

#[wasm_bindgen]
pub struct SeamCarver {
    width: u32,
    height: u32,
    pixels: Vec<u8>, // RGBA, row-major
    // Cache buffers to avoid reallocation
    temp_pixels: Vec<u8>,
    energies: Vec<f32>,
    parents: Vec<i32>,
    seam: Vec<usize>,
}

#[wasm_bindgen]
impl SeamCarver {
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32, data: &[u8]) -> SeamCarver {
        console_error_panic_hook::set_once();

        let len = (width * height) as usize;
        SeamCarver {
            width,
            height,
            pixels: data.to_vec(),
            temp_pixels: Vec::with_capacity(len * 4),
            energies: Vec::with_capacity(len),
            parents: Vec::with_capacity(len),
            seam: Vec::with_capacity(height as usize),
        }
    }

    pub fn width(&self) -> u32 {
        self.width
    }

    pub fn height(&self) -> u32 {
        self.height
    }

    pub fn image_ptr(&self) -> *const u8 {
        self.pixels.as_ptr()
    }

    pub fn carve(&mut self, vert: bool) {
        if vert {
            self.remove_vertical_seam();
        } else {
            self.remove_horizontal_seam();
        }
    }

    pub fn reset(&mut self, width: u32, height: u32, data: &[u8]) {
        self.width = width;
        self.height = height;
        let len = (width * height) as usize;
        
        // Reuse pixels buffer
        if self.pixels.capacity() < len * 4 {
             self.pixels = data.to_vec();
        } else {
             self.pixels.clear();
             self.pixels.extend_from_slice(data);
        }
        
        // Pre-allocate other buffers if needed (optional, as remove_seam handles it)
        // But good for stability
        if self.temp_pixels.capacity() < len * 4 { self.temp_pixels = Vec::with_capacity(len * 4); }
        if self.energies.capacity() < len { self.energies = Vec::with_capacity(len); }
        if self.parents.capacity() < len { self.parents = Vec::with_capacity(len); }
        if self.seam.capacity() < height as usize { self.seam = Vec::with_capacity(height as usize); }
    }
}

// Static pure functions to avoid ownership issues with parallel iterators
#[inline(always)]
fn get_brightness(pixels: &[u8], idx: usize) -> f32 {
    let r = pixels[idx] as f32;
    let g = pixels[idx + 1] as f32;
    let b = pixels[idx + 2] as f32;
    (r + g + b) / 765.0
}

#[inline(always)]
fn get_pixel_brightness(width: u32, height: u32, pixels: &[u8], x: i32, y: i32) -> f32 {
    if x < 0 || x >= width as i32 || y < 0 || y >= height as i32 {
        return 0.0;
    }
    let idx = ((y as u32 * width + x as u32) * 4) as usize;
    get_brightness(pixels, idx)
}

#[inline(always)]
fn energy(width: u32, height: u32, pixels: &[u8], x: u32, y: u32) -> f32 {
    let x = x as i32;
    let y = y as i32;

    let left_up = get_pixel_brightness(width, height, pixels, x - 1, y - 1);
    let left = get_pixel_brightness(width, height, pixels, x - 1, y);
    let left_down = get_pixel_brightness(width, height, pixels, x - 1, y + 1);

    let right_up = get_pixel_brightness(width, height, pixels, x + 1, y - 1);
    let right = get_pixel_brightness(width, height, pixels, x + 1, y);
    let right_down = get_pixel_brightness(width, height, pixels, x + 1, y + 1);

    let up = get_pixel_brightness(width, height, pixels, x, y - 1);
    let down = get_pixel_brightness(width, height, pixels, x, y + 1);

    // Horiz: Left - Right
    let gx = (left_up + 2.0 * left + left_down) - (right_up + 2.0 * right + right_down);

    // Vert: Up - Down
    let gy = (left_up + 2.0 * up + right_up) - (left_down + 2.0 * down + right_down);

    (gx * gx + gy * gy).sqrt()
}

impl SeamCarver {
    fn remove_vertical_seam(&mut self) {
        if self.width <= 1 {
            return;
        }

        let w = self.width as usize;
        let h = self.height as usize;
        let len = w * h;
        
        // Ensure buffers are sized correctly
        if self.energies.len() < len { self.energies.resize(len, 0.0); }
        if self.parents.len() < len { self.parents.resize(len, 0); }
        if self.seam.len() < h { self.seam.resize(h, 0); }
        
        // We only use the slice corresponding to current size
        let energies = &mut self.energies[0..len];
        let parents = &mut self.parents[0..len];
        let pixels = &self.pixels; // Read-only
        let width = self.width;
        let height = self.height;

        // 1. Compute all energies in parallel
        energies.par_chunks_mut(w).enumerate().for_each(|(y, row_slice)| {
             for (x, e) in row_slice.iter_mut().enumerate() {
                 *e = energy(width, height, pixels, x as u32, y as u32);
             }
        });

        // 2. DP
        // Unfortunately, DP is sequential row-by-row, but we parallelize within the row
        // We need to split mutable borrows manually because of the loop
        // We can't iterate `energies` and `parents` easily because of the dependency on previous row
        
        // We use raw pointers or careful indexing to appease borrow checker in a loop
        // Alternatively, we can use chunks
        
        // To be safe and simple with borrowing, let's use indices and `split_at_mut` inside the loop as before
        // But we need access to `energies` which is a slice.
        
        // We can't keep `energies` and `parents` borrowed for the whole loop if we split them repeatedly.
        // But we can.
        
        // Re-borrowing from self.energies inside the loop is not possible if we hold a mutable reference to self or fields.
        // But we are inside a method where we have `&mut self`.
        // We already extracted `energies` and `parents` as mutable slices.
        
        // We can't use `energies` in the loop easily if we want to parallelize the row update using rayon on `curr_row`.
        // Rayon requires `Send`.
        
        // Let's replicate the previous logic but on the slice `energies`.
        for y in 1..h {
            let (upper, lower) = energies.split_at_mut(y * w);
            let (curr_row_energies, _) = lower.split_at_mut(w);
            let prev_row_energies = &upper[(y - 1) * w..];
            
            let (_, p_lower) = parents.split_at_mut(y * w);
            let (curr_row_parents, _) = p_lower.split_at_mut(w);

            // Sequential update of current row to avoid overhead
            curr_row_energies.iter_mut().zip(curr_row_parents.iter_mut()).enumerate().for_each(|(x, (e, p))| {
                 let mut min_cost = f32::MAX;
                 let mut parent_x = x;

                 // Top (x)
                 let top_val = prev_row_energies[x];
                 if top_val < min_cost {
                     min_cost = top_val;
                     parent_x = x;
                 }

                 // Top-Left (x-1)
                 if x > 0 {
                     let tl = prev_row_energies[x - 1];
                     if tl < min_cost {
                         min_cost = tl;
                         parent_x = x - 1;
                     }
                 }

                 // Top-Right (x+1)
                 if x < w - 1 {
                     let tr = prev_row_energies[x + 1];
                     if tr < min_cost {
                         min_cost = tr;
                         parent_x = x + 1;
                     }
                 }

                 *e += min_cost;
                 *p = parent_x as i32;
            });
        }

        // 3. Find min seam end
        let last_row_start = (h - 1) * w;
        let last_row = &energies[last_row_start..];
        
        let (_min_seam_cost, curr_x_idx) = last_row.iter().enumerate()
            .fold((f32::MAX, 0), |(min_val, min_idx), (idx, val)| {
                if *val < min_val {
                    (*val, idx)
                } else {
                    (min_val, min_idx)
                }
            });
            
        let mut curr_x = curr_x_idx;

        // 4. Backtrack seam
        // self.seam is reused
        let seam = &mut self.seam[0..h];
        
        for y in (0..h).rev() {
            seam[y] = curr_x;
            if y > 0 {
                let idx = y * w + curr_x;
                curr_x = parents[idx] as usize;
            }
        }

        // 5. Remove seam (Parallel copy)
        let new_w = w - 1;
        let new_len = new_w * h * 4;
        
        // Use temp_pixels
        if self.temp_pixels.len() < new_len { self.temp_pixels.resize(new_len, 0); }
        let dest_pixels = &mut self.temp_pixels[0..new_len];
        
        // We need to read from `self.pixels` and write to `dest_pixels`.
        // `dest_pixels` is borrowed from `self.temp_pixels`.
        // `pixels` was borrowed from `self.pixels`.
        // These are disjoint fields, so we can borrow them simultaneously if we destructure or borrow disjointly.
        // But I accessed them via `self` earlier.
        
        // To satisfy borrow checker:
        // We need to drop mutable borrows of `energies`, `parents`, `seam` before we swap.
        // But we need `seam` for the copy loop.
        // `seam` borrows `self.seam`.
        // `dest_pixels` borrows `self.temp_pixels`.
        // `pixels` borrows `self.pixels`.
        // All distinct.
        
        // However, `dest_pixels` needs `par_chunks_exact_mut`.
        // `seam` is read-only here.
        // `pixels` is read-only here.
        
        dest_pixels.par_chunks_exact_mut(new_w * 4).enumerate().for_each(|(y, row_dest)| {
            let remove_x = seam[y];
            let src_row_start = y * w * 4;
            
            // Copy before
            let before_len = remove_x * 4;
            row_dest[..before_len].copy_from_slice(&pixels[src_row_start..src_row_start + before_len]);
            
            // Copy after
            let after_src_start = src_row_start + (remove_x + 1) * 4;
            let after_len = (w - 1 - remove_x) * 4;
            row_dest[before_len..].copy_from_slice(&pixels[after_src_start..after_src_start + after_len]);
        });

        // Swap buffers
        // self.pixels <-> self.temp_pixels
        // We need to truncate self.temp_pixels to match the logical size if we rely on len(), 
        // but we rely on `width` and `height` for logic.
        // However, `image_ptr` returns pointer to `self.pixels`.
        // `temp_pixels` might be larger than needed. That's fine, `image_ptr` points to start.
        // The JS side reads `width * height * 4`.
        
        // We just swap.
        std::mem::swap(&mut self.pixels, &mut self.temp_pixels);
        self.width -= 1;
    }

    fn remove_horizontal_seam(&mut self) {
        self.transpose();
        self.remove_vertical_seam();
        self.transpose();
    }

    fn transpose(&mut self) {
        let w = self.width as usize;
        let h = self.height as usize;
        let len = w * h * 4;
        
        if self.temp_pixels.len() < len { self.temp_pixels.resize(len, 0); }
        let dest_pixels = &mut self.temp_pixels[0..len];
        let src_pixels = &self.pixels;
        
        dest_pixels.par_chunks_exact_mut(h * 4).enumerate().for_each(|(x, dest_row)| {
            for y in 0..h {
                let src_idx = (y * w + x) * 4;
                let dest_idx = y * 4;
                
                dest_row[dest_idx] = src_pixels[src_idx];
                dest_row[dest_idx+1] = src_pixels[src_idx+1];
                dest_row[dest_idx+2] = src_pixels[src_idx+2];
                dest_row[dest_idx+3] = src_pixels[src_idx+3];
            }
        });
        
        std::mem::swap(&mut self.pixels, &mut self.temp_pixels);
        std::mem::swap(&mut self.width, &mut self.height);
    }
}
