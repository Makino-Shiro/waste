document.addEventListener('DOMContentLoaded', () => {
    const captureButton = document.getElementById('capture-btn');
    if (captureButton) {
        captureButton.addEventListener('click', () => {
            alert('Capture button clicked!');
        });
    } else {
        console.error("Capture button not found in the DOM.");
    }
});
