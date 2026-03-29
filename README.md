# Misty 2 Dashboard

A browser-based control dashboard for the [Misty II robot](https://www.mistyrobotics.com/misty-ii).
Connect to your robot over WiFi and control it instantly — no coding required.

---

## Requirements

- Python 3.8 or newer — [download here](https://www.python.org/downloads/)
- Misty II robot on the same WiFi network as your laptop

---

## Quick Start

### Windows
1. Download and unzip this repository
2. Double-click **`start.bat`**
3. Your browser will open automatically at `http://localhost:5000`

### macOS / Linux
1. Download and unzip this repository
2. Open a terminal in the folder and run:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```
3. Your browser will open automatically at `http://localhost:5000`

The script will install all Python dependencies automatically on first run.

---

## Connecting to Misty

1. Make sure your laptop and Misty are on the **same WiFi network**
2. Find Misty's IP address — shown in the Misty App or on the robot's chest display
3. Enter the IP in the dashboard and click **Connect**

---

## Features

| Panel | What it does |
|---|---|
| **Drive** | Move forward/back, turn left/right via buttons or WASD / arrow keys |
| **Head** | Control pitch, roll, and yaw with sliders |
| **Arms** | Raise/lower left and right arms independently |
| **Expressions** | Set Misty's facial display (joy, sad, angry, etc.) |
| **Chest LED** | Change the chest LED color via presets or custom color picker |
| **Text to Speech** | Make Misty speak any text |
| **Camera Feed** | Live view from Misty's front camera |
| **Event Log** | Real-time log of all commands and responses |

### Keyboard shortcuts
| Key | Action |
|---|---|
| `W` or `↑` | Drive forward |
| `S` or `↓` | Drive backward |
| `A` or `←` | Turn left |
| `D` or `→` | Turn right |
| `Space` | Emergency stop |

---

## Troubleshooting

**"Cannot reach robot"** — Check that your laptop and Misty are on the same WiFi network and the IP is correct.

**Python not found** — Install Python from https://www.python.org/downloads/ and make sure to check "Add Python to PATH" during installation (Windows).

**Port 5000 in use** — Edit `app.py` and change `port=5000` to another port (e.g. `5001`), then access `http://localhost:5001`.
