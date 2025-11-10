"""
Global Weather Forecast API
Production-ready API for predicting next-day global average temperature
using an Ensemble Stacking Regressor (XGBoost + RidgeCV).
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from pydantic import BaseModel, Field
import os
from pathlib import Path

# Initialize FastAPI application
app = FastAPI(
    title="Global Weather Forecast API",
    description="Predicts next-day Global Average Temperature using an Ensemble Stacking Regressor trained on global weather data.",
    version="1.0.0",
    contact={
        "name": "Weather Analytics Team",
        "email": "analytics@globalweather.com",
    },
)

# Add CORS middleware to allow frontend requests
# Update with your Vercel domain after deployment
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Set ALLOWED_ORIGINS env var in Render
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure paths (relative to project root)
BASE_DIR = Path(__file__).parent.parent
MODEL_PATH = BASE_DIR / 'models' / 'ensemble_forecaster.pkl'
HISTORICAL_PATH = BASE_DIR / 'data' / 'historical_temps.csv'
METADATA_PATH = BASE_DIR / 'models' / 'feature_metadata.pkl'
STATIC_DIR = BASE_DIR / 'static'

# Mount static files
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Global variables for loaded artifacts
ENSEMBLE_MODEL = None
HISTORICAL_TEMPS = None
FEATURE_METADATA = None


@app.on_event("startup")
async def load_artifacts():
    """Load model artifacts on API startup."""
    global ENSEMBLE_MODEL, HISTORICAL_TEMPS, FEATURE_METADATA
    
    try:
        # Load the trained ensemble model
        if MODEL_PATH.exists():
            ENSEMBLE_MODEL = joblib.load(MODEL_PATH)
            print(f"✓ Model loaded from {MODEL_PATH}")
        else:
            print(f"⚠ Warning: Model file not found at {MODEL_PATH}")
            
        # Load historical temperature data
        if HISTORICAL_PATH.exists():
            HISTORICAL_TEMPS = pd.read_csv(
                HISTORICAL_PATH, 
                index_col=0, 
                parse_dates=True
            )['temp_c_mean']
            print(f"✓ Historical data loaded from {HISTORICAL_PATH}")
        else:
            print(f"⚠ Warning: Historical data not found at {HISTORICAL_PATH}")
            # Fallback: Use sample data (global average ~15°C)
            HISTORICAL_TEMPS = pd.Series([15.0] * 7)
            
        # Load feature metadata
        if METADATA_PATH.exists():
            FEATURE_METADATA = joblib.load(METADATA_PATH)
            print(f"✓ Metadata loaded from {METADATA_PATH}")
        else:
            print(f"⚠ Warning: Metadata not found at {METADATA_PATH}")
            
        print("=" * 50)
        print("API startup complete. Ready to serve predictions.")
        print("=" * 50)
        
    except Exception as e:
        print(f"❌ Error loading model artifacts: {e}")
        print("API will run in degraded mode.")


# Pydantic schema for input data validation
class WeatherInput(BaseModel):
    """Input schema for weather forecast prediction."""
    
    target_date: str = Field(
        default_factory=lambda: datetime.now().strftime("%Y-%m-%d"),
        description="Target date for prediction in YYYY-MM-DD format",
        example="2024-12-25"
    )
    pressure_mean: float = Field(
        default=1014.0,
        description="Forecasted mean atmospheric pressure in millibars (mb)",
        ge=900.0,
        le=1100.0,
        example=1013.25
    )
    humidity_mean: float = Field(
        default=60.0,
        description="Forecasted mean relative humidity percentage",
        ge=0.0,
        le=100.0,
        example=65.5
    )
    wind_mean: float = Field(
        default=10.0,
        description="Forecasted mean wind speed in kilometers per hour (kph)",
        ge=0.0,
        le=200.0,
        example=12.3
    )
    precip_mean: float = Field(
        default=0.5,
        description="Forecasted mean precipitation in millimeters (mm)",
        ge=0.0,
        le=500.0,
        example=2.5
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "target_date": "2024-12-25",
                "pressure_mean": 1015.2,
                "humidity_mean": 68.0,
                "wind_mean": 15.5,
                "precip_mean": 1.2
            }
        }


class PredictionResponse(BaseModel):
    """Response schema for temperature prediction."""
    
    date: str = Field(description="Target date for prediction")
    predicted_global_temperature_celsius: float = Field(description="Predicted global average temperature")
    model_used: str = Field(description="Model type used for prediction")
    confidence_interval: dict = Field(description="Estimated prediction uncertainty")
    model_version: str = Field(description="Model version")
    

# Serve the web UI
@app.get("/", response_class=FileResponse, tags=["UI"])
async def serve_ui():
    """Serve the main web interface."""
    ui_path = BASE_DIR / 'static' / 'index.html'
    if ui_path.exists():
        return FileResponse(ui_path)
    else:
        return {
            "status": "online",
            "message": "Global Weather Forecast API is running",
            "model_loaded": ENSEMBLE_MODEL is not None,
            "endpoints": {
                "docs": "/docs",
                "predict": "/predict_temperature/",
                "health": "/health"
            }
        }


# Health check endpoint
@app.get("/health", tags=["Health"])
def health_check():
    """Detailed health check with model status."""
    return {
        "status": "healthy" if ENSEMBLE_MODEL is not None else "degraded",
        "model_loaded": ENSEMBLE_MODEL is not None,
        "historical_data_loaded": HISTORICAL_TEMPS is not None,
        "metadata_loaded": FEATURE_METADATA is not None,
        "model_version": FEATURE_METADATA.get('model_version', 'unknown') if FEATURE_METADATA else 'unknown',
        "training_date": FEATURE_METADATA.get('training_date', 'unknown') if FEATURE_METADATA else 'unknown'
    }


# Prediction endpoint
@app.post("/predict_temperature/", response_model=PredictionResponse, tags=["Prediction"])
def predict_temperature(input_data: WeatherInput):
    """
    Predict global average temperature for a target date.
    
    This endpoint uses an Ensemble Stacking Regressor that combines:
    - XGBoost Regressor (gradient boosting)
    - RidgeCV (regularized linear regression)
    
    The model uses temporal features, lagged temperatures, and meteorological variables
    to forecast the next day's global average temperature.
    """
    
    # Check if model is loaded
    if ENSEMBLE_MODEL is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please ensure model artifacts are available."
        )
    
    # Validate and parse target date
    try:
        date_to_predict = pd.to_datetime(input_data.target_date)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM-DD format."
        )
    
    try:
        # Generate feature vector based on saved history and provided future mean values
        temp_lag1 = HISTORICAL_TEMPS.iloc[-1]      # 1 day ago
        temp_lag7 = HISTORICAL_TEMPS.iloc[-7]      # 7 days ago
        temp_rolling_7 = HISTORICAL_TEMPS.mean()   # 7-day rolling average
        
        # Create the input DataFrame with exact feature names
        features = pd.DataFrame([{
            'dayofyear': date_to_predict.dayofyear,
            'month': date_to_predict.month,
            'day': date_to_predict.day,
            'temp_lag1': temp_lag1,
            'temp_lag7': temp_lag7,
            'temp_rolling_7': temp_rolling_7,
            'pressure_mean': input_data.pressure_mean,
            'humidity_mean': input_data.humidity_mean,
            'wind_mean': input_data.wind_mean,
            'precip_mean': input_data.precip_mean
        }])
        
        # Make prediction
        prediction = ENSEMBLE_MODEL.predict(features)[0]
        
        # Convert numpy types to Python native types for JSON serialization
        prediction_value = float(prediction)
        
        # Estimate confidence interval (±2°C based on typical RMSE)
        # In production, this would be calculated from model validation metrics
        confidence_margin = 2.0
        
        return PredictionResponse(
            date=input_data.target_date,
            predicted_global_temperature_celsius=round(prediction_value, 2),
            model_used="Ensemble Stacking Regressor (XGBoost + RidgeCV)",
            confidence_interval={
                "lower_bound": round(prediction_value - confidence_margin, 2),
                "upper_bound": round(prediction_value + confidence_margin, 2),
                "confidence_level": "~95%"
            },
            model_version=FEATURE_METADATA.get('model_version', '1.0') if FEATURE_METADATA else '1.0'
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction error: {str(e)}"
        )


@app.get("/model_info", tags=["Information"])
def get_model_info():
    """Get information about the trained model."""
    
    if FEATURE_METADATA is None:
        return {"error": "Model metadata not available"}
    
    return {
        "model_type": "Ensemble Stacking Regressor",
        "base_models": ["XGBoost", "RidgeCV"],
        "final_estimator": "XGBoost",
        "features": FEATURE_METADATA.get('feature_columns', []),
        "feature_count": len(FEATURE_METADATA.get('feature_columns', [])),
        "training_samples": FEATURE_METADATA.get('training_samples', 'unknown'),
        "test_samples": FEATURE_METADATA.get('test_samples', 'unknown'),
        "model_version": FEATURE_METADATA.get('model_version', 'unknown'),
        "training_date": FEATURE_METADATA.get('training_date', 'unknown')
    }


# Run the API
# Command: uvicorn src.app:app --reload
# Or: python -m uvicorn src.app:app --reload --host 0.0.0.0 --port 8000

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
