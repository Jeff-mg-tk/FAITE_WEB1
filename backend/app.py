import os
import json
import random
from datetime import datetime, timezone, timedelta
from flask import Flask, send_from_directory, jsonify, request

backend_dir = os.path.dirname(os.path.abspath(__file__))
frontend_dir = os.path.abspath(os.path.join(backend_dir, "..", "frontend"))

app = Flask(__name__, static_folder=frontend_dir, static_url_path="")

# Add CORS headers manually to support local testing (e.g., opening frontend files directly via file://)
@app.after_request
def after_request(response):
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    return response

@app.route("/")
def index():
    """Serves the main frontend page."""
    return send_from_directory(frontend_dir, "index.html")

@app.route("/api/menu")
def get_menu():
    """Returns the menu products and customizations."""
    menu_path = os.path.join(backend_dir, "data", "menu.json")
    try:
        with open(menu_path, "r", encoding="utf-8") as f:
            menu_data = json.load(f)
        return jsonify(menu_data)
    except FileNotFoundError:
        return jsonify({"error": "Menu file not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/promos")
def get_promos():
    """Returns the active promotions."""
    promos_path = os.path.join(backend_dir, "data", "promos.json")
    try:
        with open(promos_path, "r", encoding="utf-8") as f:
            promos_data = json.load(f)
        return jsonify(promos_data)
    except FileNotFoundError:
        return jsonify({"promos": []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/store-status")
def store_status():
    """Calculates if the store is currently open (3:00 PM to 11:00 PM in Peru GMT-5)."""
    try:
        # Peru timezone is always UTC-5 (no daylight saving time)
        peru_tz = timezone(timedelta(hours=-5))
        peru_now = datetime.now(peru_tz)
        current_hour = peru_now.hour
        
        # Open hours: 15:00 (3 PM) to 23:00 (11 PM)
        is_open = 15 <= current_hour < 23
        
        return jsonify({
            "open": is_open,
            "current_time": peru_now.strftime("%H:%M:%S"),
            "timezone": "America/Lima",
            "hours": "3:00 PM - 11:00 PM"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/complaints", methods=["POST"])
def create_complaint():
    """Processes a new complaint, assigns a reference code, and saves it on the server."""
    try:
        data = request.get_json() or {}
        
        # Basic validation
        required_fields = ["name", "dni", "phone", "email", "type", "details"]
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"Field '{field}' is required"}), 400
        
        # Generate random Peruvian complaint code (e.g. FAITE-R-123456)
        complaint_code = f"FAITE-R-{random.randint(100000, 999999)}"
        peru_tz = timezone(timedelta(hours=-5))
        timestamp = datetime.now(peru_tz).isoformat()
        
        complaint_record = {
            "code": complaint_code,
            "timestamp": timestamp,
            "client_data": {
                "name": data["name"],
                "dni": data["dni"],
                "phone": data["phone"],
                "email": data["email"]
            },
            "complaint": {
                "type": data["type"],
                "details": data["details"]
            }
        }
        
        # Save to backend/data/complaints/
        complaints_dir = os.path.join(backend_dir, "data", "complaints")
        os.makedirs(complaints_dir, exist_ok=True)
        
        file_path = os.path.join(complaints_dir, f"reclamo_{complaint_code}.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(complaint_record, f, indent=4, ensure_ascii=False)
            
        return jsonify({
            "success": True,
            "code": complaint_code,
            "timestamp": timestamp
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
