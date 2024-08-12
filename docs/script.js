async function init() {
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
    await setupWebcam(); // 設置默認相機
}

async function setupWebcam() {
    const videoSelect = document.getElementById('videoSource');
    const deviceId = videoSelect.value;

    if (window.stream) {
        window.stream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
        video: {
            deviceId: deviceId ? { exact: deviceId } : undefined
        }
    };

    try {
        window.stream = await navigator.mediaDevices.getUserMedia(constraints);
        const videoElement = document.getElementById('webcam');
        videoElement.srcObject = window.stream;
    } catch (error) {
        console.error("Error accessing media devices.", error);
        alert("無法訪問相機。請檢查許可權或嘗試使用不同的瀏覽器。");
    }
}

// 當頁面加載時初始化相機設置
init();
