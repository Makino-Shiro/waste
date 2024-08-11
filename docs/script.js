<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Waste Classifier</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>Waste Classification</h1>
        <label for="videoSource">Choose a camera:</label>
        <select id="videoSource"></select>

        <div class="content">
            <div class="left-panel">
                <div id="webcam"></div>
                <div class="buttons">
                    <button id="classify-btn">Classify Waste</button>
                    <button id="restore-btn" disabled>Restore Webcam</button>
                </div>
                <div id="result"></div>
                <div id="history-container">
                    <h2>History</h2>
                    <div id="history"></div>
                </div>
            </div>
            
            <div class="right-panel">
                <div id="info">
                    <h2 id="waste-type">Waste Type: None</h2>
                    <h3>處理方式：</h3>
                    <p id="instructions">Select an item to see instructions.</p>
                </div>
            </div>
        </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs"></script>
    <script src="https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8.4/dist/teachablemachine-image.min.js"></script>
    <script src="script.js"></script>
</body>
</html>
