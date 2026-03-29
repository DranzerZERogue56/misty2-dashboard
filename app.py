import threading
import time
import webbrowser

import requests
from flask import Flask, Response, jsonify, render_template, request

app = Flask(__name__)

robot = {"ip": None, "connected": False}


def url(endpoint):
    return f"http://{robot['ip']}/api/{endpoint}"


def misty_get(endpoint, timeout=5):
    return requests.get(url(endpoint), timeout=timeout)


def misty_post(endpoint, payload, timeout=5):
    return requests.post(url(endpoint), json=payload, timeout=timeout)


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/connect", methods=["POST"])
def connect():
    ip = (request.json or {}).get("ip", "").strip()
    if not ip:
        return jsonify(success=False, error="No IP address provided.")
    try:
        resp = requests.get(f"http://{ip}/api/device", timeout=5)
        if resp.ok:
            robot["ip"] = ip
            robot["connected"] = True
            return jsonify(success=True, data=resp.json().get("result", {}))
        return jsonify(success=False, error=f"Robot returned HTTP {resp.status_code}")
    except requests.exceptions.ConnectionError:
        return jsonify(success=False, error="Cannot reach robot. Check IP and WiFi.")
    except requests.exceptions.Timeout:
        return jsonify(success=False, error="Connection timed out.")


@app.route("/api/disconnect", methods=["POST"])
def disconnect():
    robot["ip"] = None
    robot["connected"] = False
    return jsonify(success=True)


@app.route("/api/battery")
def battery():
    if not robot["connected"]:
        return jsonify(success=False, error="Not connected.")
    try:
        resp = misty_get("battery")
        return jsonify(success=resp.ok, data=resp.json().get("result", {}))
    except Exception as e:
        return jsonify(success=False, error=str(e))


@app.route("/api/info")
def info():
    if not robot["connected"]:
        return jsonify(success=False, error="Not connected.")
    try:
        resp = misty_get("device")
        return jsonify(success=resp.ok, data=resp.json().get("result", {}))
    except Exception as e:
        return jsonify(success=False, error=str(e))


@app.route("/api/drive", methods=["POST"])
def drive():
    if not robot["connected"]:
        return jsonify(success=False, error="Not connected.")
    data = request.json or {}
    try:
        resp = misty_post("drive", {
            "LinearVelocity": data.get("linear", 0),
            "AngularVelocity": data.get("angular", 0),
        })
        return jsonify(success=resp.ok)
    except Exception as e:
        return jsonify(success=False, error=str(e))


@app.route("/api/stop", methods=["POST"])
def stop():
    if not robot["connected"]:
        return jsonify(success=False, error="Not connected.")
    try:
        resp = misty_post("drive/stop", {})
        return jsonify(success=resp.ok)
    except Exception as e:
        return jsonify(success=False, error=str(e))


@app.route("/api/head", methods=["POST"])
def head():
    if not robot["connected"]:
        return jsonify(success=False, error="Not connected.")
    data = request.json or {}
    try:
        resp = misty_post("head", {
            "Pitch": data.get("pitch", 0),
            "Roll": data.get("roll", 0),
            "Yaw": data.get("yaw", 0),
            "Velocity": data.get("velocity", 50),
        })
        return jsonify(success=resp.ok)
    except Exception as e:
        return jsonify(success=False, error=str(e))


@app.route("/api/arms", methods=["POST"])
def arms():
    if not robot["connected"]:
        return jsonify(success=False, error="Not connected.")
    data = request.json or {}
    try:
        resp = misty_post("arms", {
            "LeftArmPosition": data.get("left", 90),
            "RightArmPosition": data.get("right", 90),
            "LeftArmVelocity": 50,
            "RightArmVelocity": 50,
        })
        return jsonify(success=resp.ok)
    except Exception as e:
        return jsonify(success=False, error=str(e))


@app.route("/api/led", methods=["POST"])
def led():
    if not robot["connected"]:
        return jsonify(success=False, error="Not connected.")
    data = request.json or {}
    try:
        resp = misty_post("led", {
            "Red": data.get("r", 0),
            "Green": data.get("g", 0),
            "Blue": data.get("b", 0),
        })
        return jsonify(success=resp.ok)
    except Exception as e:
        return jsonify(success=False, error=str(e))


@app.route("/api/speak", methods=["POST"])
def speak():
    if not robot["connected"]:
        return jsonify(success=False, error="Not connected.")
    data = request.json or {}
    text = data.get("text", "").strip()
    if not text:
        return jsonify(success=False, error="No text provided.")
    try:
        resp = misty_post("tts/speak", {"Text": text, "Flush": True})
        return jsonify(success=resp.ok)
    except Exception as e:
        return jsonify(success=False, error=str(e))


@app.route("/api/expression", methods=["POST"])
def expression():
    if not robot["connected"]:
        return jsonify(success=False, error="Not connected.")
    data = request.json or {}
    try:
        resp = misty_post("images/display", {
            "FileName": data.get("file", "e_DefaultContent.jpg"),
            "TimeoutInSeconds": data.get("timeout", 5),
        })
        return jsonify(success=resp.ok)
    except Exception as e:
        return jsonify(success=False, error=str(e))


@app.route("/api/audio/play", methods=["POST"])
def audio_play():
    if not robot["connected"]:
        return jsonify(success=False, error="Not connected.")
    data = request.json or {}
    try:
        resp = misty_post("audio/play", {
            "FileName": data.get("file", "s_Awe.wav"),
            "Volume": data.get("volume", 80),
        })
        return jsonify(success=resp.ok)
    except Exception as e:
        return jsonify(success=False, error=str(e))


@app.route("/api/camera/frame")
def camera_frame():
    """Return one JPEG frame from the robot's RGB camera."""
    if not robot["connected"]:
        return jsonify(success=False, error="Not connected."), 400
    try:
        resp = requests.get(
            f"http://{robot['ip']}/api/cameras/rgb",
            params={"Base64": "false"},
            timeout=3,
            stream=True,
        )
        return Response(resp.content, mimetype="image/jpeg")
    except Exception as e:
        return jsonify(success=False, error=str(e)), 500


# ── Startup ───────────────────────────────────────────────────────────────────

def open_browser():
    time.sleep(1.5)
    webbrowser.open("http://localhost:5000")


if __name__ == "__main__":
    print("\n  Misty 2 Dashboard")
    print("  Running at http://localhost:5000")
    print("  Press Ctrl+C to stop\n")
    threading.Thread(target=open_browser, daemon=True).start()
    app.run(host="0.0.0.0", port=5000, debug=False)
