# Trip Estimation Calculator

## Overview

This is a Flask-based web application that calculates trip fares based on various parameters including duration, uniform requirements, trip type (instation/outstation), and mode (one way/round trip). The application features a responsive web interface with dynamic fare calculations using complex pricing tiers.

## System Architecture

### Frontend Architecture
- **Framework**: HTML5 with Bootstrap for responsive design
- **Styling**: Bootstrap Agent Dark Theme + Font Awesome icons
- **JavaScript**: Vanilla JavaScript for fare calculations and form handling
- **UI Components**: Single-page application with form-based input and dynamic result display

### Backend Architecture
- **Framework**: Flask (Python web framework)
- **Server**: Gunicorn WSGI server for production deployment
- **Architecture Pattern**: Simple MVC pattern with template rendering
- **Session Management**: Flask sessions with configurable secret key

### Key Technologies
- Python 3.11
- Flask 3.1.1
- Gunicorn 23.0.0
- Bootstrap CSS framework
- Font Awesome icons

## Key Components

### Application Structure
```
├── app.py              # Main Flask application
├── main.py             # Entry point for production deployment
├── templates/
│   └── index.html      # Main calculator interface
├── static/
│   └── js/
│       └── rates.js    # Fare calculation logic and pricing data
└── pyproject.toml      # Python dependencies
```

### Core Components
1. **Flask Application** (`app.py`): Main web server with single route handler
2. **Rate Calculator** (`static/js/rates.js`): Complex pricing logic with tiered fare structure
3. **Web Interface** (`templates/index.html`): Responsive form with datetime inputs and dropdowns
4. **Production Entry Point** (`main.py`): Gunicorn-compatible application import

## Data Flow

1. **User Input**: Users fill out form with trip details (start/end time, uniform, trip type, mode)
2. **Client-Side Processing**: JavaScript calculates trip duration and determines applicable fare rate
3. **Rate Lookup**: System matches duration to appropriate pricing tier from complex fare chart
4. **Result Display**: Calculated fare is displayed dynamically without server round-trip

### Pricing Logic
- **Time-Based Tiers**: 15 different duration ranges (120 minutes to 1,000,000+ minutes)
- **Day/Night Rates**: Different pricing for day vs night hours
- **Trip Type Multipliers**: Separate rates for instation vs outstation trips
- **Mode Variations**: Different pricing for one-way vs round-trip journeys
- **Uniform Considerations**: Future support for uniform-based pricing adjustments

## External Dependencies

### Python Packages
- `flask>=3.1.1` - Web framework
- `gunicorn>=23.0.0` - Production WSGI server
- `flask-sqlalchemy>=3.1.1` - Database ORM (prepared for future use)
- `psycopg2-binary>=2.9.10` - PostgreSQL adapter (prepared for future use)
- `email-validator>=2.2.0` - Email validation utilities (prepared for future use)

### Frontend Dependencies (CDN)
- Bootstrap Agent Dark Theme
- Font Awesome 6.0.0 icons

### System Dependencies
- OpenSSL
- PostgreSQL (prepared for future database integration)

## Deployment Strategy

### Development Environment
- Flask development server with debug mode
- Hot reloading enabled
- Local file serving for static assets

### Production Environment
- **Server**: Gunicorn with autoscale deployment target
- **Binding**: All interfaces (0.0.0.0) on port 5000
- **Process Management**: Reuse-port and reload options enabled
- **Platform**: Replit with Nix package management

### Environment Configuration
- Session secret key configurable via environment variables
- Debug mode automatically disabled in production
- Logging configured for development debugging

## Changelog
- June 24, 2025: Initial setup with Flask application and pricing structure
- June 24, 2025: Updated pricing rates based on user requirements  
- June 24, 2025: Added copy summary functionality with formatted output
- June 24, 2025: Moved all files to root directory - removed folders structure
- June 24, 2025: Implemented selective password protection for rates.js file only
- June 24, 2025: Converted to static files suitable for GitHub Pages deployment
- June 24, 2025: Implemented encrypted pricing data with XOR cipher and base64 encoding
- June 24, 2025: Enhanced password protection specifically for rates.js file access
- June 24, 2025: Implemented robust encryption for rates.js with Base64 encoding and eval-based decryption

## User Preferences

Preferred communication style: Simple, everyday language.