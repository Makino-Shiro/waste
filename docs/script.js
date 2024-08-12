const URL = './';
let model, webcam, maxPredictions;
let history = [];
let currentStream;
let isFrozen = false;

async function init() {
    const modelURL = URL + 'model.json';
    const metadataURL = URL + 'metadata.json';

    // Load the model and metadata from Teachable Machine
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    // List available cameras and allow user to select one
    const videoSelect = document.getElementById('videoSource');
    const devices = await navigator.mediaDevices.enumerateDevices();
    devices.forEach(device => {
        if (device.kind === 'videoinput') {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Camera ${videoSelect.length + 1}`;
            videoSelect.appendChild(option);
        }
    });

    videoSelect.onchange = setupWebcam;
    await setupWebcam(); // Setup the default camera
}

async function setupWebcam() {
    const videoSelect = document.getElementById('videoSource');
    const deviceId = videoSelect.value;

    // Stop any existing video stream
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
        video: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: deviceId ? undefined : 'environment' // Prefer rear camera on mobile devices if no device selected
        }
    };

    try {
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        await startWebcamStream(currentStream);
    } catch (error) {
        console.error("Error accessing media devices:", error);
    }
}

async function startWebcamStream(stream) {
    currentStream = stream;

    if (!webcam) {
        // Initialize webcam only once
        webcam = new tmImage.Webcam(200, 200, true); // width, height, flip
        await webcam.setup();
    }

    webcam.canvas.srcObject = stream;
    await webcam.play();

    isFrozen = false;
    window.requestAnimationFrame(loop);

    document.getElementById('webcam').innerHTML = '';
    document.getElementById('webcam').appendChild(webcam.canvas);

    document.getElementById('restore-btn').disabled = true; // Disable the restore button initially
}

async function loop() {
    if (!isFrozen) {
        await webcam.update(); // Update the webcam frame only if not frozen
        window.requestAnimationFrame(loop);
    }
}

async function predict() {
    isFrozen = true; // Freeze the webcam by stopping the loop
    document.getElementById('restore-btn').disabled = false; // Enable the restore button

    // Predict the waste type using the model
    const prediction = await model.predict(webcam.canvas);
    
    // Find the prediction with the highest confidence
    const maxPrediction = prediction.reduce((prev, current) => (prev.probability > current.probability) ? prev : current);
    const wasteType = maxPrediction.className;
    const confidence = (maxPrediction.probability * 100).toFixed(2); // Convert to percentage and format to 2 decimal places

    // Display the predicted waste type and confidence with colored text
    document.getElementById('result').innerHTML = `這是「<span style="color: blue;">${wasteType}</span>」(${confidence}%信賴度)`;

    // Update the waste type in the right panel
    document.getElementById('waste-type').innerText = `Waste Type: ${wasteType}`;

    // Display sorting instructions based on the waste type
    displayInstructions(wasteType);

    // Log the prediction in history
    addHistory(wasteType, confidence);
}

function restoreWebcam() {
    isFrozen = false; // Unfreeze the webcam
    window.requestAnimationFrame(loop); // Resume the loop
    document.getElementById('restore-btn').disabled = true; // Disable the restore button
}

function displayInstructions(wasteType) {
    let instructions = '';

    switch (wasteType) {
        case '廚餘':
            instructions = '廚餘處理方法：請將廚餘分開，放入廚餘桶中。';
            break;
        case '電子':
            instructions = '電子垃圾處理方法：請送到指定的電子垃圾回收點。';
            break;
        case '布料':
            instructions = '布料處理方法：可以考慮捐贈或作為再生資源回收。';
            break;
        case '塑料':
            instructions = '塑料垃圾處理方法：請放入塑料回收桶。';
            break;
        case '玻璃':
            instructions = '玻璃垃圾處理方法：請放入玻璃回收桶。';
            break;
        case '紙類':
            instructions = '紙類垃圾處理方法：請放入紙類回收桶。';
            break;
        case '金屬':
            instructions = '金屬垃圾處理方法：請放入金屬回收桶。';
            break;
        default:
            instructions = '無法提供該垃圾類型的處理方法。';
    }

    document.getElementById('instructions').innerText = instructions;
}

function addHistory(wasteType, confidence) {
    const timestamp = new Date().toLocaleString();
    history.unshift({ wasteType, confidence, timestamp }); // Add new entry at the beginning of the history array
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    const historyElement = document.getElementById('history');
    if (!historyElement) {
        console.error("Element with id 'history' not found!");
        return;
    }

    historyElement.innerHTML = ''; // Clear previous history

    // Iterate over the history array to display entries, now in the correct order
    history.forEach((entry, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerText = `${index + 1}. ${entry.timestamp} - ${entry.wasteType} with ${entry.confidence}% confidence`;
        historyElement.appendChild(historyItem); // Append each entry to the history container
    });
}

// Initialize the model and webcam when the page loads
init();

// Set up the event listener for the classify and restore buttons
document.getElementById('classify-btn').addEventListener('click', predict);
document.getElementById('restore-btn').addEventListener('click', restoreWebcam);
