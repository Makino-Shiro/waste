const URL = './';
let model, webcam, maxPredictions;
let stream;
let videoElement;

// 初始化 Teachable Machine 模型
async function init() {
    const modelURL = URL + 'model.json';
    const metadataURL = URL + 'metadata.json';

    // 加载 Teachable Machine 模型和元数据
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    // 获取可用摄像头并填充选择框
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    const cameraSelect = document.getElementById('cameraSelect');

    videoDevices.forEach((device, index) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `Camera ${index + 1}`;
        cameraSelect.appendChild(option);
    });

    cameraSelect.onchange = startCamera;
    await startCamera();
}

// 启动摄像头并显示实时视频
async function startCamera() {
    const cameraSelect = document.getElementById('cameraSelect');
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

    const webcamContainer = document.getElementById('webcam');
    webcamContainer.innerHTML = '';
    webcamContainer.appendChild(videoElement);
}

// 捕捉图像并进行分类
async function captureAndClassify() {
    console.log("Button clicked - starting capture and classification");

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    console.log("Image captured");

    // 执行分类
    const prediction = await model.predict(canvas);
    console.log("Classification results:", prediction);

    const maxPrediction = prediction.reduce((prev, current) => (prev.probability > current.probability) ? prev : current);
    const wasteType = maxPrediction.className;
    const confidence = (maxPrediction.probability * 100).toFixed(2);

    document.getElementById('result').innerText = `This is ${wasteType} with ${confidence}% confidence`;

    displayInstructions(wasteType);
    addHistory(wasteType, confidence);
}

// 显示分类结果的说明
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

// 添加分类结果到历史记录
function addHistory(wasteType, confidence) {
    const timestamp = new Date().toLocaleString();
    const historyElement = document.getElementById('history');
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.innerText = `${timestamp} - ${wasteType} with ${confidence}% confidence`;
    historyElement.appendChild(historyItem);

    // 滚动到最新的历史记录
    historyElement.scrollTop = historyElement.scrollHeight;
}

// 重启检测流程
function resetDetection() {
    console.log("Restarting detection process");
    document.getElementById('result').innerText = '';
    document.getElementById('instructions').innerText = 'Select an item to see instructions.';
    document.getElementById('webcam').innerHTML = '';
    startCamera();
}

// 确保 DOM 加载完成后再添加事件监听器
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");

    const captureButton = document.getElementById('capture-btn');
    const resetButton = document.getElementById('reset-btn');
    
    if (captureButton) {
        captureButton.addEventListener('click', captureAndClassify);
        console.log("Event listener added successfully for capture-btn");
    } else {
        console.error("capture-btn element not found");
    }

    if (resetButton) {
        resetButton.addEventListener('click', resetDetection);
        console.log("Reset button event listener added successfully for reset-btn");
    } else {
        console.error("reset-btn element not found");
    }

    init();
});
