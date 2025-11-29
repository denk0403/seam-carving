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
		return new Color(
			image.data[idx],
			image.data[idx + 1],
			image.data[idx + 2],
			image.data[idx + 3]
		);
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
		let memo = [];
		let nextMemo = [];

		if (pixels.length === 0 || pixels[0].length === 0) return [];

		// Init memo with nulls
		for (let i = 0; i < pixels[0].length; i++) {
			memo.push(null);
		}

		for (let pixelArr of pixels) {
			let x = 0;
			for (let pixel of pixelArr) {
				nextMemo.push(this.seamifyMemo(pixel, memo, x, isVert));
				x++;
			}
			memo = nextMemo;
			nextMemo = [];
		}
		return memo;
	}

	/**
	 * @param {APixel} pixel
	 * @param {ASeamInfo[]} memo
	 * @param {number} index
	 * @param {boolean} isVert
	 * @returns {ASeamInfo}
	 */
	seamifyMemo(pixel, memo, index, isVert) {
		const topLeft = this.getSeamOrNull(memo, index - 1);
		const topLeftValue = topLeft === null ? 0.0 : topLeft.totalWeight;

		const top = this.getSeamOrNull(memo, index);
		const topValue = top === null ? 0.0 : top.totalWeight;

		const topRight = this.getSeamOrNull(memo, index + 1);
		const topRightValue = topRight === null ? 0.0 : topRight.totalWeight;

		let minSeam = top;
		let minSeamValue = topValue;

		if (topLeft !== null && topLeftValue < minSeamValue) {
			minSeamValue = topLeftValue;
			minSeam = topLeft;
		}
		if (topRight !== null && topRightValue < minSeamValue) {
			minSeamValue = topRightValue;
			minSeam = topRight;
		}

		const energy = pixel.energy();
		if (minSeam === null) {
			return isVert
				? new VertSeamInfo(pixel, minSeamValue + energy, null, index)
				: new HorizSeamInfo(pixel, minSeamValue + energy, null, index);
		} else {
			return minSeam.makeNextSeam(pixel, minSeamValue + energy, index);
		}
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
	 * @param {ASeamInfo[]} memo
	 * @param {number} index
	 * @returns {ASeamInfo}
	 */
	getSeamOrNull(memo, index) {
		if (index >= 0 && index < memo.length) {
			return memo[index];
		}
		return null;
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

// --- Color Helper ---
class Color {
	constructor(r, g, b, a = 255) {
		this.r = Math.floor(r);
		this.g = Math.floor(g);
		this.b = Math.floor(b);
		this.a = Math.floor(a);
	}

	getRed() {
		return this.r;
	}
	getGreen() {
		return this.g;
	}
	getBlue() {
		return this.b;
	}

	toCSS() {
		return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a / 255})`;
	}

	static get RED() {
		if (!Color._RED) Color._RED = new Color(255, 0, 0);
		return Color._RED;
	}
	static get BLACK() {
		if (!Color._BLACK) Color._BLACK = new Color(0, 0, 0);
		return Color._BLACK;
	}
	static get WHITE() {
		if (!Color._WHITE) Color._WHITE = new Color(255, 255, 255);
		return Color._WHITE;
	}
}

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
		return Color.BLACK;
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
	 * @param {Color|Pixel} colorOrBase
	 * @param {APixel} up
	 * @param {APixel} down
	 * @param {APixel} left
	 * @param {APixel} right
	 */
	constructor(colorOrBase, up, down, left, right) {
		super();

		if (arguments.length === 1 || arguments.length === 0) {
			// Constructor 1: (Color origColor) or ()
			this.color = colorOrBase || Color.WHITE;
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
			return Color.RED;
		}

		if (mode === 1) {
			return this.color;
		} else {
			// Energy mode
			const e = this.energy();
			const normalizedValue = Math.floor((e / Math.sqrt(32)) * 255);
			const v = Math.max(0, Math.min(255, normalizedValue));
			return new Color(v, v, v);
		}
	}

	brightness() {
		if (this.brightnessCache === null) {
			this.brightnessCache =
				(this.color.getRed() + this.color.getBlue() + this.color.getGreen()) / 3.0 / 255.0;
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

		for (let y = 0; y < currentHeight; y++) {
			const row = this.pixels[y];
			for (let x = 0; x < row.length; x++) {
				const pixel = row[x];
				const color = pixel.getColor(this.colorMode);
				const idx = (y * currentWidth + x) * 4;
				data[idx] = color.r;
				data[idx + 1] = color.g;
				data[idx + 2] = color.b;
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

// DOM Elements
const btnPlayPause = document.getElementById("btnPlayPause");
const btnToggleMode = document.getElementById("btnToggleMode");
const btnReverse = document.getElementById("btnReverse");
const btnColorMode = document.getElementById("btnColorMode");
const statusText = document.getElementById("statusText");
const dimText = document.getElementById("dimensions");
const fpsText = document.getElementById("fpsCounter");

function updateStatus() {
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

function handleImageUpload(file) {
	if (!file) return;

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

// Controls
btnPlayPause.addEventListener("click", () => {
	if (seamCarving) seamCarving.isPlaying = !seamCarving.isPlaying;
});

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
