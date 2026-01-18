# Trip Estimation Calculator

A professional trip fare calculator with dynamic pricing based on duration, uniform requirements, trip type, and mode.

## Features

- Real-time fare calculation with day/night rates
- Professional Bootstrap dark theme interface
- Copy summary functionality with formatted output
- Password protection for sensitive pricing data
- Responsive design for all devices

## Deployment

### GitHub Pages Deployment

1. **Create a new repository** on GitHub
2. **Upload these files** to your repository:
   - `index.html`
   - `rates.js`
   - `README.md` (this file)

3. **Enable GitHub Pages**:
   - Go to repository Settings
   - Scroll to "Pages" section
   - Select "Deploy from a branch"
   - Choose "main" branch and "/ (root)" folder
   - Click Save

4. **Access your application**:
   - Your app will be available at: `https://yourusername.github.io/repository-name`

### Local Development

To run locally, simply open `index.html` in any modern web browser.

## Security

- Password protection is implemented for direct access to `rates.js`
- Authentication required: `Basam@2212`
- Main calculator works without authentication

## Usage

1. Enter trip start and end times
2. Select uniform requirement, trip type, and mode
3. Click "Calculate Fare" to see results
4. Use "Copy Summary" to copy formatted trip details

## Technical Details

- Pure HTML/CSS/JavaScript - no server required
- Bootstrap 5 for responsive design
- Font Awesome icons
- Client-side calculations with GST (18%)
- Minimum billing: 120 minutes
- Day hours: 7 AM to 9:59 PM