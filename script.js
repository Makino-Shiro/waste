const URL = './';
let model, webcam, maxPredictions;

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
    const maxPrediction = prediction.reduce((prev, current) => (prev.probability > current.probability) ? prev : current);
    document.getElementById('result').innerText = `This is ${maxPrediction.className}`;
}

// Initialize the model and webcam when the page loads
init();

// Set up the event listener for the classify button
document.getElementById('classify-btn').addEventListener('click', predict);
