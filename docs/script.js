const URL = './';
let model, webcam, maxPredictions;
let history = [];
let currentStream;
let isFrozen = false;

async function init() {
    const modelURL = URL + 'model.json';
    const metadataURL = URL + 'metadata.json';

    // 加載模型和元數據
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    // 列出所有可用的相機
    const videoSelect = document.getElementById('videoSource');
    const noneOption = document.createElement('option');
    noneOption.value = "";
    noneOption.text = "None";
    videoSelect.appendChild(noneOption);

    const devices = await navigator.mediaDevices.enumerateDevices();
    devices.forEach(device => {
        if (device.kind === 'videoinput') {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Camera ${videoSelect.length}`;
            videoSelect.appendChild(option);
        }
    });

    videoSelect.onchange = setupWebcam;
}

async function setupWebcam() {
    const videoSelect = document.getElementById('videoSource');
    const deviceId = videoSelect.value;

    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    if (deviceId) {
        const constraints = {
            video: {
                deviceId: { exact: deviceId }
            }
        };

        try {
            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            await handleStream(currentStream);
        } catch (error) {
            console.error("Error accessing media devices.", error);
        }
    } else {
        document.getElementById('webcam').innerHTML = '<p>請選擇一個相機來啟用視頻。</p>';
    }
}

async function handleStream(stream) {
    currentStream = stream;

    if (webcam) {
        webcam.stop();
    }

    // 初始化並啟動webcam
    webcam = new tmImage.Webcam(200, 200, true); // width, height, flip
    await webcam.setup({ video: stream });
    await webcam.play();

    isFrozen = false;
    window.requestAnimationFrame(loop);

    document.getElementById('webcam').innerHTML = '';
    document.getElementById('webcam').appendChild(webcam.canvas);

    document.getElementById('restore-btn').disabled = true; // 初始禁用恢復按鈕
}

async function loop() {
    if (!isFrozen) {
        webcam.update(); // 只有在未凍結的情況下更新webcam框架
        window.requestAnimationFrame(loop);
    }
}

async function predict() {
    if (currentStream && !isFrozen) {
        isFrozen = true; // 凍結webcam以停止循環
        document.getElementById('restore-btn').disabled = false; // 啟用恢復按鈕

        const prediction = await model.predict(webcam.canvas);
        const maxPrediction = prediction.reduce((prev, current) => (prev.probability > current.probability) ? prev : current);
        const wasteType = maxPrediction.className;
        const confidence = (maxPrediction.probability * 100).toFixed(2);

        document.getElementById('result').innerHTML = `這是「<span class="highlight">${wasteType}</span>」(${confidence}%信賴度)`;

        document.getElementById('waste-type').innerText = `Waste Type: ${wasteType}`;
        displayInstructions(wasteType);
        addHistory(wasteType, confidence);
    }
}

function restoreWebcam() {
    isFrozen = false; // 解除凍結webcam
    window.requestAnimationFrame(loop); // 恢復循環
    document.getElementById('restore-btn').disabled = true; // 禁用恢復按鈕
}

function displayInstructions(wasteType) {
    let instructions = '';

    // 指令內容略...
    document.getElementById('instructions').innerText = instructions;
}

function addHistory(wasteType, confidence) {
    const timestamp = new Date().toLocaleString();
    history.unshift({ wasteType, confidence, timestamp });
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    const historyElement = document.getElementById('history');
    if (!historyElement) {
        console.error("Element with id 'history' not found!");
        return;
    }

    historyElement.innerHTML = '';
    history.forEach((entry, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `${index + 1}. ${entry.timestamp} - ${entry.wasteType}(${entry.confidence}%信賴度)`;
        historyElement.appendChild(historyItem);
    });
}

// 初始化模型和相機選項
init();

// 設置分類和恢復按鈕的事件監聽
document.getElementById('classify-btn').addEventListener('click', predict);
document.getElementById('restore-btn').addEventListener('click', restoreWebcam);
