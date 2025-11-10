// Configuration - Use environment variable or fallback to localhost
const API_BASE_URL = window.ENV?.API_URL || 'http://localhost:8000';

// DOM Elements
const form = document.getElementById('predictionForm');
const submitBtn = document.getElementById('submitBtn');
const resultCard = document.getElementById('resultCard');
const apiStatusBadge = document.getElementById('apiStatus');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('targetDate').valueAsDate = tomorrow;
    
    // Update footer links
    updateFooterLinks();
    
    // Check API status
    checkAPIStatus();
    setInterval(checkAPIStatus, 30000); // Check every 30 seconds
});

// Update footer links with API URL
function updateFooterLinks() {
    document.getElementById('apiDocsLink').href = `${API_BASE_URL}/docs`;
    document.getElementById('healthLink').href = `${API_BASE_URL}/health`;
}

// Check API health status
async function checkAPIStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            mode: 'cors'
        });
        
        if (response.ok) {
            const data = await response.json();
            updateStatusBadge('online', 'API Online');
        } else {
            updateStatusBadge('offline', 'API Offline');
        }
    } catch (error) {
        updateStatusBadge('offline', 'API Unreachable');
        console.error('Health check failed:', error);
    }
}

// Update status badge
function updateStatusBadge(status, text) {
    apiStatusBadge.className = `status-badge ${status}`;
    apiStatusBadge.querySelector('.status-text').textContent = text;
}

// Load preset scenarios
function loadPreset(type) {
    const presets = {
        sunny: {
            pressure: 1020.0,
            humidity: 45.0,
            wind: 8.0,
            precipitation: 0.0
        },
        storm: {
            pressure: 990.0,
            humidity: 85.0,
            wind: 45.0,
            precipitation: 25.0
        },
        average: {
            pressure: 1013.25,
            humidity: 60.0,
            wind: 15.0,
            precipitation: 2.5
        }
    };
    
    const preset = presets[type];
    if (preset) {
        document.getElementById('pressure').value = preset.pressure;
        document.getElementById('humidity').value = preset.humidity;
        document.getElementById('wind').value = preset.wind;
        document.getElementById('precipitation').value = preset.precipitation;
        
        // Visual feedback
        const buttons = document.querySelectorAll('.preset-btn');
        buttons.forEach(btn => btn.style.background = 'white');
        event.target.style.background = 'var(--primary)';
        event.target.style.color = 'white';
        
        setTimeout(() => {
            event.target.style.background = 'white';
            event.target.style.color = 'var(--primary)';
        }, 1000);
    }
}

// Handle form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handlePrediction();
});

// Main prediction function
async function handlePrediction() {
    // Get form data
    const formData = {
        target_date: document.getElementById('targetDate').value,
        pressure_millibars: parseFloat(document.getElementById('pressure').value),
        humidity: parseFloat(document.getElementById('humidity').value),
        wind_speed_kmh: parseFloat(document.getElementById('wind').value),
        precip_mm: parseFloat(document.getElementById('precipitation').value)
    };
    
    // Show loading state
    setLoadingState(true);
    hideResults();
    
    try {
        const response = await fetch(`${API_BASE_URL}/predict_temperature/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            mode: 'cors',
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Server error: ${response.status}`);
        }
        
        const result = await response.json();
        displayResults(result, formData.target_date);
        
    } catch (error) {
        showError(error.message);
        console.error('Prediction error:', error);
    } finally {
        setLoadingState(false);
    }
}

// Set loading state
function setLoadingState(isLoading) {
    submitBtn.disabled = isLoading;
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    
    if (isLoading) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'flex';
    } else {
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
    }
}

// Display results
function displayResults(data, targetDate) {
    // Show result card
    resultCard.style.display = 'block';
    
    // Format date
    const date = new Date(targetDate);
    const dateStr = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Update temperature
    document.getElementById('tempValue').textContent = data.predicted_temperature.toFixed(2);
    document.getElementById('resultDate').textContent = `for ${dateStr}`;
    
    // Update confidence interval
    const confLow = data.confidence_interval.lower;
    const confHigh = data.confidence_interval.upper;
    const prediction = data.predicted_temperature;
    
    document.getElementById('confidenceLow').textContent = `${confLow.toFixed(2)}°C`;
    document.getElementById('confidenceHigh').textContent = `${confHigh.toFixed(2)}°C`;
    
    // Update progress bar
    const range = confHigh - confLow;
    const position = ((prediction - confLow) / range) * 100;
    
    document.getElementById('rangeFill').style.width = `${position}%`;
    document.getElementById('rangeMarker').style.left = `${position}%`;
    
    // Update model info
    document.getElementById('modelUsed').textContent = data.model_used;
    document.getElementById('modelVersion').textContent = data.model_metadata?.version || '1.0.0';
    
    // Smooth scroll to results
    setTimeout(() => {
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

// Hide results
function hideResults() {
    resultCard.style.display = 'none';
}

// Show error message
function showError(message) {
    // Create error alert
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-alert';
    errorDiv.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #fee2e2, #fecaca);
            border: 2px solid #ef4444;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            color: #991b1b;
            font-weight: 600;
            animation: slideIn 0.3s ease;
        ">
            ⚠️ Error: ${message}
            <button onclick="this.parentElement.remove()" style="
                float: right;
                background: none;
                border: none;
                color: #991b1b;
                font-size: 1.2rem;
                cursor: pointer;
                padding: 0 5px;
            ">×</button>
        </div>
    `;
    
    // Insert before form
    form.parentElement.insertBefore(errorDiv, form);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Add slide-in animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);
