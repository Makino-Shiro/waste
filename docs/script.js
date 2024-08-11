document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");

    const captureButton = document.getElementById('capture-btn');
    const cameraSelect = document.getElementById('cameraSelect');
    const webcamContainer = document.getElementById('webcam');
    let videoElement;
    let model, bodyPixModel;
    let stream;

    async function init() {
        const modelURL = './model.json';
        const metadataURL = './metadata.json';

        // 加载 Teachable Machine 模型和 BodyPix 模型
        model = await tmImage.load(modelURL, metadataURL);
        bodyPixModel = await bodyPix.load();

        // 获取可用摄像头并填充选择框
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Camera ${index + 1}`;
            cameraSelect.appendChild(option);
        });

        cameraSelect.onchange = startCamera;
        await startCamera();
    }

    async function startCamera() {
        const deviceId = cameraSelect.value;

        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                deviceId: deviceId ? { exact: deviceId } : undefined
            }
        });

        videoElement = document.createElement('video');
        videoElement.srcObject = stream;
        videoElement.play();

        webcamContainer.innerHTML = '';
        webcamContainer.appendChild(videoElement);
    }

    async function captureAndClassify() {
        console.log("Button clicked - starting capture and classification");

        // Capture the current video frame and process it with BodyPix
        const segmentation = await bodyPixModel.segmentPerson(videoElement, {
            flipHorizontal: false,
            internalResolution: 'medium',
            segmentationThreshold: 0.7
        });

        console.log("Segmentation complete:", segmentation);

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
        const prediction = await model.predict(canvas);

        console.log("Classification results:", prediction);

        const maxPrediction = prediction.reduce((prev, current) => (prev.probability > current.probability) ? prev : current);
        const wasteType = maxPrediction.className;
        const confidence = (maxPrediction.probability * 100).toFixed(2);

        document.getElementById('result').innerText = `This is ${wasteType} with ${confidence}% confidence`;

        displayInstructions(wasteType);
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
        const historyElement = document.getElementById('history');
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerText = `${timestamp} - ${wasteType} with ${confidence}% confidence`;
        historyElement.appendChild(historyItem);
    }

    if (captureButton) {
        captureButton.addEventListener('click', captureAndClassify);
        console.log("Event listener added successfully");
    } else {
        console.error("capture-btn element not found");
    }

    init();
});
