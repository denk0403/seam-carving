// --- Utils Class ---

class Utils {
	/** @param {APixel} onLeft */
	/** @param {APixel} onRight */
	connectLeftToRight(onLeft, onRight) {
		onLeft.setRight(onRight);
		onRight.setLeft(onLeft);
	}

	/** @param {APixel} onBottom */
	/** @param {APixel} onTop */
	connectDownToUp(onBottom, onTop) {
		onBottom.setUp(onTop);
		onTop.setDown(onBottom);
	}

	// Constructs graph from ImageData
	// image: { width, height, data } (ImageData like object)
	constructPixelGraph(image) {
		const result = [];
		let pixel = new Pixel();
		let frontOfRow = new BorderPixel();

		for (let y = 0; y < image.height; y++) {
			const row = [];
			// Get color at 0, y
			const newFront = new Pixel(this.getColorAt(image, 0, y));
			this.connectDownToUp(newFront, frontOfRow);
			frontOfRow = newFront;
			pixel = newFront;
			row.push(pixel);

			for (let x = 1; x < image.width; x++) {
				const nextPixel = new Pixel(this.getColorAt(image, x, y));
				this.connectLeftToRight(pixel, nextPixel);
				// Note: Logic matches Java: connect nextPixel's UP to (pixel.up.right)
				// Because pixel.up is the pixel above 'pixel', so pixel.up.right is the pixel above 'nextPixel'
				this.connectDownToUp(nextPixel, pixel.getUp().getRight());
				pixel = nextPixel;
				row.push(pixel);
			}
			result.push(row);
		}
		return result;
	}

	getColorAt(image, x, y) {
		const idx = (y * image.width + x) * 4;
		const r = image.data[idx];
		const g = image.data[idx + 1];
		const b = image.data[idx + 2];
		// Pack into 0xRRGGBB
		return (r << 16) | (g << 8) | b;
	}

	verifyPixelGraph(pixels) {
		// JS implementation of graph verification (optional/debug)
		return true;
	}

	/**
	 * @param {APixel[][]} pixels
	 * @param {boolean} isVert
	 * @returns {ASeamInfo[]}
	 */
	seamify(pixels, isVert) {
		if (pixels.length === 0 || pixels[0].length === 0) return [];

		const h = pixels.length;
		const w = pixels[0].length;

		// Flat arrays for performance (Float32 for weights, Int32 for parent indices)
		const energies = new Float32Array(w * h);
		// parents stores the flat index of the parent in the previous row
		const parents = new Int32Array(w * h);

		// Initialize first row
		for (let x = 0; x < w; x++) {
			energies[x] = pixels[0][x].energy();
			parents[x] = -1;
		}

		// DP loop
		for (let y = 1; y < h; y++) {
			const rowOffset = y * w;
			const prevRowOffset = (y - 1) * w;

			for (let x = 0; x < w; x++) {
				const pixel = pixels[y][x];
				const energy = pixel.energy();

				// Default to top neighbor
				const topIdx = prevRowOffset + x;
				let minParentCost = energies[topIdx];
				let minParentIdx = topIdx;

				// Check top-left
				if (x > 0) {
					const leftIdx = prevRowOffset + (x - 1);
					if (energies[leftIdx] < minParentCost) {
						minParentCost = energies[leftIdx];
						minParentIdx = leftIdx;
					}
				}

				// Check top-right
				if (x < w - 1) {
					const rightIdx = prevRowOffset + (x + 1);
					if (energies[rightIdx] < minParentCost) {
						minParentCost = energies[rightIdx];
						minParentIdx = rightIdx;
					}
				}

				const idx = rowOffset + x;
				energies[idx] = minParentCost + energy;
				parents[idx] = minParentIdx;
			}
		}

		// Find best seam end in the last row
		let minSeamIdx = -1;
		let minSeamCost = Infinity;
		const lastRowOffset = (h - 1) * w;

		for (let x = 0; x < w; x++) {
			const idx = lastRowOffset + x;
			const cost = energies[idx];
			if (cost < minSeamCost) {
				minSeamCost = cost;
				minSeamIdx = idx;
			}
		}

		// Reconstruct the path indices from bottom to top
		const pathIndices = new Int32Array(h);
		let currIdx = minSeamIdx;
		for (let y = h - 1; y >= 0; y--) {
			pathIndices[y] = currIdx;
			currIdx = parents[currIdx];
		}

		// Build the linked list of SeamInfo objects (top to bottom)
		// Note: SeamInfo constructor takes 'cameFrom' (parent), so we build top-down
		let lastSeamInfo = null;
		for (let y = 0; y < h; y++) {
			const flatIdx = pathIndices[y];
			// x coordinate is remainder of division by width
			const x = flatIdx % w;
			const pixel = pixels[y][x];
			const weight = energies[flatIdx];

			if (isVert) {
				lastSeamInfo = new VertSeamInfo(pixel, weight, lastSeamInfo, x);
			} else {
				lastSeamInfo = new HorizSeamInfo(pixel, weight, lastSeamInfo, x);
			}
		}

		// Return array containing just the tail of the best seam
		return [lastSeamInfo];
	}

	/**
	 * @param {ASeamInfo[]} seams
	 * @returns {ASeamInfo}
	 */
	getSmallestSeam(seams) {
		if (seams.length === 0) return null;
		let indexOfSmallest = 0;
		for (let i = 0; i < seams.length; i++) {
			if (seams[i].totalWeight < seams[indexOfSmallest].totalWeight) {
				indexOfSmallest = i;
			}
		}
		return seams[indexOfSmallest];
	}

	/**
	 * @param {ASeamInfo[][]} src
	 * @returns {ASeamInfo[][]}
	 */
	transpose(src) {
		const length = src[0]?.length ?? 0;

		/** @type {ASeamInfo[][]} */
		const zipped = new Array(length).fill(null).map(() => new Array(src.length).fill(null));

		for (let i = 0; i < length; i++) {
			for (let j = 0; j < src.length; j++) {
				zipped[i][j] = src[j][i];
			}
		}

		return zipped;
	}
}

const utils = new Utils();

// --- Color Constants (Hex integers 0xRRGGBB) ---
const COLOR_RED = 0xFF0000;
const COLOR_BLACK = 0x000000;
const COLOR_WHITE = 0xFFFFFF;

// --- Pixel Classes ---

// Abstract Pixel equivalent
class APixel {
	invalidateEnergy() {
		// Do nothing by default
	}

	energy() {
		return (this.horizEnergy() ** 2 + this.vertEnergy() ** 2) ** 0.5;
	}

	sameIPixelAs(pixel) {
		throw new Error("Method 'sameIPixelAs' must be implemented.");
	}

	// Neighbors (default implementation for BorderPixel mainly, overridden in Pixel)
	setRight(p) {}
	setLeft(p) {}
	setUp(p) {}
	setDown(p) {}

	getRight() {
		return this;
	}
	getLeft() {
		return this;
	}
	getUp() {
		return this;
	}
	getDown() {
		return this;
	}
}

class BorderPixel extends APixel {
	constructor() {
		super();
	}

	getColor(mode) {
		return COLOR_BLACK;
	}

	brightness() {
		return 0;
	}

	horizEnergy() {
		return 0;
	}

	vertEnergy() {
		return 0;
	}

	sameIPixelAs(pixel) {
		return pixel.sameBorderPixelAs(this);
	}

	sameBorderPixelAs(pixel) {
		return true;
	}

	samePixelAs(pixel) {
		return false;
	}

	separate() {
		// Do nothing
	}
}

class Pixel extends APixel {
	/**
	 * @param {number|Pixel} colorOrBase
	 * @param {APixel} up
	 * @param {APixel} down
	 * @param {APixel} left
	 * @param {APixel} right
	 */
	constructor(colorOrBase, up, down, left, right) {
		super();

		if (arguments.length === 1 || arguments.length === 0) {
			// Constructor 1: (number origColor) or ()
			this.color = (colorOrBase !== undefined) ? colorOrBase : COLOR_WHITE;
			this.beingRemoved = false;
			this.up = new BorderPixel();
			this.down = new BorderPixel();
			this.left = new BorderPixel();
			this.right = new BorderPixel();
			this.energyCache = null;
			this.brightnessCache = null;
		} else {
			// Constructor 2: (Pixel base, IPixel up, IPixel down, IPixel left, IPixel right)
			// Used for testing mostly, but good to have
			const base = colorOrBase;
			this.color = base.color;
			this.beingRemoved = base.beingRemoved;
			this.up = up;
			this.down = down;
			this.left = left;
			this.right = right;
			this.energyCache = null;
			this.brightnessCache = null;
		}
	}

	invalidateEnergy() {
		this.energyCache = null;
	}

	setRight(pixel) {
		this.right = pixel;
		this.invalidateEnergy();
		this.up.invalidateEnergy();
		this.down.invalidateEnergy();
	}

	setLeft(pixel) {
		this.left = pixel;
		this.invalidateEnergy();
		this.up.invalidateEnergy();
		this.down.invalidateEnergy();
	}

	setUp(pixel) {
		this.up = pixel;
		this.invalidateEnergy();
		this.left.invalidateEnergy();
		this.right.invalidateEnergy();
	}

	setDown(pixel) {
		this.down = pixel;
		this.invalidateEnergy();
		this.left.invalidateEnergy();
		this.right.invalidateEnergy();
	}

	getRight() {
		return this.right;
	}
	getLeft() {
		return this.left;
	}
	getUp() {
		return this.up;
	}
	getDown() {
		return this.down;
	}

	getColor(mode) {
		if (mode === undefined) mode = 1; // Default mode

		if (this.beingRemoved) {
			return COLOR_RED;
		}

		if (mode === 1) {
			return this.color;
		} else {
			// Energy mode
			const e = this.energy();
			const normalizedValue = Math.floor((e / Math.sqrt(32)) * 255);
			const v = Math.max(0, Math.min(255, normalizedValue));
			return (v << 16) | (v << 8) | v;
		}
	}

	brightness() {
		if (this.brightnessCache === null) {
			const c = this.color;
			const r = (c >> 16) & 0xFF;
			const g = (c >> 8) & 0xFF;
			const b = c & 0xFF;
			this.brightnessCache = (r + g + b) / 765.0;
		}
		return this.brightnessCache;
	}

	horizEnergy() {
		// Using neighbors
		return (
			this.left.getUp().brightness() +
			2 * this.left.brightness() +
			this.left.getDown().brightness() -
			(this.right.getUp().brightness() +
				2 * this.right.brightness() +
				this.right.getDown().brightness())
		);
	}

	vertEnergy() {
		return (
			this.up.getLeft().brightness() +
			2 * this.up.brightness() +
			this.up.getRight().brightness() -
			(this.down.getLeft().brightness() +
				2 * this.down.brightness() +
				this.down.getRight().brightness())
		);
	}

	energy() {
		if (this.energyCache === null) {
			this.energyCache = super.energy();
		}
		return this.energyCache;
	}

	sameIPixelAs(pixel) {
		return pixel.samePixelAs(this);
	}

	sameBorderPixelAs(pixel) {
		return false;
	}

	samePixelAs(pixel) {
		return this === pixel; // Identity check is sufficient in JS usually, but sticking to logic
	}

	slideStill() {
		utils.connectLeftToRight(this.getLeft(), this.getRight());
	}

	slideLeft() {
		utils.connectLeftToRight(this.getLeft(), this.getRight());
		utils.connectDownToUp(this.getRight(), this.getUp());
	}

	slideRight() {
		utils.connectLeftToRight(this.getLeft(), this.getRight());
		utils.connectDownToUp(this.getLeft(), this.getUp());
	}

	slideStillHoriz() {
		utils.connectDownToUp(this.getDown(), this.getUp());
	}

	slideUp() {
		utils.connectDownToUp(this.getDown(), this.getUp());
		utils.connectLeftToRight(this.getLeft(), this.getDown());
	}

	slideDown() {
		utils.connectDownToUp(this.getDown(), this.getUp());
		utils.connectLeftToRight(this.getLeft(), this.getUp());
	}

	separate() {
		this.up = new BorderPixel();
		this.down = new BorderPixel();
		this.left = new BorderPixel();
		this.right = new BorderPixel();
	}

	revalidate() {
		utils.connectDownToUp(this, this.up);
		utils.connectDownToUp(this.down, this);
		utils.connectLeftToRight(this, this.right);
		utils.connectLeftToRight(this.left, this);
	}
}

// --- Seam Info Classes ---

class ASeamInfo {
	/**
	 * @param {APixel} pixel
	 * @param {number} totalWeight
	 * @param {ASeamInfo} cameFrom
	 * @param {number} index
	 */
	constructor(pixel, totalWeight, cameFrom, index) {
		this.pixel = pixel;
		this.totalWeight = totalWeight;
		this.cameFrom = cameFrom;
		this.index = index;
	}

	paintRed() {
		this.pixel.beingRemoved = true;
		if (this.cameFrom !== null) {
			this.cameFrom.paintRed();
		}
	}

	unPaintRed() {
		this.pixel.beingRemoved = false;
		if (this.cameFrom !== null) {
			this.cameFrom.unPaintRed();
		}
	}

	// Abstract methods
	makeNextSeam(pixel, weight, index) {
		throw new Error("Abstract method");
	}
	removeSelf(pixels, pos) {
		throw new Error("Abstract method");
	}
	insert(pixels) {
		throw new Error("Abstract method");
	}
	insertHelper(pixels, count) {
		throw new Error("Abstract method");
	}
}

class VertSeamInfo extends ASeamInfo {
	constructor(pixel, totalWeight, cameFrom, index) {
		super(pixel, totalWeight, cameFrom, index);
	}

	removeSelf(pixels, row) {
		if (this.cameFrom !== null) {
			if (this.cameFrom.pixel.sameIPixelAs(this.pixel.getUp())) {
				this.pixel.slideStill();
			} else if (this.cameFrom.pixel.sameIPixelAs(this.pixel.getUp().getRight())) {
				this.pixel.slideLeft();
			} else if (this.cameFrom.pixel.sameIPixelAs(this.pixel.getUp().getLeft())) {
				this.pixel.slideRight();
			} else {
				throw new Error("Pixel Image is Ill-Formed");
			}
			this.cameFrom.removeSelf(pixels, row - 1);
		} else {
			this.pixel.slideStill();
		}

		if (this.index !== -1) {
			pixels[row].splice(this.index, 1);
		} else {
			const idx = pixels[row].indexOf(this.pixel);
			if (idx > -1) pixels[row].splice(idx, 1);
		}
	}

	makeNextSeam(pixel, weight, index) {
		return new VertSeamInfo(pixel, weight, this, index);
	}

	insert(pixels) {
		return this.insertHelper(pixels, 0);
	}

	insertHelper(pixels, count) {
		if (pixels.length - 1 < count) {
			pixels.push([]);
		}
		if (this.cameFrom !== null) {
			this.cameFrom.insertHelper(pixels, count + 1);
		}
		this.pixel.revalidate();
		const row = pixels.length - count - 1;

		// indexOf with object reference equality
		const index = pixels[row].indexOf(this.pixel.getRight());
		if (index === -1) {
			pixels[row].push(this.pixel);
		} else {
			pixels[row].splice(index, 0, this.pixel);
		}
		return pixels;
	}
}

class HorizSeamInfo extends ASeamInfo {
	constructor(pixel, totalWeight, cameFrom, index) {
		super(pixel, totalWeight, cameFrom, index);
	}

	/**
	 * @param {APixel[][]} pixels
	 * @param {number} col
	 */
	removeSelf(pixels, col) {
		if (this.cameFrom !== null) {
			if (this.cameFrom.pixel.sameIPixelAs(this.pixel.getLeft())) {
				this.pixel.slideStillHoriz();
			} else if (this.cameFrom.pixel.sameIPixelAs(this.pixel.getLeft().getDown())) {
				this.pixel.slideUp();
			} else if (this.cameFrom.pixel.sameIPixelAs(this.pixel.getLeft().getUp())) {
				this.pixel.slideDown();
			} else {
				throw new Error("Pixel Image is Ill-Formed");
			}
			this.cameFrom.removeSelf(pixels, col - 1);
		} else {
			this.pixel.slideStillHoriz();
		}

		if (this.index !== -1) {
			pixels[col].splice(this.index, 1);
		} else {
			const idx = pixels[col].indexOf(this.pixel);
			if (idx > -1) pixels[col].splice(idx, 1);
		}
	}

	makeNextSeam(pixel, weight, index) {
		return new HorizSeamInfo(pixel, weight, this, index);
	}

	insert(pixels) {
		pixels = utils.transpose(pixels);
		pixels = this.insertHelper(pixels, 0);
		pixels = utils.transpose(pixels);
		return pixels;
	}

	insertHelper(pixels, count) {
		if (pixels.length - 1 < count) {
			pixels.push([]);
		}
		if (this.cameFrom !== null) {
			this.cameFrom.insertHelper(pixels, count + 1);
		}
		this.pixel.revalidate();
		const row = pixels.length - count - 1;
		const index = pixels[row].indexOf(this.pixel.getDown());
		if (index === -1) {
			pixels[row].push(this.pixel);
		} else {
			pixels[row].splice(index, 0, this.pixel);
		}
		return pixels;
	}
}

// --- Seam Carving Logic ---

class SeamCarving {
	constructor(image) {
		// image is the ImageData object from canvas context
		this.width = image.width;
		this.height = image.height;
		this.pixels = utils.constructPixelGraph(image);
		this.history = []; // Stack
		this.badSeam = null;

		// Mode: 0 = Vert, 1 = Horiz, 2 = Alternating, 3 = Random
		this.mode = 3;
		this.removeVert = true; // Keep for internal state of current operation
		this.isPlaying = true; // Start playing immediately
		this.colorMode = 1;
		this.isReversed = false;
	}

    /**
     * @param {CanvasRenderingContext2D} ctx 
     * @param {HTMLCanvasElement} canvas 
     * @returns {void}
     */
	updateCanvas(ctx, canvas) {
		// Efficiently update canvas
		const currentHeight = this.pixels.length;
		const currentWidth = this.pixels.length > 0 ? this.pixels[0].length : 0;

		if (currentWidth <= 0 || currentHeight <= 0) {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			return;
		}

		// Clear background
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		const imgData = ctx.createImageData(currentWidth, currentHeight);
		const data = imgData.data;

		const sqrt32 = 5.65685424949;

		for (let y = 0; y < currentHeight; y++) {
			const row = this.pixels[y];
			for (let x = 0; x < row.length; x++) {
				const pixel = row[x];
				
				let r, g, b;
				if (pixel.beingRemoved) {
					r = 255;
					g = 0;
					b = 0;
				} else if (this.colorMode === 1) {
					const c = pixel.color;
					r = (c >> 16) & 0xFF;
					g = (c >> 8) & 0xFF;
					b = c & 0xFF;
				} else {
					const e = pixel.energy();
					const normalizedValue = Math.floor((e / sqrt32) * 255);
					const v = normalizedValue > 255 ? 255 : (normalizedValue < 0 ? 0 : normalizedValue);
					r = v;
					g = v;
					b = v;
				}

				const idx = (y * currentWidth + x) * 4;
				data[idx] = r;
				data[idx + 1] = g;
				data[idx + 2] = b;
				data[idx + 3] = 255; // alpha
			}
		}

		// Center image
		const dx = Math.floor((canvas.width - currentWidth) / 2);
		const dy = Math.floor((canvas.height - currentHeight) / 2);

		ctx.putImageData(imgData, dx, dy);
	}

	onTick() {
		// Check boundaries first to set direction
		if (this.pixels.length === 0 || (this.pixels.length > 0 && this.pixels[0].length === 0)) {
			this.isReversed = true;
		} else if (this.history.length === 0 && this.badSeam === null) {
			this.isReversed = false;
		}

		if (this.isPlaying) {
			this.removeOrInsert();
		} else {
			if (this.badSeam !== null) {
				if (this.isReversed) {
					this.insertBadSeam();
				} else {
					this.removeBadSeam();
				}
			}
		}
	}

	removeOrInsert() {
		if (this.isReversed) {
			this.insertSeam();
		} else {
			this.removeSeam();
		}
	}

	insertSeam() {
		if (this.badSeam === null) {
			if (this.history.length > 0) {
				this.badSeam = this.history.pop();
				this.pixels = this.badSeam.insert(this.pixels);
				// Verify graph if needed
			}
		} else {
			this.insertBadSeam();
		}
	}

	insertBadSeam() {
		if (this.badSeam) {
			this.badSeam.unPaintRed();
			this.badSeam = null;
		}
	}

	removeSeam() {
		if (this.badSeam === null) {
			// Determine which direction to remove based on mode
			if (this.mode === 0) {
				this.removeVert = true;
			} else if (this.mode === 1) {
				this.removeVert = false;
			} else if (this.mode === 2) {
				// Alternating
				this.removeVert = !this.removeVert;
			} else if (this.mode === 3) {
				// Random - weighted by dimensions like original Java code
				const currentHeight = this.pixels.length;
				const currentWidth = this.pixels.length > 0 ? this.pixels[0].length : 1;
				this.removeVert = Math.random() >= currentHeight / (currentWidth + currentHeight);
			}

			this.seamCarve();
		} else {
			this.removeBadSeam();
		}
	}

	seamCarve() {
		if (this.removeVert) {
			const seams = utils.seamify(this.pixels, this.removeVert);
			this.badSeam = utils.getSmallestSeam(seams);
		} else {
			this.pixels = utils.transpose(this.pixels);
			const seams = utils.seamify(this.pixels, this.removeVert);
			this.badSeam = utils.getSmallestSeam(seams);
			this.pixels = utils.transpose(this.pixels);
		}

		if (this.badSeam !== null) {
			this.badSeam.paintRed();
		}
	}

	removeBadSeam() {
		if (this.badSeam instanceof VertSeamInfo) {
			this.badSeam.removeSelf(this.pixels, this.pixels.length - 1);
		} else {
			this.pixels = utils.transpose(this.pixels);
			this.badSeam.removeSelf(this.pixels, this.pixels.length - 1);
			this.pixels = utils.transpose(this.pixels);
		}
		this.history.push(this.badSeam);
		this.badSeam = null;
	}
}

// --- UI Glue ---

let seamCarving = null;
let canvas = document.getElementById("seamCanvas");
let ctx = canvas.getContext("2d", { willReadFrequently: true });
let animationId = null;
let video = document.getElementById("webcamVideo");
let isWebcamActive = false;

// DOM Elements
const btnPlayPause = document.getElementById("btnPlayPause");
const btnToggleMode = document.getElementById("btnToggleMode");
const btnReverse = document.getElementById("btnReverse");
const btnColorMode = document.getElementById("btnColorMode");
const btnWebcam = document.getElementById("btnWebcam");
const statusText = document.getElementById("statusText");
const dimText = document.getElementById("dimensions");
const fpsText = document.getElementById("fpsCounter");
const inputTargetWidth = document.getElementById("targetWidth");
const inputTargetHeight = document.getElementById("targetHeight");
const webcamControls = document.getElementById("webcamControls");
const videoWrapper = document.getElementById("videoWrapper");

function updateStatus() {
	if (isWebcamActive) {
		btnPlayPause.innerText = video.paused ? "Resume Feed" : "Pause Feed";
		statusText.innerText = "Live Seam Carving";
		dimText.innerText = `Target: ${inputTargetWidth.value} x ${inputTargetHeight.value}`;
		return;
	}

	if (!seamCarving) return;

	btnPlayPause.innerText = seamCarving.isPlaying ? "Pause" : "Play";

	let modeText = "Mode: Vertical";
	if (seamCarving.mode === 1) modeText = "Mode: Horizontal";
	else if (seamCarving.mode === 2) modeText = "Mode: Alternating";
	else if (seamCarving.mode === 3) modeText = "Mode: Random";

	btnToggleMode.innerText = modeText;
	btnColorMode.innerText = seamCarving.colorMode === 1 ? "Color: Normal" : "Color: Energy";

	const width = seamCarving.pixels.length > 0 ? seamCarving.pixels[0].length : 0;
	const height = seamCarving.pixels.length;
	dimText.innerText = `Dimensions: ${width} x ${height}`;

	statusText.innerText = seamCarving.isReversed ? "Reversing (Inserting)" : "Carving (Removing)";
}

let lastTime = 0;
let frameCount = 0;
let lastFpsTime = 0;

function loop(timestamp) {
	if (!lastTime) lastTime = timestamp;
	const deltaTime = timestamp - lastTime;
	lastTime = timestamp;

	if (seamCarving) {
		seamCarving.onTick();
		seamCarving.updateCanvas(ctx, canvas);
		updateStatus();
	} else if (isWebcamActive && video.readyState >= 2 && !video.paused) {
		// Live Seam Carving Loop
		
		// 1. Draw video to canvas to get data (scaled down if needed)
		let w = video.videoWidth;
		let h = video.videoHeight;

		if (w === 0 || h === 0) return;

		// Limit max processing size for performance
		const MAX_SIZE = 400; 
		if (w > MAX_SIZE || h > MAX_SIZE) {
			const ratio = Math.min(MAX_SIZE / w, MAX_SIZE / h);
			w = Math.floor(w * ratio);
			h = Math.floor(h * ratio);
		}
		
		// Ensure canvas is large enough for the operation
		if (canvas.width !== w || canvas.height !== h) {
			canvas.width = w;
			canvas.height = h;
		}

        // Update video element size to match canvas for consistency
        video.width = w;
        video.height = h;

		ctx.drawImage(video, 0, 0, w, h);
		const imgData = ctx.getImageData(0, 0, w, h);

		// 2. Create SeamCarving instance
		// We don't use the global seamCarving instance to avoid state issues with the main loop's animation
		// But since we are IN the loop, we can just use a local one.
		const sc = new SeamCarving(imgData);

		// 3. Carve to target
		const targetW = parseInt(inputTargetWidth.value) || w;
		const targetH = parseInt(inputTargetHeight.value) || h;

		// Clamp targets
		const safeTargetW = Math.max(1, Math.min(w, targetW));
		const safeTargetH = Math.max(1, Math.min(h, targetH));

		// Remove seams until target reached
		let currentW = sc.pixels.length > 0 ? sc.pixels[0].length : 0;
		let currentH = sc.pixels.length;

		while ((currentW > safeTargetW || currentH > safeTargetH) && currentW > 0 && currentH > 0) {
			const diffW = Math.max(0, currentW - safeTargetW);
			const diffH = Math.max(0, currentH - safeTargetH);
			
			if (diffW === 0) {
				sc.removeVert = false;
			} else if (diffH === 0) {
				sc.removeVert = true;
			} else {
				// Probability proportional to seams left to remove
				sc.removeVert = Math.random() < (diffW / (diffW + diffH));
			}

			sc.seamCarve();
			sc.removeBadSeam();

			// Update dimensions
			currentH = sc.pixels.length;
			currentW = sc.pixels.length > 0 ? sc.pixels[0].length : 0;
		}

		// 4. Draw Result
		sc.updateCanvas(ctx, canvas);
		
		updateStatus();
	}

	// FPS Counter
	frameCount++;
	if (timestamp - lastFpsTime >= 1000) {
		fpsText.innerText = `FPS: ${frameCount}`;
		frameCount = 0;
		lastFpsTime = timestamp;
	}

	animationId = requestAnimationFrame(loop);
}

// Initial Start
animationId = requestAnimationFrame(loop);

// File Upload
const imageUploadInput = document.getElementById("imageUpload");
const dropOverlay = document.getElementById("dropOverlay");

function stopWebcam() {
	if (isWebcamActive) {
		isWebcamActive = false;
		const stream = video.srcObject;
		if (stream) {
			stream.getTracks().forEach(track => track.stop());
			video.srcObject = null;
		}
		webcamControls.style.display = "none";
        videoWrapper.style.display = "none";
	}
}

function handleImageUpload(file) {
	if (!file) return;
	
	stopWebcam();

	const reader = new FileReader();
	reader.onload = function (event) {
		const img = new Image();
		img.onload = function () {
			// Resize if too big to prevent browser hang
			let w = img.width;
			let h = img.height;
			const MAX_SIZE = 800; // Cap size for performance
			if (w > MAX_SIZE || h > MAX_SIZE) {
				const ratio = Math.min(MAX_SIZE / w, MAX_SIZE / h);
				w = Math.floor(w * ratio);
				h = Math.floor(h * ratio);
			}

			canvas.width = w;
			canvas.height = h;
			ctx.drawImage(img, 0, 0, w, h);
			const imgData = ctx.getImageData(0, 0, w, h);

			seamCarving = new SeamCarving(imgData);
			updateStatus();
		};
		img.src = event.target.result;
	};
	reader.readAsDataURL(file);
}

imageUploadInput.addEventListener("change", function (e) {
	handleImageUpload(e.target.files[0]);
});

// Drag and Drop Logic
window.addEventListener("dragover", (e) => {
	e.preventDefault();
	dropOverlay.classList.remove("hidden");
});

window.addEventListener("dragleave", (e) => {
	e.preventDefault();
	// Only hide if we left the window/document
	if (e.relatedTarget === null) {
		dropOverlay.classList.add("hidden");
	}
});

window.addEventListener("drop", (e) => {
	e.preventDefault();
	dropOverlay.classList.add("hidden");

	if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
		handleImageUpload(e.dataTransfer.files[0]);
		// Reset input just in case
		imageUploadInput.value = "";
	}
});

// Paste Logic
window.addEventListener("paste", (e) => {
	if (e.clipboardData && e.clipboardData.items) {
		const items = e.clipboardData.items;
		for (let i = 0; i < items.length; i++) {
			if (items[i].type.indexOf("image") !== -1) {
				const file = items[i].getAsFile();
				handleImageUpload(file);
				e.preventDefault();
				return;
			}
		}
	}
});

// Controls
btnPlayPause.addEventListener("click", () => {
	if (isWebcamActive) {
		if (video.paused) {
			video.play();
		} else {
			video.pause();
		}
		updateStatus();
		return;
	}

	if (seamCarving) seamCarving.isPlaying = !seamCarving.isPlaying;
});

btnWebcam.addEventListener("click", () => {
	startWebcam();
});

function startWebcam() {
	if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
		navigator.mediaDevices.getUserMedia({ video: true })
			.then(function(stream) {
				video.srcObject = stream;
				video.play();
				
				video.onloadedmetadata = () => {
					let w = video.videoWidth;
					let h = video.videoHeight;
					// Apply initial downscale logic to match the loop's processing size
					const MAX_SIZE = 400;
					if (w > MAX_SIZE || h > MAX_SIZE) {
						const ratio = Math.min(MAX_SIZE / w, MAX_SIZE / h);
						w = Math.floor(w * ratio);
						h = Math.floor(h * ratio);
					}
					
					
					inputTargetWidth.value = w;
					inputTargetHeight.value = h;
				};

				isWebcamActive = true;
				seamCarving = null; // Reset current carving
				webcamControls.style.display = "flex";
                videoWrapper.style.display = "block"; // Or flex, handled by CSS if class removed, but we used inline style in HTML
				updateStatus();
			})
			.catch(function(error) {
				console.error("Error accessing webcam:", error);
				alert("Could not access webcam. Please ensure you have granted permission.");
			});
	} else {
		alert("Webcam not supported in this browser.");
	}
}

btnToggleMode.addEventListener("click", () => {
	if (seamCarving) {
		seamCarving.mode = (seamCarving.mode + 1) % 4;

		// If switching modes, we should probably recalculate seams if not playing
		if (!seamCarving.isPlaying && seamCarving.badSeam === null && !seamCarving.isReversed) {
			// Reset removeVert based on new mode for immediate feedback if single stepping?
			// Actually, we'll just let the next tick handle it or manual step.
			// But if we want to update the view if we were about to remove something?
			// It's safer to just let it be until next action.
		}
		updateStatus();
	}
});

btnReverse.addEventListener("click", () => {
	if (seamCarving) {
		seamCarving.isReversed = !seamCarving.isReversed;
	}
});

btnColorMode.addEventListener("click", () => {
	if (seamCarving) {
		seamCarving.colorMode = seamCarving.colorMode === 1 ? 2 : 1;
	}
});

document.getElementById("btnReset").addEventListener("click", () => {
	// Reload logic or reset
	// For now just basic reset if image exists
	// Ideally we'd keep the original image data somewhere
	alert("Reload the page or upload image again to reset.");
});

// Keyboard Controls
window.addEventListener("keydown", (e) => {
	if (!seamCarving) return;

	if (e.key === " ") {
		seamCarving.isPlaying = !seamCarving.isPlaying;
		e.preventDefault();
	}

	if (e.key === "1") seamCarving.colorMode = 1;
	if (e.key === "2") seamCarving.colorMode = 2;

	if (!seamCarving.isPlaying && seamCarving.badSeam === null) {
		if (seamCarving.isReversed) {
			if (e.key === "i") {
				seamCarving.insertSeam();
			}
		} else {
			if (e.key === "m") {
				seamCarving.mode = (seamCarving.mode + 1) % 4;
				updateStatus();
			} else if (e.key === "v") {
				seamCarving.mode = 0;
				seamCarving.removeVert = true;
				seamCarving.seamCarve();
				updateStatus();
			} else if (e.key === "h") {
				seamCarving.mode = 1;
				seamCarving.removeVert = false;
				seamCarving.seamCarve();
				updateStatus();
			}
		}
	}
});
