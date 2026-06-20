from flask import Flask, send_from_directory, jsonify, request
import subprocess, json, os, socket, signal, time, threading
from bluetooth_manager import (
    BluetoothManager, BluetoothError,
    DeviceNotFoundError, ConnectionTimeoutError, AdapterNotReadyError
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, '..', 'frontend')
STREAMINGS_FILE = os.path.join(BASE_DIR, 'streamings.json')
CONFIG_FILE = os.path.join(BASE_DIR, 'config.json')
TIMER_PID_FILE = '/tmp/smarttv-timer.pid'
REMOTE_PID_FILE = '/tmp/smarttv-remote.pid'
CHROMIUM_FLAGS = [
    '--app=http://localhost:5000',
    '--kiosk',
    '--no-first-run',
    '--noerrdialogs',
    '--disable-infobars',
    '--disable-session-crashed-bubble',
    '--autoplay-policy=no-user-gesture-required',
    '--enable-spatial-navigation',
    '--lang=pt-BR',
    '--disable-features=Translate,TranslateUI,AutomationControlled',
    '--disable-blink-features=AutomationControlled',
    '--load-extension=/home/tv/smarttv/frontend/extensions/tv-override',
    '--user-agent=Mozilla/5.0 (SMART-TV; Linux; Tizen 6.5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
    '--cast-app-background-color=ff000000',
    '--force-dark-mode'
]

app = Flask(__name__, static_folder=FRONTEND_DIR)

def load_config():
    try:
        with open(CONFIG_FILE) as f:
            return json.load(f)
    except:
        return {}

def save_config(cfg):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(cfg, f, indent=2)

def get_bt_mac():
    cfg = load_config()
    return cfg.get('bluetooth_mac', 'AA:BB:CC:DD:EE:FF')

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return '127.0.0.1'

def get_hostname():
    return socket.gethostname()

# ─── STATIC ────────────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'splash.html')

@app.route('/app')
def app_page():
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory(FRONTEND_DIR, filename)

# ─── STREAMINGS ────────────────────────────────────────
@app.route('/api/streamings', methods=['GET'])
def get_streamings():
    with open(STREAMINGS_FILE) as f:
        return jsonify(json.load(f))

@app.route('/api/streamings/add', methods=['POST'])
def add_streaming():
    data = request.json
    with open(STREAMINGS_FILE, 'r+') as f:
        db = json.load(f)
        db['streamings'].append(data)
        f.seek(0); f.truncate(); json.dump(db, f, indent=2)
    return jsonify({'ok': True})

@app.route('/api/streamings/remove/<int:id>', methods=['DELETE'])
def remove_streaming(id):
    with open(STREAMINGS_FILE, 'r+') as f:
        db = json.load(f)
        db['streamings'] = [s for s in db['streamings'] if s['id'] != id]
        f.seek(0); f.truncate(); json.dump(db, f, indent=2)
    return jsonify({'ok': True})

@app.route('/api/streamings/reorder', methods=['POST'])
def reorder_streamings():
    data = request.json
    with open(STREAMINGS_FILE, 'r+') as f:
        db = json.load(f)
        db['streamings'] = data.get('streamings', db['streamings'])
        f.seek(0); f.truncate(); json.dump(db, f, indent=2)
    return jsonify({'ok': True})

# ─── VOLUME ────────────────────────────────────────────
@app.route('/api/volume/up')
def vol_up():
    subprocess.run(['wpctl', 'set-volume', '@DEFAULT_AUDIO_SINK@', '5%+'])
    return jsonify({'ok': True})

@app.route('/api/volume/down')
def vol_down():
    subprocess.run(['wpctl', 'set-volume', '@DEFAULT_AUDIO_SINK@', '5%-'])
    return jsonify({'ok': True})

@app.route('/api/volume/mute')
def vol_mute():
    subprocess.run(['wpctl', 'set-mute', '@DEFAULT_AUDIO_SINK@', 'toggle'])
    return jsonify({'ok': True})

@app.route('/api/system/volume', methods=['POST'])
def system_volume():
    data = request.json or {}
    action = data.get('action', 'get')
    if action == 'up':
        subprocess.run(['wpctl', 'set-volume', '@DEFAULT_AUDIO_SINK@', '5%+'])
    elif action == 'down':
        subprocess.run(['wpctl', 'set-volume', '@DEFAULT_AUDIO_SINK@', '5%-'])
    elif action == 'mute':
        subprocess.run(['wpctl', 'set-mute', '@DEFAULT_AUDIO_SINK@', 'toggle'])
    # get current volume
    try:
        result = subprocess.run(['wpctl', 'get-volume', '@DEFAULT_AUDIO_SINK@'],
                               capture_output=True, text=True, timeout=5)
        # Output: "Volume: 0.50" or "Volume: 0.50 [MUTED]"
        line = result.stdout.strip()
        vol = float(line.split(':')[1].split('[')[0].strip())
        muted = '[MUTED]' in line
        return jsonify({'volume': round(vol * 100), 'muted': muted})
    except:
        return jsonify({'volume': 50, 'muted': False})

# ─── SISTEMA ───────────────────────────────────────────
@app.route('/api/system/shutdown', methods=['POST'])
def shutdown():
    subprocess.run(['systemctl', 'poweroff'])
    return jsonify({'ok': True})

@app.route('/api/system/reboot', methods=['POST'])
def reboot():
    subprocess.run(['systemctl', 'reboot'])
    return jsonify({'ok': True})

@app.route('/api/system/dpms-off', methods=['POST'])
def dpms_off():
    subprocess.run(['xset', 'dpms', 'force', 'off'], env={**os.environ, 'DISPLAY': ':0'})
    return jsonify({'ok': True})

@app.route('/api/system/dpms-on')
def dpms_on():
    subprocess.run(['xset', 'dpms', 'force', 'on'], env={**os.environ, 'DISPLAY': ':0'})
    return jsonify({'ok': True})

@app.route('/api/system/info')
def system_info():
    return jsonify({
        'ip': get_local_ip(),
        'hostname': get_hostname()
    })

@app.route('/api/system/stats')
def system_stats():
    try:
        cpu = subprocess.run(['bash', '-c', "top -bn1 | grep '%CPU' | awk -F'[:,]' '{print $2}' | tr -d ' '"],
                           capture_output=True, text=True, timeout=5)
        cpu_val = float(cpu.stdout.strip().replace(',', '.')) if cpu.stdout.strip() else 0
    except:
        cpu_val = 0

    try:
        mem = subprocess.run(['free', '-m'], capture_output=True, text=True, timeout=5)
        lines = mem.stdout.strip().split('\n')
        parts = lines[1].split()
        ram_total = round(int(parts[1]) / 1024, 1)
        ram_used = round(int(parts[2]) / 1024, 1)
    except:
        ram_total = 4.0
        ram_used = 0.0

    try:
        disk = subprocess.run(['df', '-h', '/'], capture_output=True, text=True, timeout=5)
        lines = disk.stdout.strip().split('\n')
        parts = lines[1].split()
        disk_total_str = parts[1].replace('G', '')
        disk_used_str = parts[2].replace('G', '')
        disk_total = float(disk_total_str.replace(',', '.')) if disk_total_str else 32
        disk_used = float(disk_used_str.replace(',', '.')) if disk_used_str else 0
    except:
        disk_total = 32
        disk_used = 0

    try:
        proc = subprocess.run(['bash', '-c', 'ps -e --no-headers | wc -l'],
                           capture_output=True, text=True, timeout=5)
        proc_count = int(proc.stdout.strip()) if proc.stdout.strip() else 0
    except:
        proc_count = 0

    return jsonify({
        'cpu': round(cpu_val, 1),
        'ram_used': ram_used,
        'ram_total': ram_total,
        'disk_used': disk_used,
        'disk_total': disk_total,
        'processes': proc_count
    })

@app.route('/api/system/restart-chromium', methods=['POST'])
def restart_chromium():
    restart_script = '/home/tv/smarttv/system/scripts/restart.sh'
    subprocess.Popen(['bash', restart_script],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                     start_new_session=True)
    return jsonify({'ok': True})

@app.route('/api/system/update', methods=['POST'])
def system_update():
    project_dir = os.path.join(BASE_DIR, '..')
    result = subprocess.run(['git', 'pull'], cwd=project_dir, capture_output=True, text=True, timeout=30)
    return jsonify({'ok': result.returncode == 0, 'output': result.stdout.strip()})

@app.route('/api/system/timer-set')
def timer_set():
    minutes = request.args.get('minutes', type=int)
    if not minutes or minutes <= 0:
        return jsonify({'ok': False, 'error': 'Invalid minutes'}), 400
    # Cancel existing timer
    timer_cancel()
    seconds = minutes * 60
    proc = subprocess.Popen(['bash', '-c', f'sleep {seconds} && systemctl poweroff'])
    with open(TIMER_PID_FILE, 'w') as f:
        f.write(str(proc.pid))
    return jsonify({'ok': True, 'pid': proc.pid, 'minutes': minutes})

@app.route('/api/system/timer-cancel')
def timer_cancel():
    try:
        with open(TIMER_PID_FILE) as f:
            pid = int(f.read().strip())
        os.kill(pid, signal.SIGTERM)
        os.remove(TIMER_PID_FILE)
        return jsonify({'ok': True})
    except:
        return jsonify({'ok': True})

# ─── BLUETOOTH ─────────────────────────────────────────
bt_mgr = BluetoothManager()

@app.route('/api/bluetooth/status')
def bt_status():
    try:
        paired = bt_mgr.status()
        if not paired:
            return jsonify({'connected': False, 'name': '', 'mac': ''})
        connected_dev = next((d for d in paired if d['connected']), None)
        if connected_dev:
            return jsonify({
                'connected': True,
                'name': connected_dev['name'],
                'mac': connected_dev['mac']
            })
        return jsonify({
            'connected': False,
            'name': paired[0]['name'],
            'mac': paired[0]['mac']
        })
    except Exception as e:
        return jsonify({'connected': False, 'name': '', 'mac': '', 'error': str(e)})

@app.route('/api/bluetooth/scan')
def bt_scan():
    try:
        devices = bt_mgr.scan(timeout=12)
        return jsonify({'devices': [
            {'mac': d['mac'], 'name': d['name']} for d in devices
        ]})
    except Exception as e:
        return jsonify({'devices': [], 'error': str(e)})

@app.route('/api/bluetooth/connect', methods=['GET', 'POST'])
def bt_connect():
    data = request.json or {}
    mac = data.get('mac', '')
    if not mac:
        mac = get_bt_mac()
    try:
        result = bt_mgr.connect(mac, timeout=15)
        return jsonify({'ok': True, 'status': result.get('status', 'connected')})
    except ConnectionTimeoutError:
        return jsonify({'ok': False, 'error': 'Conexão falhou — dispositivo fora de alcance?'})
    except DeviceNotFoundError:
        return jsonify({'ok': False, 'error': 'Dispositivo não encontrado. Faça scan primeiro.'})
    except BluetoothError as e:
        return jsonify({'ok': False, 'error': str(e)})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)})

@app.route('/api/bluetooth/disconnect', methods=['POST'])
def bt_disconnect():
    data = request.json or {}
    mac = data.get('mac', '')
    if not mac:
        mac = get_bt_mac()
    try:
        bt_mgr.disconnect(mac)
    except Exception:
        pass
    return jsonify({'ok': True})

# ─── WI-FI ─────────────────────────────────────────────
@app.route('/api/wifi/status')
def wifi_status():
    try:
        result = subprocess.run(['nmcli', '-t', '-f', 'NAME,ACTIVE', 'con', 'show'],
                               capture_output=True, text=True, timeout=5)
        active = ''
        for line in result.stdout.strip().splitlines():
            if ':yes' in line:
                active = line.split(':')[0]
                break
        return jsonify({'connected': bool(active), 'ssid': active})
    except:
        return jsonify({'connected': False, 'ssid': ''})

@app.route('/api/wifi/scan')
def wifi_scan():
    try:
        subprocess.run(['nmcli', 'dev', 'wifi', 'rescan'], capture_output=True, timeout=10)
        time.sleep(2)
        result = subprocess.run(['nmcli', '-t', '-f', 'SSID,SIGNAL,SECURITY', 'dev', 'wifi', 'list'],
                               capture_output=True, text=True, timeout=10)
        networks = []
        seen = set()
        for line in result.stdout.strip().splitlines():
            parts = line.split(':')
            if len(parts) >= 2:
                ssid = parts[0]
                signal = parts[1] if len(parts) > 1 else '0'
                security = parts[2] if len(parts) > 2 else ''
                if ssid and ssid not in seen:
                    seen.add(ssid)
                    networks.append({'ssid': ssid, 'signal': int(signal), 'security': security})
        networks.sort(key=lambda x: x['signal'], reverse=True)
        return jsonify({'networks': networks})
    except:
        return jsonify({'networks': []})

@app.route('/api/wifi/connect', methods=['POST'])
def wifi_connect():
    data = request.json or {}
    ssid = data.get('ssid', '')
    password = data.get('password', '')
    if not ssid:
        return jsonify({'ok': False, 'error': 'SSID required'}), 400
    try:
        if password:
            result = subprocess.run(['nmcli', 'dev', 'wifi', 'connect', ssid, 'password', password],
                                   capture_output=True, text=True, timeout=30)
        else:
            result = subprocess.run(['nmcli', 'dev', 'wifi', 'connect', ssid],
                                   capture_output=True, text=True, timeout=30)
        ok = result.returncode == 0
        return jsonify({'ok': ok, 'output': result.stdout.strip() if not ok else ''})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

# ─── ACESSO REMOTO (OpenCode Web) ───────────────────────
OPENCODE_PORT = 3000

@app.route('/api/remote/status')
def remote_status():
    running = False
    try:
        with open(REMOTE_PID_FILE) as f:
            pid = int(f.read().strip())
        os.kill(pid, 0)  # Check if process exists
        running = True
    except:
        running = False
    return jsonify({
        'running': running,
        'ip': get_local_ip(),
        'port': OPENCODE_PORT,
        'hostname': get_hostname()
    })

@app.route('/api/remote/toggle', methods=['POST'])
def remote_toggle():
    running = False
    try:
        with open(REMOTE_PID_FILE) as f:
            pid = int(f.read().strip())
        os.kill(pid, 0)
        # Stop opencode web
        os.kill(pid, signal.SIGTERM)
        os.remove(REMOTE_PID_FILE)
        running = False
    except:
        # Start opencode serve (headless, no browser opening)
        try:
            project_dir = os.path.join(BASE_DIR, '..')
            proc = subprocess.Popen(
                ['opencode', 'serve', '--port', str(OPENCODE_PORT), '--hostname', '0.0.0.0'],
                cwd=project_dir,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                env={**os.environ, 'HOME': '/home/tv'}
            )
            with open(REMOTE_PID_FILE, 'w') as f:
                f.write(str(proc.pid))
            running = True
        except:
            running = False
    return jsonify({'running': running})

# ─── BROWSER CACHE ─────────────────────────────────────
@app.route('/api/browser/clear-cache', methods=['POST'])
def clear_cache():
    data = request.json or {}
    url = data.get('url', '')
    try:
        cache_dir = os.path.expanduser('~/.cache/chromium/Default/Cache')
        subprocess.run(['rm', '-rf', cache_dir], timeout=10)
        return jsonify({'ok': True})
    except:
        return jsonify({'ok': False})

# ─── CONFIG ────────────────────────────────────────────
@app.route('/api/config', methods=['GET'])
def get_config():
    return jsonify(load_config())

@app.route('/api/config', methods=['POST'])
def set_config():
    data = request.json
    cfg = load_config()
    cfg.update(data)
    save_config(cfg)
    return jsonify({'ok': True})

# ─── CHROMIUM WATCHDOG ─────────────────────────────────
RESTART_SCRIPT = '/home/tv/smarttv/system/scripts/restart.sh'

def chromium_watchdog():
    while True:
        time.sleep(5)
        try:
            result = subprocess.run(['pgrep', '-f', 'chromium'],
                                   capture_output=True, text=True, timeout=5)
            if not result.stdout.strip():
                subprocess.Popen(
                    ['chromium'] + CHROMIUM_FLAGS,
                    env={**os.environ, 'DISPLAY': ':0'},
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
        except Exception:
            pass

watchdog_thread = threading.Thread(target=chromium_watchdog, daemon=True)
watchdog_thread.start()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
