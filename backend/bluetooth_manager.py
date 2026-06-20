"""
bluetooth_manager.py — BlueZ D-Bus Bluetooth Management for Smart TV

Requires: python3-dbus, bluez
Tested on: Debian 13 (Trixie), BlueZ 5.82, Python 3.13.5
"""

import dbus
import dbus.service
import dbus.exceptions
from dbus.mainloop.glib import DBusGMainLoop
import time
import threading
import logging

logger = logging.getLogger(__name__)

# ============================================================
# Initialize D-Bus mainloop (MUST be done once, early)
# ============================================================
DBusGMainLoop(set_as_default=True)

# ============================================================
# Constants
# ============================================================
BLUEZ_BUS = 'org.bluez'
OBJECT_MANAGER_IFACE = 'org.freedesktop.DBus.ObjectManager'
PROPERTIES_IFACE = 'org.freedesktop.DBus.Properties'
ADAPTER_IFACE = 'org.bluez.Adapter1'
DEVICE_IFACE = 'org.bluez.Device1'
AGENT_IFACE = 'org.bluez.Agent1'
AGENT_MANAGER_IFACE = 'org.bluez.AgentManager1'

DEFAULT_ADAPTER_PATH = '/org/bluez/hci0'
AGENT_PATH = '/com/smarttv/bluez/agent'

# ============================================================
# Custom Exceptions
# ============================================================

class BluetoothError(Exception):
    pass

class DeviceNotFoundError(BluetoothError):
    pass

class ConnectionTimeoutError(BluetoothError):
    pass

class AdapterNotReadyError(BluetoothError):
    pass

# ============================================================
# Helper Functions
# ============================================================

def mac_to_path(mac, adapter_path=DEFAULT_ADAPTER_PATH):
    return f"{adapter_path}/dev_{mac.replace(':', '_')}"

BLE_INDICATORS = {'00001800', '00001801', '0000180a', '0000180f', '0000180d'}
CLASSIC_PROFILES = {'00001101', '0000110a', '0000110b', '0000110c',
                    '0000110e', '0000111e', '0000111f', '0000112f', '00001132'}

def classify_device_type(device_props):
    has_classic = False
    has_ble = False
    for uuid in device_props.get('UUIDs', []):
        short = str(uuid)[:8].lower()
        if short in CLASSIC_PROFILES:
            has_classic = True
        if short in BLE_INDICATORS:
            has_ble = True
    if str(device_props.get('AddressType', '')) == 'random':
        has_ble = True
    if 'RSSI' in device_props and int(device_props.get('Class', 0)) == 0:
        has_ble = True
    if has_classic and has_ble:
        return 'dual'
    elif has_classic:
        return 'classic'
    elif has_ble:
        return 'ble'
    return 'unknown'

def decode_device_class(class_val):
    MAJOR_NAMES = {
        0: 'Miscellaneous', 1: 'Computer', 2: 'Phone',
        3: 'LAN/Network AP', 4: 'Audio/Video', 5: 'Peripheral',
        6: 'Imaging', 7: 'Wearable', 8: 'Toy', 9: 'Health',
    }
    major = (class_val >> 8) & 0x1F
    return MAJOR_NAMES.get(major, f'Unknown ({major})')

def _parse_device(device_path, device_props):
    return {
        'mac': str(device_props.get('Address', '')),
        'name': str(device_props.get('Name', 'Unknown')),
        'alias': str(device_props.get('Alias', '')),
        'icon': str(device_props.get('Icon', '')),
        'class': int(device_props.get('Class', 0)),
        'class_name': decode_device_class(int(device_props.get('Class', 0))),
        'connected': bool(device_props.get('Connected', False)),
        'paired': bool(device_props.get('Paired', False)),
        'bonded': bool(device_props.get('Bonded', False)),
        'trusted': bool(device_props.get('Trusted', False)),
        'blocked': bool(device_props.get('Blocked', False)),
        'services_resolved': bool(device_props.get('ServicesResolved', False)),
        'uuids': [str(u) for u in device_props.get('UUIDs', [])],
        'rssi': int(device_props.get('RSSI', 0)) if 'RSSI' in device_props else None,
        'device_type': classify_device_type(device_props),
        'path': device_path,
    }

# ============================================================
# Pairing Agent
# ============================================================

class BluezAgent(dbus.service.Object):
    def __init__(self, bus_name):
        super().__init__(bus_name, AGENT_PATH)

    @dbus.service.method(AGENT_IFACE, in_signature='', out_signature='')
    def Release(self):
        logger.info("Agent: Released")

    @dbus.service.method(AGENT_IFACE, in_signature='o', out_signature='s')
    def RequestPinCode(self, device):
        logger.info(f"Agent: RequestPinCode for {device}")
        return ""

    @dbus.service.method(AGENT_IFACE, in_signature='o', out_signature='u')
    def RequestPasskey(self, device):
        logger.info(f"Agent: RequestPasskey for {device}")
        return dbus.UInt32(0)

    @dbus.service.method(AGENT_IFACE, in_signature='os', out_signature='')
    def DisplayPinCode(self, device, pincode):
        logger.info(f"Agent: DisplayPinCode {pincode} for {device}")

    @dbus.service.method(AGENT_IFACE, in_signature='ouq', out_signature='')
    def DisplayPasskey(self, device, passkey, entered):
        logger.info(f"Agent: DisplayPasskey {passkey:06d} for {device}")

    @dbus.service.method(AGENT_IFACE, in_signature='ou', out_signature='')
    def RequestConfirmation(self, device, passkey):
        logger.info(f"Agent: RequestConfirmation passkey={passkey:06d} for {device}")

    @dbus.service.method(AGENT_IFACE, in_signature='o', out_signature='')
    def RequestAuthorization(self, device):
        logger.info(f"Agent: RequestAuthorization for {device}")

    @dbus.service.method(AGENT_IFACE, in_signature='os', out_signature='')
    def AuthorizeService(self, device, uuid):
        logger.info(f"Agent: AuthorizeService {uuid} for {device}")

    @dbus.service.method(AGENT_IFACE, in_signature='', out_signature='')
    def Cancel(self):
        logger.info("Agent: Cancel")

# ============================================================
# Bluetooth Manager
# ============================================================

class BluetoothManager:
    def __init__(self, adapter_path=DEFAULT_ADAPTER_PATH, register_agent=True):
        self.bus = dbus.SystemBus()
        self.adapter_path = adapter_path
        self._agent = None
        self._bus_name = None
        self._lock = threading.Lock()

        if register_agent:
            self._setup_agent()

    def _setup_agent(self):
        self._bus_name = dbus.service.BusName('com.smarttv.bluez', bus=self.bus)
        self._agent = BluezAgent(self._bus_name)
        try:
            agent_manager = dbus.Interface(
                self.bus.get_object(BLUEZ_BUS, '/org/bluez'),
                AGENT_MANAGER_IFACE
            )
            agent_manager.RegisterAgent(
                dbus.ObjectPath(AGENT_PATH),
                'NoInputNoOutput'
            )
            agent_manager.RequestDefaultAgent(dbus.ObjectPath(AGENT_PATH))
            logger.info("Pairing agent registered")
        except dbus.exceptions.DBusException as e:
            logger.warning(f"Agent registration failed: {e.get_dbus_name()}: {e.get_dbus_message()}")

    def _get_adapter(self):
        proxy = self.bus.get_object(BLUEZ_BUS, self.adapter_path)
        methods = dbus.Interface(proxy, ADAPTER_IFACE)
        props = dbus.Interface(proxy, PROPERTIES_IFACE)
        return methods, props

    def _get_device(self, device_path):
        proxy = self.bus.get_object(BLUEZ_BUS, device_path)
        methods = dbus.Interface(proxy, DEVICE_IFACE)
        props = dbus.Interface(proxy, PROPERTIES_IFACE)
        return methods, props

    def _get_all_objects(self):
        om = dbus.Interface(
            self.bus.get_object(BLUEZ_BUS, '/'),
            OBJECT_MANAGER_IFACE
        )
        return om.GetManagedObjects()

    def _find_device_path(self, mac):
        path = mac_to_path(mac, self.adapter_path)
        objects = self._get_all_objects()
        if path in objects and DEVICE_IFACE in objects[path]:
            return path
        raise DeviceNotFoundError(f"Device {mac} not found. Is it paired/in range?")

    def ensure_adapter_powered(self):
        methods, props = self._get_adapter()
        powered = props.Get(ADAPTER_IFACE, 'Powered')
        if powered:
            return True
        props.Set(ADAPTER_IFACE, 'Powered', dbus.Boolean(True))
        for _ in range(20):
            time.sleep(0.5)
            if props.Get(ADAPTER_IFACE, 'Powered'):
                return True
        raise AdapterNotReadyError("Failed to power on adapter")

    # --------------------------------------------------------
    # SCAN
    # --------------------------------------------------------
    def scan(self, transport='auto', timeout=8, filter_uuids=None):
        with self._lock:
            self.ensure_adapter_powered()
            methods, props = self._get_adapter()

            filter_dict = {
                'DuplicateData': dbus.Boolean(False, variant_level=1),
            }
            if transport != 'auto':
                filter_dict['Transport'] = dbus.String(transport, variant_level=1)
            if filter_uuids:
                filter_dict['UUIDs'] = dbus.Array(
                    [dbus.String(u) for u in filter_uuids],
                    variant_level=1
                )
            methods.SetDiscoveryFilter(filter_dict)
            methods.StartDiscovery()

            time.sleep(timeout)

            objects = self._get_all_objects()
            devices = []
            for path, interfaces in objects.items():
                if DEVICE_IFACE in interfaces:
                    devices.append(_parse_device(path, interfaces[DEVICE_IFACE]))

            try:
                methods.StopDiscovery()
            except dbus.exceptions.DBusException:
                pass
            try:
                methods.SetDiscoveryFilter({})
            except dbus.exceptions.DBusException:
                pass

            return devices

    # --------------------------------------------------------
    # CONNECT
    # --------------------------------------------------------
    def connect(self, mac, timeout=15):
        with self._lock:
            self.ensure_adapter_powered()
            device_path = self._find_device_path(mac)
            dev, props = self._get_device(device_path)

            if props.Get(DEVICE_IFACE, 'Connected'):
                return {'status': 'already_connected', 'mac': mac}

            if not props.Get(DEVICE_IFACE, 'Paired'):
                try:
                    dev.Pair()
                except dbus.exceptions.DBusException as e:
                    if 'AlreadyExists' not in e.get_dbus_name():
                        raise
                for _ in range(timeout * 2):
                    time.sleep(0.5)
                    if props.Get(DEVICE_IFACE, 'Paired'):
                        break

            props.Set(DEVICE_IFACE, 'Trusted', dbus.Boolean(True))

            try:
                dev.Connect()
            except dbus.exceptions.DBusException as e:
                if 'AlreadyConnected' not in e.get_dbus_name():
                    raise

            for _ in range(timeout * 2):
                time.sleep(0.5)
                if props.Get(DEVICE_IFACE, 'Connected'):
                    return {'status': 'connected', 'mac': mac}

            raise ConnectionTimeoutError(f"Connection to {mac} timed out")

    # --------------------------------------------------------
    # DISCONNECT
    # --------------------------------------------------------
    def disconnect(self, mac, timeout=10):
        with self._lock:
            device_path = self._find_device_path(mac)
            dev, props = self._get_device(device_path)

            if not props.Get(DEVICE_IFACE, 'Connected'):
                return {'status': 'already_disconnected', 'mac': mac}

            dev.Disconnect()

            for _ in range(timeout * 2):
                time.sleep(0.5)
                if not props.Get(DEVICE_IFACE, 'Connected'):
                    return {'status': 'disconnected', 'mac': mac}

            raise TimeoutError(f"Disconnection from {mac} timed out")

    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------
    def status(self, mac=None):
        objects = self._get_all_objects()

        if mac:
            path = mac_to_path(mac, self.adapter_path)
            if path in objects and DEVICE_IFACE in objects[path]:
                return _parse_device(path, objects[path][DEVICE_IFACE])
            return None

        paired = []
        for path, interfaces in objects.items():
            if DEVICE_IFACE in interfaces:
                dev = interfaces[DEVICE_IFACE]
                if dev.get('Paired', False):
                    paired.append(_parse_device(path, dev))
        return paired

    # --------------------------------------------------------
    # REMOVE
    # --------------------------------------------------------
    def remove(self, mac):
        with self._lock:
            device_path = self._find_device_path(mac)
            methods, _ = self._get_adapter()
            methods.RemoveDevice(dbus.ObjectPath(device_path))
            return {'status': 'removed', 'mac': mac}
