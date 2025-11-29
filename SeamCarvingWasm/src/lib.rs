use wasm_bindgen::prelude::*;

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
pub struct SeamCarver {
    width: u32,
    height: u32,
    pixels: Vec<u8>, // RGBA, row-major
}

#[wasm_bindgen]
impl SeamCarver {
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32, data: &[u8]) -> SeamCarver {
        #[cfg(feature = "console_error_panic_hook")]
        console_error_panic_hook::set_once();

        SeamCarver {
            width,
            height,
            pixels: data.to_vec(),
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
}

impl SeamCarver {
    #[inline(always)]
    fn get_brightness(&self, idx: usize) -> f32 {
        let r = self.pixels[idx] as f32;
        let g = self.pixels[idx + 1] as f32;
        let b = self.pixels[idx + 2] as f32;
        (r + g + b) / 765.0
    }

    #[inline(always)]
    fn get_pixel_brightness(&self, x: i32, y: i32) -> f32 {
        if x < 0 || x >= self.width as i32 || y < 0 || y >= self.height as i32 {
            return 0.0;
        }
        let idx = ((y as u32 * self.width + x as u32) * 4) as usize;
        self.get_brightness(idx)
    }

    #[inline(always)]
    fn energy(&self, x: u32, y: u32) -> f32 {
        let x = x as i32;
        let y = y as i32;

        let left_up = self.get_pixel_brightness(x - 1, y - 1);
        let left = self.get_pixel_brightness(x - 1, y);
        let left_down = self.get_pixel_brightness(x - 1, y + 1);

        let right_up = self.get_pixel_brightness(x + 1, y - 1);
        let right = self.get_pixel_brightness(x + 1, y);
        let right_down = self.get_pixel_brightness(x + 1, y + 1);

        let up = self.get_pixel_brightness(x, y - 1);
        let down = self.get_pixel_brightness(x, y + 1);

        // Horiz: Left - Right
        // (LeftUp + 2*Left + LeftDown) - (RightUp + 2*Right + RightDown)
        let gx = (left_up + 2.0 * left + left_down) - (right_up + 2.0 * right + right_down);

        // Vert: Up - Down
        // (UpLeft + 2*Up + UpRight) - (DownLeft + 2*Down + DownRight)
        // Note: UpLeft is same as LeftUp
        let gy = (left_up + 2.0 * up + right_up) - (left_down + 2.0 * down + right_down);

        (gx * gx + gy * gy).sqrt()
    }

    fn remove_vertical_seam(&mut self) {
        if self.width <= 1 {
            return;
        }

        let w = self.width as usize;
        let h = self.height as usize;
        let mut energies = vec![0.0f32; w * h];
        // parents stores the offset from current x (-1, 0, 1) to get to parent
        // actually simpler to store parent index or x-coord
        let mut parents = vec![0i32; w * h];

        // Compute energies and DP
        for y in 0..h {
            for x in 0..w {
                let e = self.energy(x as u32, y as u32);
                let idx = y * w + x;
                
                if y == 0 {
                    energies[idx] = e;
                    parents[idx] = -1; // No parent
                } else {
                    // Find min parent from y-1
                    let prev_row_start = (y - 1) * w;
                    
                    // Candidates: x-1, x, x+1
                    let mut min_cost = f32::MAX;
                    let mut parent_x = x; // default

                    // Top (x)
                    let top_idx = prev_row_start + x;
                    if energies[top_idx] < min_cost {
                        min_cost = energies[top_idx];
                        parent_x = x;
                    }

                    // Top-Left (x-1)
                    if x > 0 {
                         let tl_idx = prev_row_start + (x - 1);
                         if energies[tl_idx] < min_cost {
                             min_cost = energies[tl_idx];
                             parent_x = x - 1;
                         }
                    }

                    // Top-Right (x+1)
                    if x < w - 1 {
                         let tr_idx = prev_row_start + (x + 1);
                         if energies[tr_idx] < min_cost {
                             min_cost = energies[tr_idx];
                             parent_x = x + 1;
                         }
                    }

                    energies[idx] = e + min_cost;
                    parents[idx] = parent_x as i32;
                }
            }
        }

        // Find min seam end
        let mut min_seam_cost = f32::MAX;
        let mut curr_x = 0;
        let last_row_start = (h - 1) * w;
        for x in 0..w {
             let cost = energies[last_row_start + x];
             if cost < min_seam_cost {
                 min_seam_cost = cost;
                 curr_x = x;
             }
        }

        // Backtrack seam
        let mut seam = vec![0usize; h];
        for y in (0..h).rev() {
            seam[y] = curr_x;
            if y > 0 {
                let idx = y * w + curr_x;
                curr_x = parents[idx] as usize;
            }
        }

        // Remove seam
        // We will compact the pixels in place or into a new buffer
        // Compact in place is tricky because of row shifts.
        // New buffer is safer and easier.
        let new_w = w - 1;
        let mut new_pixels = Vec::with_capacity(new_w * h * 4);
        
        for y in 0..h {
            let remove_x = seam[y];
            let row_start = y * w * 4;
            
            // Copy part before seam
            let before_len = remove_x * 4;
            new_pixels.extend_from_slice(&self.pixels[row_start .. row_start + before_len]);
            
            // Copy part after seam
            let after_start = row_start + (remove_x + 1) * 4;
            let row_end = row_start + w * 4;
            new_pixels.extend_from_slice(&self.pixels[after_start .. row_end]);
        }

        self.pixels = new_pixels;
        self.width -= 1;
    }

    fn remove_horizontal_seam(&mut self) {
        // Transpose, remove vertical, transpose back
        // Or implement logic directly. Transpose is easier to reuse code.
        self.transpose();
        self.remove_vertical_seam();
        self.transpose();
    }

    fn transpose(&mut self) {
        let w = self.width as usize;
        let h = self.height as usize;
        let mut new_pixels = vec![0u8; w * h * 4];
        
        for y in 0..h {
            for x in 0..w {
                let src_idx = (y * w + x) * 4;
                let dst_idx = (x * h + y) * 4;
                
                new_pixels[dst_idx] = self.pixels[src_idx];
                new_pixels[dst_idx+1] = self.pixels[src_idx+1];
                new_pixels[dst_idx+2] = self.pixels[src_idx+2];
                new_pixels[dst_idx+3] = self.pixels[src_idx+3];
            }
        }
        
        self.pixels = new_pixels;
        std::mem::swap(&mut self.width, &mut self.height);
    }
}

