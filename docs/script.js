const URL = './';
let model, webcam, maxPredictions;
let history = [];

async function init() {
    const modelURL = URL + 'model.json';
    const metadataURL = URL + 'metadata.json';

    // Load the model and metadata from Teachable Machine
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    // Set up the webcam and start it
    const flip = true; // Whether to flip the webcam (mirror)
    webcam = new tmImage.Webcam(200, 200, flip); // width, height, flip
    await webcam.setup(); // request access to the webcam
    await webcam.play();
    window.requestAnimationFrame(loop);

    // Append the webcam's video element to the DOM
    document.getElementById('webcam').appendChild(webcam.canvas);
}

async function loop() {
    webcam.update(); // Update the webcam frame
    window.requestAnimationFrame(loop);
}

async function predict() {
    // Predict the waste type using the model
    const prediction = await model.predict(webcam.canvas);
    
    // Find the prediction with the highest confidence
    const maxPrediction = prediction.reduce((prev, current) => (prev.probability > current.probability) ? prev : current);
    const wasteType = maxPrediction.className;
    const confidence = (maxPrediction.probability * 100).toFixed(2); // Convert to percentage and format to 2 decimal places

    // Display the predicted waste type and confidence
    document.getElementById('result').innerText = `This is ${wasteType} with ${confidence}% confidence`;

    // Display sorting instructions based on the waste type
    displayInstructions(wasteType);

    // Log the prediction in history
    addHistory(wasteType, confidence);
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
    history.push({ wasteType, confidence, timestamp });
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    const historyElement = document.getElementById('history');
    if (!historyElement) {
        console.error("Element with id 'history' not found!");
        return;
    }

    historyElement.innerHTML = ''; // Clear previous history
    
    history.forEach((entry, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerText = `${index + 1}. ${entry.timestamp} - ${entry.wasteType} with ${entry.confidence}% confidence`;
        historyElement.appendChild(historyItem);
    });
}

// Initialize the model and webcam when the page loads
init();

// Set up the event listener for the classify button
document.getElementById('classify-btn').addEventListener('click', predict);
