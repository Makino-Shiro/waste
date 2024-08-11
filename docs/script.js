document.addEventListener('DOMContentLoaded', function () {
    console.log("DOM fully loaded and parsed");

    const captureButton = document.getElementById('capture-btn');
    const webcamContainer = document.getElementById('webcam');
    const resultContainer = document.getElementById('result');
    let videoElement;
    let stream;
    let bodyPixModel;
    let teachableModel;

    if (captureButton) {
        captureButton.addEventListener('click', captureAndClassify);
        console.log("Event listener added successfully");
    } else {
        console.error("capture-btn element not found");
    }

    async function startCamera() {
        stream = await navigator.mediaDevices.getUserMedia({
            video: true
        });

        videoElement = document.createElement('video');
        videoElement.srcObject = stream;
        videoElement.play();

        webcamContainer.innerHTML = '';
        webcamContainer.appendChild(videoElement);
    }

    async function loadModels() {
        bodyPixModel = await bodyPix.load();
        console.log("BodyPix model loaded");

        const modelURL = './model.json';
        const metadataURL = './metadata.json';
        teachableModel = await tmImage.load(modelURL, metadataURL);
        console.log("Teachable Machine model loaded");
    }

    async function captureAndClassify() {
        console.log("Button clicked - starting capture and classification");

        const segmentation = await bodyPixModel.segmentPerson(videoElement, {
            flipHorizontal: false,
            internalResolution: 'medium',
            segmentationThreshold: 0.7
        });

        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Apply the segmentation mask
        for (let i = 0; i < imageData.data.length; i += 4) {
            if (segmentation.data[i / 4] === 0) {
                imageData.data[i + 3] = 0; // Set alpha to 0 (transparent)
            }
        }

        ctx.putImageData(imageData, 0, 0);

        console.log("Image processing complete");

        // Display the processed image
        webcamContainer.innerHTML = '';
        webcamContainer.appendChild(canvas);

        // Perform the classification using the processed image
        const prediction = await teachableModel.predict(canvas);

        console.log("Classification results:", prediction);

        const maxPrediction = prediction.reduce((prev, current) => (prev.probability > current.probability) ? prev : current);
        const wasteType = maxPrediction.className;
        const confidence = (maxPrediction.probability * 100).toFixed(2);

        resultContainer.innerText = `This is ${wasteType} with ${confidence}% confidence`;
    }

    startCamera();
    loadModels();
});
