const URL = './';
let model, maxPredictions;
let history = [];
let currentStream;
let isDetecting = false;
let detectionInterval;

const videoElement = document.getElementById('webcam');
const videoSelect = document.getElementById('videoSource');
const switchCameraButton = document.getElementById('switch-camera');
const classifyButton = document.getElementById('classify-btn');
const pauseButton = document.getElementById('pause-btn');

// 停止現有的媒體流
function stopMediaTracks(stream) {
    if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
        });
    }
}

// 獲取可用的攝影機列表並填充到下拉選單中
function getCameraDevices() {
    return navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            return videoDevices;
        });
}

// 啟動攝影機流
function startCamera(deviceId) {
    const constraints = {
        video: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            width: { ideal: 640 }, // 設置為正方形尺寸
            height: { ideal: 640 },
        },
        audio: false
    };

    return navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            stopMediaTracks(currentStream);
            currentStream = stream;
            videoElement.srcObject = stream;
            return getCameraDevices();
        })
        .then(videoDevices => {
            if (videoSelect.options.length === 0) {
                videoDevices.forEach(device => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.text = device.label || `Camera ${videoSelect.length + 1}`;
                    videoSelect.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Error accessing media devices.', error);
        });
}

// 初始化攝影機和模型
async function init() {
    const modelURL = URL + 'model.json';
    const metadataURL = URL + 'metadata.json';

    // 加載模型和元數據
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    // 初始化攝影機
    await initCamera();
}

// 初始化攝影機
function initCamera() {
    return getCameraDevices()
        .then(videoDevices => {
            if (videoDevices.length === 0) {
                console.error('No video devices found.');
                return;
            }
            return startCamera(videoDevices[0].deviceId);
        })
        .catch(error => {
            console.error('Error during initialization.', error);
        });
}

// 垃圾辨識
async function predict() {
    if (!isDetecting) return;

    // 使用模型進行垃圾分類
    const prediction = await model.predict(videoElement);

    // 找出置信度最高的預測結果
    const maxPrediction = prediction.reduce((prev, current) => (prev.probability > current.probability) ? prev : current);
    const wasteType = maxPrediction.className;
    const confidence = (maxPrediction.probability * 100).toFixed(2); // 將置信度轉換為百分比並保留兩位小數

    // 顯示預測結果
    document.getElementById('result').innerHTML = `這是「<span class="highlight">${wasteType}</span>」(${confidence}%信賴度)`;

    // 更新右側面板的垃圾類型
    document.getElementById('waste-type').innerText = `Waste Type: ${wasteType}`;

    // 顯示對應的處理方式
    displayInstructions(wasteType);

    // 記錄歷史紀錄
    addHistory(wasteType, confidence);
}

// 開始分類
function startClassification() {
    if (isDetecting) return;

    isDetecting = true;
    classifyButton.disabled = true;
    pauseButton.disabled = false;
    videoSelect.disabled = true;
    switchCameraButton.disabled = true;

    detectionInterval = setInterval(predict, 500); // 每0.5秒偵測一次
}

// 暫停分類並凍結畫面
function pauseClassification() {
    if (!isDetecting) return;

    isDetecting = false;
    clearInterval(detectionInterval);
    detectionInterval = null;

    // 保留當前畫面，而不是停止攝影機流
    videoElement.pause();

    classifyButton.disabled = false;
    pauseButton.disabled = true;
    videoSelect.disabled = false;
    switchCameraButton.disabled = false;
}

// 恢復攝影機流
function resumeCamera() {
    videoElement.play(); // 恢復流動
}

// 顯示對應的垃圾處理方式
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
        case '布料':
            instructions = 
                '可回收項目: 國內舊衣回收主要推廣二手衣再使用，如外衣、外褲、裙子、洋裝等均可回收。\n' +
                '不可回收項目: 棉被、枕頭、床單、帽子、內衣褲、鞋襪等紡織品請勿投入舊衣回收箱。\n\n' +
                '民眾交付舊衣前請清潔整理，勿弄溼、弄髒，經簡單打包後通過指定的回收管道處理。\n\n' +
                '減少丟棄衣物的建議:\n' +
                '1. 減少購買\n' +
                '2. 用租借代替購買\n' +
                '3. 舊衣改造\n' +
                '4. 二手衣再利用';
            break;
        case '塑料':
            instructions = 
                '塑膠回收技術包括機械回收、燃燒發電和化學回收。\n\n' +
                '世界上的塑膠再利用技術:\n' +
                '1. 機械回收: 將單一種類塑膠分選出來及製成再生塑膠粒。\n' +
                '2. 燃燒發電: 大多數雜質多的塑膠直接以燃燒發電處理。\n' +
                '3. 生產單體或原料: 化學法回收技術，將塑膠分解為塑膠單體再合成使用。\n' +
                '4. 轉換成有機碳回收: 適用於生物可分解塑膠，可用堆肥技術生產肥料或沼氣。\n' +
                '5. 生產液態燃料: 使用熱裂解技術將塑膠分解為燃油。';
            break;
        case '玻璃':
            instructions = 
                '玻璃為百分之百可回收再利用的資源，經破碎變成碎玻璃可再製成建材等。\n\n' +
                '廢玻璃回收正確步驟:\n' +
                '1. 去瓶蓋、去標籤、去除內容物。\n' +
                '2. 清洗後晾乾並分色回收。\n' +
                '3. 若有破碎玻璃，請妥善包覆並標示。\n\n' +
                '廢玻璃容器再利用:\n' +
                '亮彩琉璃、地磚、再生建材、玻璃纖維、化學吸附劑、玻璃瀝青及人造大理石等。';
            break;
        case '紙類':
            instructions = 
                '一般廢紙類: 報紙、紙箱、餅乾紙盒、雜誌、書籍等。\n\n' +
                '回收時注意事項:\n' +
                '1. 紙盒包、鋁箔包: 飲料喝完後取出吸管，將其壓扁。\n' +
                '2. 紙餐具: 回收前去除殘渣，並以餐巾紙擦拭或略加清洗。\n' +
                '3. 一般廢紙: 去除塑膠包覆、膠帶、釘書針等後壓扁捆綁。報紙類及牛皮紙類請另外單獨分別綑綁。\n\n' +
                '不可回收的垃圾包括:\n' +
                '沾有油漆或油污的紙張、塑膠光面廢紙、複寫紙等特殊紙類請作為一般垃圾處理。\n\n' +
                '紙容器: 包括紙餐具、紙盒包等，飲料喝完後取出吸管，略加沖洗後壓扁再回收。';
            break;
        case '金屬':
            instructions = 
                '金屬回收指的是從廢舊金屬中分離出有用物質，經過物理或機械加工再生利用。\n\n' +
                '金屬類型:\n' +
                '1. 含鐵質的鐵金屬，如純鐵和鋼。\n' +
                '2. 不含鐵質的非鐵金屬，可分為貴金屬、基本金屬及合金。\n\n' +
                '回收流程:\n' +
                '固態廢料經過拆解、切碎、分選、焚化等流程，再分離出高純度金屬進行再利用。\n' +
                '液態廢料如電鍍液可經回收處理，減少環境汙染。';
            break;
        default:
            instructions = '請選擇一個垃圾類別以查看正確的回收處理方式。';
    }

    document.getElementById('instructions').innerText = instructions;
}

// 添加歷史紀錄
function addHistory(wasteType, confidence) {
    const timestamp = new Date().toLocaleString();
    history.unshift({ wasteType, confidence, timestamp }); // 在陣列開頭添加新紀錄
    updateHistoryDisplay();
}

// 更新歷史紀錄顯示
function updateHistoryDisplay() {
    const historyElement = document.getElementById('history');
    if (!historyElement) {
        console.error("Element with id 'history' not found!");
        return;
    }

    historyElement.innerHTML = ''; // 清除之前的紀錄

    // 遍歷歷史紀錄陣列並顯示每個項目
    history.forEach((entry, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `${index + 1}. ${entry.timestamp} - ${entry.wasteType} (${entry.confidence}%信賴度)`;
        historyElement.appendChild(historyItem);
    });
}

// 初始化模型和攝影機
init();

// 設置分類和暫停按鈕的事件監聽器
classifyButton.addEventListener('click', () => {
    resumeCamera(); // 確保畫面恢復流動
    startClassification();
});
pauseButton.addEventListener('click', pauseClassification);

// 監聽攝影機選擇變更事件
videoSelect.addEventListener('change', () => {
    startCamera(videoSelect.value);
});

// 監聽切換攝影機按鈕的點擊事件
switchCameraButton.addEventListener('click', () => {
    getCameraDevices()
        .then(videoDevices => {
            if (videoDevices.length <= 1) {
                console.warn('No additional cameras found to switch.');
                return;
            }
            const currentIndex = videoDevices.findIndex(device => device.deviceId === videoSelect.value);
            const nextIndex = (currentIndex + 1) % videoDevices.length;
            videoSelect.selectedIndex = nextIndex;
            startCamera(videoDevices[nextIndex].deviceId);
        })
        .catch(error => {
            console.error('Error switching camera.', error);
        });
});
