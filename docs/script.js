const URL = './';
let model, webcam, maxPredictions;
let cameras = [];
let classificationHistory = [];

// Load the model and metadata, and initialize the webcam
async function init() {
    const modelURL = URL + 'model.json';
    const metadataURL = URL + 'metadata.json';
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    // Load available cameras
    cameras = await navigator.mediaDevices.enumerateDevices();
    cameras = cameras.filter(device => device.kind === 'videoinput');
    
    // Create camera selection dropdown
    const cameraSelect = document.createElement('select');
    cameraSelect.id = 'cameraSelect';
    cameras.forEach((camera, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.text = camera.label || `Camera ${index + 1}`;
        cameraSelect.appendChild(option);
    });

    // Insert the camera selection dropdown at the beginning of the container
    const container = document.querySelector('.container');
    container.insertBefore(cameraSelect, container.firstChild);

    cameraSelect.addEventListener('change', () => setupWebcam(cameraSelect.value));

    // Set up the initial webcam
    await setupWebcam(0);

    // Load BodyPix model for background removal
    await loadBodyPix();
}

// Setup webcam
async function setupWebcam(cameraIndex) {
    if (webcam) {
        webcam.stop();
    }
    const flip = true;
    webcam = new tmImage.Webcam(200, 200, flip, cameras[cameraIndex].deviceId);
    await webcam.setup();
    await webcam.play();
    window.requestAnimationFrame(loop);
    document.getElementById('webcam').innerHTML = '';
    document.getElementById('webcam').appendChild(webcam.canvas);
}

// Webcam frame update loop
async function loop() {
    webcam.update();
    window.requestAnimationFrame(loop);
}

// Load BodyPix model
let bodyPixNet;
async function loadBodyPix() {
    bodyPixNet = await bodyPix.load();
}

// Remove background from webcam feed
async function removeBackground() {
    const segmentation = await bodyPixNet.segmentPerson(webcam.canvas);
    const maskBackground = bodyPix.toMask(segmentation);
    const canvas = document.createElement('canvas');
    canvas.width = webcam.canvas.width;
    canvas.height = webcam.canvas.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(maskBackground, 0, 0);
    return canvas;
}

// Predict waste type and display results
async function predict() {
    const bgRemovedCanvas = await removeBackground();
    const prediction = await model.predict(bgRemovedCanvas);
    const maxPrediction = prediction.reduce((prev, current) => (prev.probability > current.probability) ? prev : current);
    const wasteType = maxPrediction.className;
    const confidence = (maxPrediction.probability * 100).toFixed(2);

    document.getElementById('result').innerText = `This is ${wasteType} (Confidence: ${confidence}%)`;

    // Display sorting instructions
    displayInstructions(wasteType);

    // Save to history
    saveToHistory(wasteType, confidence);
}

// Display waste sorting instructions
function displayInstructions(wasteType) {
    const customInstructions = localStorage.getItem(`instructions_${wasteType}`);
    const instructions = customInstructions || getDefaultInstructions(wasteType);
    document.getElementById('instructions').innerText = instructions;
}

// Get default instructions for waste type
function getDefaultInstructions(wasteType) {
    switch (wasteType) {
        case '廚餘': return 'Please separate food waste from non-food waste.';
        case '電子': return 'Please remove batteries and dispose of electronics at designated collection points.';
        case '布料': return 'Textiles should be cleaned before disposal. Consider donating if reusable.';
        case '塑料': return 'Ensure plastics are clean and dry before recycling.';
        case '玻璃': return 'Glass should be cleaned and sorted by color if required.';
        case '紙類': return 'Flatten cardboard and ensure paper is dry before recycling.';
        case '金屬': return 'Rinse metal containers and remove any labels before recycling.';
        default: return 'No instructions available.';
    }
}

// Save classification history to local storage
function saveToHistory(wasteType, confidence) {
    const entry = { wasteType, confidence, timestamp: new Date().toISOString() };
    classificationHistory.push(entry);
    localStorage.setItem('classificationHistory', JSON.stringify(classificationHistory));
    updateHistoryDisplay();
}

// Update the history display
function updateHistoryDisplay() {
    const historyElement = document.getElementById('history');
    historyElement.innerHTML = classificationHistory.map(entry => {
        return `<p>${entry.timestamp}: ${entry.wasteType} (Confidence: ${entry.confidence}%)</p>`;
    }).join('');
}

// Allow users to set custom instructions
function setCustomInstructions(wasteType, instructions) {
    localStorage.setItem(`instructions_${wasteType}`, instructions);
}

// Initialize the model and webcam when the page loads
init();
document.getElementById('classify-btn').addEventListener('click', predict);

// Example of how a user might set custom instructions
// setCustomInstructions('廚餘', 'Place food waste in the green bin.');
