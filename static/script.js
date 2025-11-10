// API Configuration
const API_BASE_URL = 'http://localhost:8000';

// Preset weather scenarios
const presets = {
    sunny: {
        pressure: 1025.0,
        humidity: 45.0,
        wind: 8.0,
        precipitation: 0.0
    },
    storm: {
        pressure: 995.0,
        humidity: 85.0,
        wind: 35.0,
        precipitation: 15.0
    },
    average: {
        pressure: 1013.25,
        humidity: 60.0,
        wind: 12.0,
        precipitation: 2.0
    }
};

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('targetDate').valueAsDate = tomorrow;
    
    // Check API status
    checkAPIStatus();
    
    // Add form submit handler
    document.getElementById('predictionForm').addEventListener('submit', handlePrediction);
});

// Check API health status
async function checkAPIStatus() {
    const statusBadge = document.getElementById('apiStatus');
    const statusDot = statusBadge.querySelector('.status-dot');
    const statusText = statusBadge.querySelector('.status-text');
    
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        
        if (data.status === 'healthy' || data.model_loaded) {
            statusBadge.classList.add('online');
            statusText.textContent = 'API Online';
        } else {
            statusBadge.classList.remove('online');
            statusBadge.classList.add('offline');
            statusText.textContent = 'API Degraded';
        }
    } catch (error) {
        statusBadge.classList.remove('online');
        statusBadge.classList.add('offline');
        statusText.textContent = 'API Offline';
        console.error('API Health Check Failed:', error);
    }
}

// Load preset values
function loadPreset(presetName) {
    const preset = presets[presetName];
    if (!preset) return;
    
    document.getElementById('pressure').value = preset.pressure;
    document.getElementById('humidity').value = preset.humidity;
    document.getElementById('wind').value = preset.wind;
    document.getElementById('precipitation').value = preset.precipitation;
    
    // Visual feedback
    const buttons = document.querySelectorAll('.preset-btn');
    buttons.forEach(btn => btn.style.background = '');
    event.target.style.background = 'var(--primary-color)';
    event.target.style.color = 'white';
    
    setTimeout(() => {
        event.target.style.background = '';
        event.target.style.color = '';
    }, 1000);
}

// Handle prediction form submission
async function handlePrediction(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    const resultCard = document.getElementById('resultCard');
    
    // Show loading state
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-flex';
    resultCard.style.display = 'none';
    
    // Gather form data
    const formData = {
        target_date: document.getElementById('targetDate').value,
        pressure_mean: parseFloat(document.getElementById('pressure').value),
        humidity_mean: parseFloat(document.getElementById('humidity').value),
        wind_mean: parseFloat(document.getElementById('wind').value),
        precip_mean: parseFloat(document.getElementById('precipitation').value)
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/predict_temperature/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Prediction failed');
        }
        
        const result = await response.json();
        displayResults(result);
        
    } catch (error) {
        console.error('Prediction Error:', error);
        alert(`Error: ${error.message}\n\nPlease ensure the API server is running:\npython start_api.py`);
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

// Display prediction results
function displayResults(result) {
    const resultCard = document.getElementById('resultCard');
    
    // Update temperature
    document.getElementById('tempValue').textContent = result.predicted_global_temperature_celsius.toFixed(1);
    
    // Update date
    const targetDate = new Date(result.date);
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('resultDate').textContent = `for ${targetDate.toLocaleDateString('en-US', dateOptions)}`;
    
    // Update confidence interval
    const confidence = result.confidence_interval;
    document.getElementById('confidenceLow').textContent = `${confidence.lower_bound}°C`;
    document.getElementById('confidenceHigh').textContent = `${confidence.upper_bound}°C`;
    
    // Update confidence bar marker position
    const predictedTemp = result.predicted_global_temperature_celsius;
    const lowBound = confidence.lower_bound;
    const highBound = confidence.upper_bound;
    const range = highBound - lowBound;
    const position = ((predictedTemp - lowBound) / range) * 100;
    
    const marker = document.getElementById('rangeMarker');
    marker.style.left = `calc(${position}% - 2px)`;
    
    // Update model info
    document.getElementById('modelUsed').textContent = result.model_used;
    document.getElementById('modelVersion').textContent = result.model_version;
    
    // Show results with animation
    resultCard.style.display = 'block';
    
    // Scroll to results
    setTimeout(() => {
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

// Auto-refresh API status every 30 seconds
setInterval(checkAPIStatus, 30000);

// Add input validation and formatting
document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('input', function() {
        // Remove invalid characters
        this.value = this.value.replace(/[^0-9.-]/g, '');
    });
    
    input.addEventListener('blur', function() {
        // Format to one decimal place
        const value = parseFloat(this.value);
        if (!isNaN(value)) {
            this.value = value.toFixed(1);
        }
    });
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + Enter to submit
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        document.getElementById('predictionForm').dispatchEvent(new Event('submit'));
    }
});

// Add visual feedback for form interactions
document.querySelectorAll('.form-group input').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'translateY(-2px)';
        this.parentElement.style.transition = 'transform 0.3s ease';
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'translateY(0)';
    });
});
