# Weather Forecast Frontend

A beautiful, responsive web interface for the Global Weather Forecast API.

## 🚀 Quick Start

### Local Development

1. Open `index.html` in a web browser
2. The app will automatically connect to `http://localhost:8000` (local backend)

### Production Deployment on Vercel

1. **Install Vercel CLI** (optional):
   ```bash
   npm install -g vercel
   ```

2. **Deploy via Vercel Dashboard** (Recommended):
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Set root directory to `frontend`
   - Click "Deploy"

3. **Deploy via CLI**:
   ```bash
   cd frontend
   vercel
   ```

4. **Update API URL**:
   - After deploying backend to Render, update `env.js`:
   ```javascript
   window.ENV = {
       API_URL: 'https://your-app.onrender.com'
   };
   ```
   - Commit and redeploy

## 📦 Files Structure

```
frontend/
├── index.html          # Main HTML file
├── style.css           # Styles and responsive design
├── script.js           # API integration and logic
├── env.js              # Environment configuration
├── vercel.json         # Vercel deployment config
├── .vercelignore       # Files to ignore during deployment
└── README.md           # This file
```

## 🔧 Configuration

### Environment Variables

Edit `env.js` to set your backend API URL:

```javascript
window.ENV = {
    API_URL: 'https://your-backend-url.onrender.com'
};
```

### CORS Setup

Make sure your backend allows requests from your Vercel domain:

```bash
# On Render, set environment variable:
ALLOWED_ORIGINS=https://your-app.vercel.app
```

## ✨ Features

- **Real-time Predictions**: Instant weather forecasts
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Preset Scenarios**: Quick access to common weather patterns
- **Confidence Intervals**: Visual representation of prediction accuracy
- **Health Monitoring**: Live API status indicator
- **Beautiful UI**: Modern gradient design with smooth animations

## 🎨 Customization

### Colors

Edit CSS variables in `style.css`:

```css
:root {
    --primary: #667eea;
    --secondary: #764ba2;
    --accent: #f093fb;
}
```

### API Timeout

Modify `script.js` for custom timeout settings:

```javascript
// Currently: 30 second health check interval
setInterval(checkAPIStatus, 30000);
```

## 📱 Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers

## 🐛 Troubleshooting

### API Connection Issues

1. Check backend is running: Visit `/health` endpoint
2. Verify CORS settings on backend
3. Check `env.js` has correct API URL
4. Open browser console for detailed errors

### Deployment Issues

1. Ensure all files are committed to Git
2. Check Vercel build logs for errors
3. Verify `vercel.json` configuration
4. Test locally before deploying

## 📄 License

Part of the PM Accelerator Program project.
