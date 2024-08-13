const videoElement = document.getElementById('webcam');
const videoSelect = document.getElementById('videoSource');
const switchCameraButton = document.getElementById('switch-camera');

let currentStream;

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
            width: { ideal: 1280 },
            height: { ideal: 720 }
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

// 初始化攝影機
function initCamera() {
    getCameraDevices()
        .then(videoDevices => {
            if (videoDevices.length === 0) {
                console.error('No video devices found.');
                return;
            }
            startCamera(videoDevices[0].deviceId);
        })
        .catch(error => {
            console.error('Error during initialization.', error);
        });
}

// 監聽下拉選單的變化以切換攝影機
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

// 當頁面加載完成後初始化攝影機
document.addEventListener('DOMContentLoaded', initCamera);
