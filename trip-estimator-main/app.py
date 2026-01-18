import os
import logging
from flask import Flask, send_file

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")

@app.route('/')
def index():
    """Main page with trip estimation calculator"""
    return send_file('index.html')

@app.route('/rates.js')
def rates_js():
    """Serve rates.js file"""
    return send_file('rates.js', mimetype='application/javascript')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
