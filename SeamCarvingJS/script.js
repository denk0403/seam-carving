import init, { SeamCarver } from './pkg/seam_carving_wasm.js';

// Initialize WASM
let wasmInitialized = false;
init().then(() => {
    wasmInitialized = true;
    console.log("WASM Initialized");
});

// --- Seam Carving Logic Wrapper ---

class SeamCarvingWrapper {
    constructor(image) {
        if (!wasmInitialized) {
            throw new Error("WASM not initialized");
        }
        // image is ImageData
        const data = new Uint8Array(image.data.buffer);
        this.wasmCarver = new SeamCarver(image.width, image.height, data);
        
        this.isPlaying = true;
        this.mode = 3; // 0=Vert, 1=Horiz, 2=Alt, 3=Random
        this.colorMode = 1; // 1=Normal, 2=Energy (Not supported in WASM yet)
        this.isReversed = false; // Not supported in WASM basic impl
        this.removeVert = true;
    }

    get width() {
        return this.wasmCarver.width();
    }

    get height() {
        return this.wasmCarver.height();
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     * @param {HTMLCanvasElement} canvas 
     */
    updateCanvas(ctx, canvas) {
        const w = this.width;
        const h = this.height;

        if (w <= 0 || h <= 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        // Clear background
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Get view into WASM memory
        const ptr = this.wasmCarver.image_ptr();
        // Note: we must construct the TypedArray every time because WASM memory buffer can change (grow)
        // leading to detached buffers.
        const wasmMemory = init.memory || window.wasmMemory; // Access memory from init default export if possible, or bind it
        // Actually, wasm-bindgen exports 'memory' usually if configured, but 'init' returns it.
        // However, simpler way:
        const memory = wasm_bindgen.memory; // This might not be defined if we import default as init
        
        // We need to access the memory buffer. 
        // The default export 'init' returns a promise that resolves to the wasm module.
        // But we can also import 'memory' from the module if we knew the name, or use the one attached to the init.
        // Let's check how wasm-bindgen ES modules work. 
        // Usually: import init, { memory } from ...
        
        // Let's fix the import below.
    }
    
    // Placeholder, will fix in write
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
const imageUploadInput = document.getElementById("imageUpload");
const dropOverlay = document.getElementById("dropOverlay");

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
    btnColorMode.innerText = "Color: Normal"; // Energy mode not impl

    // Updated to use getters
    const width = seamCarving.width;
    const height = seamCarving.height;
    dimText.innerText = `Dimensions: ${width} x ${height}`;

    statusText.innerText = seamCarving.isReversed ? "Reversing (Not Impl)" : "Carving (Removing)";
}

let lastTime = 0;
let frameCount = 0;
let lastFpsTime = 0;

function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    // const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    if (seamCarving) {
        if (seamCarving.isPlaying) {
             seamCarving.onTick();
        }
        seamCarving.updateCanvas(ctx, canvas);
        updateStatus();
    } else if (isWebcamActive && video.readyState >= 2 && !video.paused && wasmInitialized) {
        // Live Seam Carving Loop
        let w = video.videoWidth;
        let h = video.videoHeight;

        if (w === 0 || h === 0) return;

        const MAX_SIZE = 400; 
        if (w > MAX_SIZE || h > MAX_SIZE) {
            const ratio = Math.min(MAX_SIZE / w, MAX_SIZE / h);
            w = Math.floor(w * ratio);
            h = Math.floor(h * ratio);
        }
        
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        video.width = w;
        video.height = h;

        ctx.drawImage(video, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);

        // Use WASM
        // Note: creating new SeamCarver every frame is expensive if we allocate memory?
        // It's okay for now.
        const sc = new SeamCarvingWrapper(imgData);

        const targetW = parseInt(inputTargetWidth.value) || w;
        const targetH = parseInt(inputTargetHeight.value) || h;
        const safeTargetW = Math.max(1, Math.min(w, targetW));
        const safeTargetH = Math.max(1, Math.min(h, targetH));

        let currentW = sc.width;
        let currentH = sc.height;

        while ((currentW > safeTargetW || currentH > safeTargetH) && currentW > 0 && currentH > 0) {
            const diffW = Math.max(0, currentW - safeTargetW);
            const diffH = Math.max(0, currentH - safeTargetH);
            
            if (diffW === 0) {
                sc.removeVert = false;
            } else if (diffH === 0) {
                sc.removeVert = true;
            } else {
                sc.removeVert = Math.random() < (diffW / (diffW + diffH));
            }

            sc.wasmCarver.carve(sc.removeVert);
            
            currentW = sc.width;
            currentH = sc.height;
        }

        sc.updateCanvas(ctx, canvas);
        updateStatus();
    }

    frameCount++;
    if (timestamp - lastFpsTime >= 1000) {
        fpsText.innerText = `FPS: ${frameCount}`;
        frameCount = 0;
        lastFpsTime = timestamp;
    }

    animationId = requestAnimationFrame(loop);
}

// Start loop
animationId = requestAnimationFrame(loop);

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
            let w = img.width;
            let h = img.height;
            const MAX_SIZE = 800;
            if (w > MAX_SIZE || h > MAX_SIZE) {
                const ratio = Math.min(MAX_SIZE / w, MAX_SIZE / h);
                w = Math.floor(w * ratio);
                h = Math.floor(h * ratio);
            }

            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);
            const imgData = ctx.getImageData(0, 0, w, h);

            if (wasmInitialized) {
                seamCarving = new SeamCarvingWrapper(imgData);
                updateStatus();
            } else {
                alert("WASM module not initialized yet.");
            }
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

imageUploadInput.addEventListener("change", function (e) {
    handleImageUpload(e.target.files[0]);
});

// Drag and Drop
window.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropOverlay.classList.remove("hidden");
});

window.addEventListener("dragleave", (e) => {
    e.preventDefault();
    if (e.relatedTarget === null) {
        dropOverlay.classList.add("hidden");
    }
});

window.addEventListener("drop", (e) => {
    e.preventDefault();
    dropOverlay.classList.add("hidden");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleImageUpload(e.dataTransfer.files[0]);
        imageUploadInput.value = "";
    }
});

// Paste
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
        if (video.paused) video.play();
        else video.pause();
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
                seamCarving = null;
                webcamControls.style.display = "flex";
                videoWrapper.style.display = "block";
                updateStatus();
            })
            .catch(function(error) {
                console.error("Error accessing webcam:", error);
                alert("Could not access webcam.");
            });
    } else {
        alert("Webcam not supported.");
    }
}

btnToggleMode.addEventListener("click", () => {
    if (seamCarving) {
        seamCarving.mode = (seamCarving.mode + 1) % 4;
        updateStatus();
    }
});

btnReverse.addEventListener("click", () => {
    // Not implemented in WASM
    alert("Seam Insertion (Reverse) is not yet implemented in the Rust/WASM version.");
});

btnColorMode.addEventListener("click", () => {
    alert("Energy visualization is not yet implemented in the Rust/WASM version.");
});

document.getElementById("btnReset").addEventListener("click", () => {
    alert("Reload the page or upload image again to reset.");
});

// Wrapper Method Implementation
SeamCarvingWrapper.prototype.onTick = function() {
    // Handle removal logic
    if (this.isReversed) {
        // Not implemented
        return; 
    }

    // Determine mode
    if (this.mode === 0) {
        this.removeVert = true;
    } else if (this.mode === 1) {
        this.removeVert = false;
    } else if (this.mode === 2) {
        this.removeVert = !this.removeVert;
    } else if (this.mode === 3) {
        const currentHeight = this.height;
        const currentWidth = this.width;
        // Avoid div by zero
        if (currentWidth + currentHeight > 0)
             this.removeVert = Math.random() >= currentHeight / (currentWidth + currentHeight);
        else this.removeVert = true;
    }

    this.wasmCarver.carve(this.removeVert);
};

// Import memory to be safe
// We need to get the memory object. 
// If we use the default export from init, it's usually the module instance.
let wasmModule;
async function initWasm() {
    wasmModule = await init();
    wasmInitialized = true;
    console.log("WASM module loaded");
}

// Overwrite init at top
initWasm();

SeamCarvingWrapper.prototype.updateCanvas = function(ctx, canvas) {
    const w = this.width;
    const h = this.height;

    if (w <= 0 || h <= 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const ptr = this.wasmCarver.image_ptr();
    const len = w * h * 4;
    // Access memory buffer from wasmModule
    const memory = wasmModule.memory; 
    const slices = new Uint8ClampedArray(memory.buffer, ptr, len);
    const imgData = new ImageData(slices, w, h);
    
    // Center
    const dx = Math.floor((canvas.width - w) / 2);
    const dy = Math.floor((canvas.height - h) / 2);

    ctx.putImageData(imgData, dx, dy);
};
