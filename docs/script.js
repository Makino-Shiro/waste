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
    
    videoSelect.innerHTML = ''; // Clear any existing options
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

    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop()); // Stop previous stream
    }

    const constraints = {
        video: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            facingMode: deviceId ? undefined : 'environment' // Default to rear camera if no specific device selected
        }
    };

    try {
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        await handleStream(currentStream);
    } catch (error) {
        console.error("Error accessing media devices.", error);
        alert("無法存取攝影鏡頭，請確認您的設備是否允許存取攝影機。");
    }
}

async function handleStream(stream) {
    currentStream = stream;

    if (webcam) {
        webcam.stop();
    }

    // Initialize webcam with the stream
    webcam = new tmImage.Webcam(200, 200, true); // width, height, flip
    await webcam.setup({ video: { deviceId: stream.getVideoTracks()[0].getSettings().deviceId } }); // Setup the webcam
    await webcam.play(); // Start the webcam

    isFrozen = false;
    window.requestAnimationFrame(loop);

    document.getElementById('webcam').innerHTML = '';
    document.getElementById('webcam').appendChild(webcam.canvas);

    document.getElementById('restore-btn').disabled = true; // Disable the restore button initially
}

async function loop() {
    if (!isFrozen) {
        webcam.update(); // Update the webcam frame only if not frozen
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

    // Display the predicted waste type and confidence
    document.getElementById('result').innerHTML = `這是「<span class="highlight">${wasteType}</span>」(${confidence}%信賴度)`;

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
            instructions = 
                'A. 熟廚餘（可回收做養豬用）\n' +
                '1. 蔬果類: 料理後所剩的菜葉、根莖、水果、蜜餞\n' +
                '2. 米食類: 料理後所剩的米飯、米粉、五穀等米製品\n' +
                '3. 麵食類: 料理後所剩的麵條、麵糰等\n' +
                '4. 豆製品: 料理後所剩的豆腐、豆花、豆乾等\n' +
                '5. 蛋肉類: 料理後所剩的蛋類食品、雞鴨豬魚肉、肉類加工食品等\n' +
                '6. 雜糧類: 糕餅、餅乾、乾糧、麵包類、零食等\n' +
                '7. 其他類: 果醬、麵粉、製作失敗之納豆、味噌及其他不再食用或腐敗的食品或熟食\n\n' +
                '請先行瀝乾，並以容器盛裝，再倒入廚餘回收桶，請勿將塑膠袋、塑膠繩、免洗筷、衛生紙及牙籤等一併放入。\n\n' +
                'B. 生廚餘（可回收作厭氧醱酵，產生沼氣用於發電）\n' +
                '1. 蔬菜類: 各式未烹飪或腐爛的蔬菜、皮、籽及菜心、塊莖\n' +
                '2. 水果類: 各式未烹飪或腐爛的水果、皮\n' +
                '3. 殘渣類: 茶葉渣、咖啡渣、黃豆渣\n\n' +
                'C. 不回收(一般垃圾)\n' +
                '生肉、骨頭、調味用中藥渣、果核類、果殼類、筍殼、玉米芯、蛋殼、海鮮殼等，請以一般垃圾處理。';
            break;
        case '電子':
            instructions = 
                '電子垃圾指的是那些家中用不到或報廢的電器、電子產品，如洗衣機、電風扇、熱水壺等。\n' +
                '需將塑膠、銅、鐵、鋁和IC板拆開分別回收，不能直接丟棄在垃圾桶。\n\n' +
                '回收電子垃圾的方式:\n' +
                '1. 電話洽詢清潔隊，並安排收取時間及地點。\n' +
                '2. 尋找資源回收個體戶或回收商。\n' +
                '3. 7-11或全家便利商店回收電池、光碟、筆電、手機等，並可換取購物抵用金。\n' +
                '4. 前往販賣場所的回收點，如NOVA、燦坤等。\n' +
                '5. 聯絡或上網查詢當地環保局了解回收細節，或聯絡資源回收場處理。';
            break;
        // Similar instructions for other waste types...
        default:
            instructions = '請選擇一個垃圾類別以查看正確的回收處理方式。';
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
        historyItem.innerHTML = `${index + 1}. ${entry.timestamp} - ${entry.wasteType}(${entry.confidence}%信賴度)`;
        historyElement.appendChild(historyItem); // Append each entry to the history container
    });
}

// Initialize the model and webcam when the page loads
init();

// Set up the event listener for the classify and restore buttons
document.getElementById('classify-btn').addEventListener('click', predict);
document.getElementById('restore-btn').addEventListener('click', restoreWebcam);
