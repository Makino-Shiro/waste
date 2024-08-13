const videoElement = document.getElementById('webcam');
const videoSelect = document.getElementById('videoSource');
const switchCameraButton = document.getElementById('switch-camera');

let currentStream;

function stopMediaTracks(stream) {
    if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
        });
    }
}

function getCameraDevices() {
    return navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            return videoDevices;
        });
}

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

videoSelect.addEventListener('change', () => {
    startCamera(videoSelect.value);
});

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

document.addEventListener('DOMContentLoaded', initCamera);
