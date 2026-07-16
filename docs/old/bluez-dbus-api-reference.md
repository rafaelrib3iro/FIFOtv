# BlueZ D-Bus API Comprehensive Reference
## For Smart TV Application — Debian 13 (Trixie) / BlueZ 5.82 / Python 3.13.5

---

## Table of Contents

1. [System Environment Summary](#1-system-environment-summary)
2. [D-Bus Package Availability](#2-dbus-package-availability)
3. [BlueZ D-Bus API — Complete Interface Reference](#3-bluez-d-bus-api--complete-interface-reference)
4. [D-Bus Signals to Monitor](#4-d-bus-signals-to-monitor)
5. [Pairing Agent Implementation](#5-pairing-agent-implementation)
6. [Workflow: Scan](#6-workflow-scan)
7. [Workflow: Connect](#7-workflow-connect)
8. [Workflow: Status](#8-workflow-status)
9. [Workflow: Disconnect](#9-workflow-disconnect)
10. [Threading Model](#10-threading-model)
11. [Error Handling](#11-error-handling)
12. [Complete Working Python Module](#12-complete-working-python-module)
13. [Gotchas and Version-Specific Issues](#13-gotchas-and-version-specific-issues)
14. [References](#14-references)

---

## 1. System Environment Summary

| Component | Version / Value |
|---|---|
| OS | Debian GNU/Linux 13 (trixie), Debian 13.5 |
| Python | 3.13.5 |
| BlueZ | 5.82 |
| dbus-python | 1.4.0 |
| D-Bus daemon | 1.16.2 |
| Adapter MAC | 64:32:A8:21:0F:CE |
| Adapter Name | localhost |
| Adapter Class | 0x00400104 (Computer / Desktop) |
| Adapter Powered | Yes |
| Adapter Roles | central, peripheral |
| BLE Advertising | Supported (5 instances, tx-power/appearance/local-name includes) |

Currently paired/known devices on this system:
- `9B:FC:9A:4F:FD:A4` — PBS30 (Audio/Video headset, paired, trusted, not connected)
- `E0:2B:96:E2:F0:C5` — iPhone de Rafael (Phone, not paired, trusted, not connected)

---

## 2. D-Bus Package Availability

### Packages Installed

```
python3-dbus    1.4.0-1      (dbus-python bindings)
dbus            1.16.2-2     (D-Bus daemon)
bluez           5.82-1.1     (BlueZ Bluetooth stack)
```

### Import Tests (Verified on this system)

| Import | Status | Notes |
|---|---|---|
| `import dbus` | OK (v1.4.0) | Primary D-Bus library — use this |
| `from dbus.mainloop.glib import DBusGMainLoop` | OK | Required for signal handling |
| `from gi.repository import GLib` | OK | GLib mainloop — required for async/signals |
| `import dbus.service` | OK | For exporting objects (Agent1 impl) |
| `dbus.service.Object` | OK | Base class for exported objects |
| `dbus.service.method` | OK | Decorator for exported methods |
| `dbus.service.signal` | OK | Decorator for exported signals |
| `from pydbus import SystemBus` | NOT INSTALLED | pydbus is NOT available — do not use |

### Recommendation

**Use `dbus-python` (the `dbus` package) directly.** It is installed, well-maintained by Debian, and fully supports everything needed. `pydbus` is NOT installed and has not been updated since 2016. The `dbus-python` library is the standard for BlueZ integration.

---

## 3. BlueZ D-Bus API — Complete Interface Reference

### 3.1 org.freedesktop.DBus.ObjectManager

**Object Path:** `/`
**Bus Name:** `org.bluez`

This is the root interface for enumerating all BlueZ objects.

#### Methods

| Method | Signature | Returns | Description |
|---|---|---|---|
| `GetManagedObjects()` | `→ a{oa{sa{sv}}}` | Dict of all objects | Returns every object path, its interfaces, and all properties |

**Return type breakdown:**
```
a{oa{sa{sv}}}
  o        = object path (e.g., "/org/bluez/hci0/dev_9B_FC_9A_4F_FD_A4")
  sa{sv}   = dict of interface_name → {property_name → value}
    s      = interface name (e.g., "org.bluez.Device1")
    a{sv}  = properties dict
      s    = property name
      v    = variant value
```

#### Signals

| Signal | Signature | Description |
|---|---|---|
| `InterfacesAdded` | `(o, a{sa{sv}})` | New interface appeared on object (device appeared) |
| `InterfacesRemoved` | `(o, as)` | Interface removed from object (device disappeared) |

#### Python Usage

```python
import dbus

bus = dbus.SystemBus()
manager = bus.get_object('org.bluez', '/')
om = dbus.Interface(manager, 'org.freedesktop.DBus.ObjectManager')

# Get all objects
objects = om.GetManagedObjects()
for path, interfaces in objects.items():
    if 'org.bluez.Device1' in interfaces:
        device = interfaces['org.bluez.Device1']
        print(f"MAC: {device['Address']}, Name: {device.get('Name', 'Unknown')}")
```

---

### 3.2 org.bluez.Adapter1

**Object Path:** `/org/bluez/hci0` (may vary if multiple adapters)
**Bus Name:** `org.bluez`

#### Properties

| Property | Type | Writable | Description |
|---|---|---|---|
| `Address` | `s` (string) | No | Bluetooth adapter MAC address (e.g., "64:32:A8:21:0F:CE") |
| `AddressType` | `s` (string) | No | "public" or "random" |
| `Name` | `s` (string) | No | System name of the adapter |
| `Alias` | `s` (string) | Yes | User-friendly name (writable) |
| `Class` | `u` (uint32) | No | Device class (encoded major/minor/format) |
| `Powered` | `b` (boolean) | Yes | **ON/OFF switch** — set True to power on |
| `PowerState` | `s` (string) | No | "on", "off", "turning-on", "turning-off" |
| `Discoverable` | `b` (boolean) | Yes | Whether adapter is visible to other devices |
| `DiscoverableTimeout` | `u` (uint32) | Yes | Timeout in seconds (0 = indefinitely) |
| `Pairable` | `b` (boolean) | Yes | Whether adapter accepts pairing requests |
| `PairableTimeout` | `u` (uint32) | Yes | Timeout in seconds (0 = indefinitely) |
| `Discovering` | `b` (boolean) | No | Whether discovery is currently active |
| `UUIDs` | `as` (array of strings) | No | Supported profile UUIDs |
| `Modalias` | `s` (string) | No | Modalias for device identification |
| `Roles` | `as` (array of strings) | No | Supported roles: "central", "peripheral" |
| `Manufacturer` | `q` (uint16) | No | Bluetooth manufacturer ID |
| `Version` | `y` (byte) | No | Bluetooth version |
| `Connectable` | `b` (boolean) | Yes | Whether adapter is connectable (BlueZ 5.82+) |
| `ExperimentalFeatures` | `as` (array of strings) | No | Experimental features enabled |

#### Methods

| Method | Signature | Description |
|---|---|---|
| `StartDiscovery()` | `→ void` | Start scanning for devices |
| `StopDiscovery()` | `→ void` | Stop scanning |
| `SetDiscoveryFilter(filter)` | `(a{sv}) → void` | Set discovery filter (see filter options below) |
| `GetDiscoveryFilters()` | `→ as` | Returns list of supported filter keys |
| `RemoveDevice(device)` | `(o) → void` | Remove a device from adapter (unpair + forget) |

#### Discovery Filter Options

| Key | Type | Description |
|---|---|---|
| `UUIDs` | `as` | Filter by service UUIDs |
| `RSSI` | `n` (int16) | Minimum signal strength |
| `Pathloss` | `n` (int16) | Maximum pathloss |
| `Transport` | `s` | `"le"` (BLE only), `"bredr"` (Classic only), or `"auto"` |
| `DuplicateData` | `b` | Whether to report duplicate advertisements |
| `Discoverable` | `b` | Filter for discoverable devices |
| `Pattern` | `s` | Filter by address or name pattern (regex) |

#### Python Usage

```python
import dbus

bus = dbus.SystemBus()
adapter_path = '/org/bluez/hci0'
proxy = bus.get_object('org.bluez', adapter_path)
adapter = dbus.Interface(proxy, 'org.bluez.Adapter1')
props = dbus.Interface(proxy, 'org.freedesktop.DBus.Properties')

# Power on
props.Set('org.bluez.Adapter1', 'Powered', dbus.Boolean(True))

# Set BLE-only discovery filter
adapter.SetDiscoveryFilter({
    'Transport': dbus.String('le', variant_level=1),
    'DuplicateData': dbus.Boolean(False, variant_level=1),
})

# Start discovery
adapter.StartDiscovery()

# ... collect devices ...

# Stop discovery
adapter.StopDiscovery()
```

---

### 3.3 org.bluez.Device1

**Object Path:** `/org/bluez/hci0/dev_XX_XX_XX_XX_XX_XX`
**Bus Name:** `org.bluez`

The MAC address in the path uses underscores instead of colons.

#### Properties

| Property | Type | Writable | Description |
|---|---|---|---|
| `Address` | `s` (string) | No | Device MAC address (e.g., "9B:FC:9A:4F:FD:A4") |
| `AddressType` | `s` (string) | No | "public" or "random" |
| `Name` | `s` (string) | No | Device name from Bluetooth |
| `Alias` | `s` (string) | Yes | User-friendly alias (writable) |
| `Icon` | `s` (string) | No | Device icon (e.g., "audio-headset", "phone") |
| `Class` | `u` (uint32) | No | Device class (encoded) |
| `Appearance` | `q` (uint16) | No | BLE appearance value |
| `Paired` | `b` (boolean) | No | Whether device is paired/bonded |
| `Bonded` | `b` (boolean) | No | Whether device is bonded |
| `Trusted` | `b` (boolean) | Yes | Whether device is trusted (writable) |
| `Blocked` | `b` (boolean) | Yes | Whether device is blocked (writable) |
| `Connected` | `b` (boolean) | No | Whether device is currently connected |
| `LegacyPairing` | `b` (boolean) | No | Whether legacy (PIN) pairing was used |
| `ServicesResolved` | `b` (boolean) | No | Whether GATT services are resolved (important for BLE) |
| `UUIDs` | `as` (array of strings) | No | Supported service UUIDs |
| `Modalias` | `s` (string) | No | Device modalias |
| `Adapter` | `o` (object path) | No | Path of the adapter this device belongs to |
| `RSSI` | `n` (int16) | No | Current signal strength (during discovery) |
| `TxPower` | `n` (int16) | No | Transmit power |
| `ManufacturerData` | `a{qv}` | No | Manufacturer-specific data (BLE) |
| `ServiceData` | `a{sv}` | No | Service-specific data (BLE) |
| `AdvertisingData` | `a{yv}` | No | Raw advertising data |
| `AdvertisingFlags` | `ay` (byte array) | No | Advertising flags |
| `WakeAllowed` | `b` (boolean) | Yes | Whether device can wake the system |
| `Sets` | `a{oa{sv}}` | No | Device sets (BlueZ 5.66+) |

#### Methods

| Method | Signature | Description |
|---|---|---|
| `Connect()` | `→ void` | Connect to the device |
| `Disconnect()` | `→ void` | Disconnect from the device |
| `Pair()` | `→ void` | Initiate pairing |
| `CancelPairing()` | `→ void` | Cancel ongoing pairing |
| `ConnectProfile(uuid)` | `(s) → void` | Connect to a specific profile by UUID |
| `DisconnectProfile(uuid)` | `(s) → void` | Disconnect a specific profile |

#### Python Usage

```python
import dbus

bus = dbus.SystemBus()
device_path = '/org/bluez/hci0/dev_9B_FC_9A_4F_FD_A4'
proxy = bus.get_object('org.bluez', device_path)
device = dbus.Interface(proxy, 'org.bluez.Device1')
props = dbus.Interface(proxy, 'org.freedesktop.DBus.Properties')

# Read properties
name = props.Get('org.bluez.Device1', 'Name')
connected = props.Get('org.bluez.Device1', 'Connected')
paired = props.Get('org.bluez.Device1', 'Paired')

# Connect
device.Connect()

# Pair
device.Pair()

# Trust
props.Set('org.bluez.Device1', 'Trusted', dbus.Boolean(True))
```

---

### 3.4 org.bluez.AgentManager1

**Object Path:** `/org/bluez`
**Bus Name:** `org.bluez`

#### Methods

| Method | Signature | Description |
|---|---|---|
| `RegisterAgent(agent, capability)` | `(o, s) → void` | Register a pairing agent |
| `UnregisterAgent(agent)` | `(o) → void` | Unregister a pairing agent |
| `RequestDefaultAgent(agent)` | `(o) → void` | Set agent as the default (receives all pairing requests) |

**Agent capability values:**
| Value | Description |
|---|---|
| `"DisplayOnly"` | Agent can only display a PIN/passkey |
| `"DisplayYesNo"` | Agent can display and respond yes/no |
| `"KeyboardOnly"` | Agent can only input a PIN/passkey |
| `"NoInputNoOutput"` | Agent has no input/output — auto-pairs without user interaction |
| `"KeyboardDisplay"` | Agent can both display and input (most capable) |

#### Python Usage

```python
import dbus

bus = dbus.SystemBus()
agent_manager = dbus.Interface(
    bus.get_object('org.bluez', '/org/bluez'),
    'org.bluez.AgentManager1'
)

# Register agent (agent_path is a D-Bus object path you export)
agent_manager.RegisterAgent(
    dbus.ObjectPath('/com/smarttv/agent'),
    'NoInputNoOutput'  # Auto-accept pairing
)

# Set as default agent
agent_manager.RequestDefaultAgent(dbus.ObjectPath('/com/smarttv/agent'))
```

---

### 3.5 org.bluez.LEAdvertisingManager1

**Object Path:** `/org/bluez/hci0`
**Bus Name:** `org.bluez`

Only needed if you want the Smart TV to advertise itself as a BLE device.

#### Properties

| Property | Type | Description |
|---|---|---|
| `ActiveInstances` | `y` (byte) | Number of active advertisement instances |
| `SupportedInstances` | `y` (byte) | Max supported advertisement instances (5 on this system) |
| `SupportedIncludes` | `as` | Supported include types: "tx-power", "appearance", "local-name" |
| `SupportedFeatures` | `as` | Supported advertising features |
| `SupportedCapabilities` | `a{sv}` | MaxAdvLen (31), MaxScnRspLen (31) |
| `SupportedSecondaryChannels` | `as` | Supported secondary channels |

#### Methods

| Method | Signature | Description |
|---|---|---|
| `RegisterAdvertisement(advertisement, options)` | `(o, a{sv}) → void` | Register a BLE advertisement |
| `UnregisterAdvertisement(advertisement)` | `(o) → void` | Unregister advertisement |

---

### 3.6 org.bluez.ProfileManager1

**Object Path:** `/org/bluez`
**Bus Name:** `org.bluez`

#### Methods

| Method | Signature | Description |
|---|---|---|
| `RegisterProfile(profile, uuid, options)` | `(o, s, a{sv}) → void` | Register a custom profile |
| `UnregisterProfile(profile)` | `(o) → void` | Unregister a profile |

---

### 3.7 MAC Address to D-Bus Object Path Conversion

The device object path uses the MAC address with underscores instead of colons:

```
MAC:       9B:FC:9A:4F:FD:A4
Path:      /org/bluez/hci0/dev_9B_FC_9A_4F_FD_A4
```

**Python helper:**

```python
def mac_to_path(mac: str, adapter_path: str = '/org/bluez/hci0') -> str:
    """Convert MAC address to BlueZ D-Bus object path."""
    mac_underscore = mac.replace(':', '_')
    return f"{adapter_path}/dev_{mac_underscore}"

def path_to_mac(path: str) -> str:
    """Extract MAC address from BlueZ D-Bus object path."""
    parts = path.split('_')
    if len(parts) >= 7:
        mac = ':'.join(parts[-6:])  # last 6 segments
        return mac.upper()
    return path
```

---

## 4. D-Bus Signals to Monitor

### 4.1 PropertiesChanged (on Device1)

**Signal:** `org.freedesktop.DBus.Properties.PropertiesChanged`
**Signature:** `(sa{sv}as)`
- `s` — interface name (e.g., "org.bluez.Device1")
- `a{sv}` — changed properties dict
- `as` — invalidated properties (list of property names whose values are now unknown)

This is the **primary signal** for tracking connection/pairing state changes.

**Key properties that change:**
- `Connected` — device connected/disconnected
- `Paired` — pairing completed
- `ServicesResolved` — BLE services discovered (important for BLE devices)

**Python registration:**

```python
def on_device_properties_changed(interface, changed, invalidated, path=None):
    if interface == 'org.bluez.Device1':
        if 'Connected' in changed:
            print(f"Device {path}: Connected = {changed['Connected']}")
        if 'Paired' in changed:
            print(f"Device {path}: Paired = {changed['Paired']}")
        if 'ServicesResolved' in changed:
            print(f"Device {path}: ServicesResolved = {changed['ServicesResolved']}")

bus.add_signal_receiver(
    on_device_properties_changed,
    signal_name='PropertiesChanged',
    dbus_interface='org.freedesktop.DBus.Properties',
    path='/org/bluez/hci0',  # Watch all children of adapter
    path_keyword='path'
)
```

### 4.2 InterfacesAdded (on ObjectManager)

**Signal:** `org.freedesktop.DBus.ObjectManager.InterfacesAdded`
**Signature:** `(oa{sa{sv}})`
- `o` — object path of the new object
- `a{sa{sv}}` — dict of interface_name → properties

Fires when a **new device appears** during discovery, or when BlueZ creates a new object.

**Python registration:**

```python
def on_interfaces_added(path, interfaces):
    if 'org.bluez.Device1' in interfaces:
        dev = interfaces['org.bluez.Device1']
        address = str(dev.get('Address', ''))
        name = str(dev.get('Name', 'Unknown'))
        print(f"Device appeared: {address} ({name})")

bus.add_signal_receiver(
    on_interfaces_added,
    signal_name='InterfacesAdded',
    dbus_interface='org.freedesktop.DBus.ObjectManager',
    path='/'
)
```

### 4.3 InterfacesRemoved (on ObjectManager)

**Signal:** `org.freedesktop.DBus.ObjectManager.InterfacesRemoved`
**Signature:** `(oas)`
- `o` — object path
- `as` — list of interface names that were removed

**Python registration:**

```python
def on_interfaces_removed(path, interfaces):
    print(f"Object removed: {path}")
    for iface in interfaces:
        print(f"  Interface: {iface}")

bus.add_signal_receiver(
    on_interfaces_removed,
    signal_name='InterfacesRemoved',
    dbus_interface='org.freedesktop.DBus.ObjectManager',
    path='/'
)
```

### 4.4 Adapter Signals

The `PropertiesChanged` signal also fires on the adapter for:
- `Powered` — adapter turned on/off
- `Discovering` — discovery started/stopped
- `Discoverable` — visibility changed
- `Pairable` — pairing accept state changed

```python
def on_adapter_properties_changed(interface, changed, invalidated, path=None):
    if interface == 'org.bluez.Adapter1':
        if 'Powered' in changed:
            print(f"Adapter powered: {changed['Powered']}")
        if 'Discovering' in changed:
            print(f"Discovery active: {changed['Discovering']}")

bus.add_signal_receiver(
    on_adapter_properties_changed,
    signal_name='PropertiesChanged',
    dbus_interface='org.freedesktop.DBus.Properties',
    path='/org/bluez/hci0'
)
```

---

## 5. Pairing Agent Implementation

### 5.1 Agent1 Interface Methods

The `org.bluez.Agent1` interface must be exported as a D-Bus object. BlueZ will call these methods during pairing:

| Method | Signature | Returns | Description |
|---|---|---|---|
| `Release()` | `()` | void | Agent released — clean up resources |
| `RequestPinCode(device)` | `(o)` | s (string) | Request PIN code from user |
| `RequestPasskey(device)` | `(o)` | u (uint32) | Request passkey from user |
| `DisplayPinCode(device, pincode)` | `(o, s)` | void | Display PIN code to user |
| `DisplayPasskey(device, passkey, entered)` | `(o, u, q)` | void | Display passkey to user |
| `RequestConfirmation(device, passkey)` | `(o, u)` | void | Request user to confirm passkey |
| `RequestAuthorization(device)` | `(o)` | void | Request user authorization |
| `AuthorizeService(device, uuid)` | `(o, s)` | void | Authorize a specific service |
| `Cancel()` | `()` | void | Cancel ongoing pairing operation |

### 5.2 Complete Auto-Accept Agent Implementation

```python
import dbus
import dbus.service
from dbus.mainloop.glib import DBusGMainLoop

# MUST be called before creating any bus connections
DBusGMainLoop(set_as_default=True)

AGENT_IFACE = 'org.bluez.Agent1'
AGENT_PATH = '/com/smarttv/bluez/agent'

class BluezAgent(dbus.service.Object):
    """Auto-accept pairing agent for Smart TV."""

    def __init__(self, bus_name):
        super().__init__(bus_name, AGENT_PATH)

    @dbus.service.method(AGENT_IFACE, in_signature='', out_signature='')
    def Release(self):
        """Called when agent is unregistered."""
        print("Agent: Released")

    @dbus.service.method(AGENT_IFACE, in_signature='o', out_signature='s')
    def RequestPinCode(self, device):
        """Request a PIN code. Return empty string for auto-accept."""
        print(f"Agent: RequestPinCode for {device}")
        return ""

    @dbus.service.method(AGENT_IFACE, in_signature='o', out_signature='u')
    def RequestPasskey(self, device):
        """Request a passkey. Return 0 for auto-accept."""
        print(f"Agent: RequestPasskey for {device}")
        return dbus.UInt32(0)

    @dbus.service.method(AGENT_IFACE, in_signature='os', out_signature='')
    def DisplayPinCode(self, device, pincode):
        """Display a PIN code to the user."""
        print(f"Agent: DisplayPinCode {pincode} for {device}")

    @dbus.service.method(AGENT_IFACE, in_signature='ouq', out_signature='')
    def DisplayPasskey(self, device, passkey, entered):
        """Display a passkey to the user."""
        print(f"Agent: DisplayPasskey {passkey:06d} (entered {entered}/6) for {device}")

    @dbus.service.method(AGENT_IFACE, in_signature='ou', out_signature='')
    def RequestConfirmation(self, device, passkey):
        """Request confirmation of passkey. Auto-accept."""
        print(f"Agent: RequestConfirmation passkey={passkey:06d} for {device}")

    @dbus.service.method(AGENT_IFACE, in_signature='o', out_signature='')
    def RequestAuthorization(self, device):
        """Request authorization. Auto-accept."""
        print(f"Agent: RequestAuthorization for {device}")

    @dbus.service.method(AGENT_IFACE, in_signature='os', out_signature='')
    def AuthorizeService(self, device, uuid):
        """Authorize a service. Auto-accept."""
        print(f"Agent: AuthorizeService {uuid} for {device}")

    @dbus.service.method(AGENT_IFACE, in_signature='', out_signature='')
    def Cancel(self):
        """Called when pairing is canceled."""
        print("Agent: Cancel")


def register_agent():
    """Register the agent with BlueZ."""
    bus = dbus.SystemBus()
    bus_name = dbus.service.BusName('com.smarttv.bluez', bus=bus)
    agent = BluezAgent(bus_name)

    agent_manager = dbus.Interface(
        bus.get_object('org.bluez', '/org/bluez'),
        'org.bluez.AgentManager1'
    )
    agent_manager.RegisterAgent(dbus.ObjectPath(AGENT_PATH), 'NoInputNoOutput')
    agent_manager.RequestDefaultAgent(dbus.ObjectPath(AGENT_PATH))

    print("Agent registered successfully")
    return agent, bus_name
```

### 5.3 Key Notes on Agent Implementation

1. **`DBusGMainLoop(set_as_default=True)` MUST be called before `dbus.SystemBus()`** — this is critical. If called after, signals will not work.

2. **The agent object must be exported on the SystemBus** — it needs a `dbus.service.BusName`.

3. **Capability `"NoInputNoOutput"`** is the simplest — BlueZ will auto-accept everything without user interaction. For a TV remote app, this is appropriate.

4. **If no agent is registered**, `Device1.Pair()` returns `org.bluez.Error.AlreadyExists` (BlueZ 5.82 behavior when no agent is set).

5. **The agent must stay alive** — keep a reference to the agent object and the bus name, otherwise Python's garbage collector will destroy them.

---

## 6. Workflow: Scan

### 6.1 Complete Scan Workflow

```
Step 1: Ensure adapter is powered on
Step 2: Set discovery filter (optional: BLE-only, etc.)
Step 3: Start discovery
Step 4: Wait and collect devices (via GetManagedObjects or InterfacesAdded)
Step 5: Stop discovery
Step 6: Return device list
```

### 6.2 Python Implementation

```python
import dbus
import time

def scan_devices(transport='auto', timeout=8, adapter_path='/org/bluez/hci0'):
    """
    Scan for Bluetooth devices.

    Args:
        transport: 'auto', 'le' (BLE only), or 'bredr' (Classic only)
        timeout: seconds to scan
        adapter_path: D-Bus path of the adapter

    Returns:
        List of dicts with device info
    """
    bus = dbus.SystemBus()

    # Step 1: Ensure adapter is powered
    adapter_proxy = bus.get_object('org.bluez', adapter_path)
    adapter_props = dbus.Interface(adapter_proxy, 'org.freedesktop.DBus.Properties')
    adapter_methods = dbus.Interface(adapter_proxy, 'org.bluez.Adapter1')

    powered = adapter_props.Get('org.bluez.Adapter1', 'Powered')
    if not powered:
        adapter_props.Set('org.bluez.Adapter1', 'Powered', dbus.Boolean(True))
        # Wait for power on
        for _ in range(10):
            time.sleep(0.5)
            if adapter_props.Get('org.bluez.Adapter1', 'Powered'):
                break

    # Step 2: Set discovery filter
    filter_dict = {
        'DuplicateData': dbus.Boolean(False, variant_level=1),
    }
    if transport != 'auto':
        filter_dict['Transport'] = dbus.String(transport, variant_level=1)
    adapter_methods.SetDiscoveryFilter(filter_dict)

    # Step 3: Start discovery
    adapter_methods.StartDiscovery()

    # Step 4: Wait and collect
    time.sleep(timeout)

    # Collect all devices from ObjectManager
    om = dbus.Interface(
        bus.get_object('org.bluez', '/'),
        'org.freedesktop.DBus.ObjectManager'
    )
    objects = om.GetManagedObjects()

    devices = []
    for path, interfaces in objects.items():
        if 'org.bluez.Device1' in interfaces:
            dev = interfaces['org.bluez.Device1']
            device_class = int(dev.get('Class', 0))
            devices.append({
                'mac': str(dev.get('Address', '')),
                'name': str(dev.get('Name', 'Unknown')),
                'alias': str(dev.get('Alias', '')),
                'class': device_class,
                'major_class': (device_class >> 8) & 0x1F,
                'icon': str(dev.get('Icon', '')),
                'rssi': int(dev.get('RSSI', 0)) if 'RSSI' in dev else None,
                'paired': bool(dev.get('Paired', False)),
                'connected': bool(dev.get('Connected', False)),
                'uuids': [str(u) for u in dev.get('UUIDs', [])],
                'path': path,
                'device_type': classify_device_type(dev),
            })

    # Step 5: Stop discovery
    try:
        adapter_methods.StopDiscovery()
    except dbus.exceptions.DBusException:
        pass  # Discovery may have already stopped

    # Clear filter
    try:
        adapter_methods.SetDiscoveryFilter({})
    except dbus.exceptions.DBusException:
        pass

    return devices


def classify_device_type(device_props):
    """Classify device as BLE, Classic, or Dual Mode based on UUIDs."""
    BLE_INDICATORS = {'00001800', '00001801', '0000180a', '0000180f', '0000180d'}
    CLASSIC_PROFILES = {'00001101', '0000110a', '0000110b', '0000110c',
                        '0000110e', '0000111e', '0000111f', '0000112f', '00001132'}

    has_classic = False
    has_ble = False

    for uuid in device_props.get('UUIDs', []):
        short = str(uuid)[:8].lower()
        if short in CLASSIC_PROFILES:
            has_classic = True
        if short in BLE_INDICATORS:
            has_ble = True

    # Also check AddressType for BLE devices
    if str(device_props.get('AddressType', '')) == 'random':
        has_ble = True

    # RSSI presence without Class value often indicates BLE
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
    """Decode Bluetooth device class integer to human-readable string."""
    MAJOR_NAMES = {
        0: 'Miscellaneous', 1: 'Computer', 2: 'Phone',
        3: 'LAN/Network AP', 4: 'Audio/Video', 5: 'Peripheral',
        6: 'Imaging', 7: 'Wearable', 8: 'Toy', 9: 'Health',
    }
    major = (class_val >> 8) & 0x1F
    return MAJOR_NAMES.get(major, f'Unknown ({major})')
```

### 6.3 BLE-Only Scan Variant

```python
def scan_ble_only(timeout=8):
    """Scan for BLE devices only."""
    return scan_devices(transport='le', timeout=timeout)
```

---

## 7. Workflow: Connect

### 7.1 Complete Connect Workflow

```
Step 1: Build device object path from MAC
Step 2: Verify device exists (check ObjectManager)
Step 3: If not paired → Pair()
Step 4: Trust the device
Step 5: Connect()
Step 6: Wait for Connected=True and ServicesResolved=True (for BLE)
```

### 7.2 Python Implementation

```python
import dbus
import time

def connect_device(mac, adapter_path='/org/bluez/hci0', timeout=15):
    """
    Connect to a Bluetooth device.

    Args:
        mac: MAC address string (e.g., "9B:FC:9A:4F:FD:A4")
        adapter_path: adapter D-Bus path
        timeout: max seconds to wait for connection

    Returns:
        dict with connection result

    Raises:
        dbus.exceptions.DBusException on failure
    """
    bus = dbus.SystemBus()
    device_path = mac_to_path(mac, adapter_path)

    # Step 1: Verify device exists
    om = dbus.Interface(
        bus.get_object('org.bluez', '/'),
        'org.freedesktop.DBus.ObjectManager'
    )
    objects = om.GetManagedObjects()

    if device_path not in objects:
        raise ValueError(f"Device {mac} not found. Is it paired?")

    if 'org.bluez.Device1' not in objects[device_path]:
        raise ValueError(f"Device {mac} does not have Device1 interface")

    # Step 2: Get device interface
    device_proxy = bus.get_object('org.bluez', device_path)
    device = dbus.Interface(device_proxy, 'org.bluez.Device1')
    props = dbus.Interface(device_proxy, 'org.freedesktop.DBus.Properties')

    # Step 3: Check if already connected
    if props.Get('org.bluez.Device1', 'Connected'):
        return {'status': 'already_connected', 'mac': mac}

    # Step 4: Pair if needed
    paired = props.Get('org.bluez.Device1', 'Paired')
    if not paired:
        try:
            device.Pair()
            # Wait for pairing to complete
            for _ in range(timeout * 2):
                time.sleep(0.5)
                if props.Get('org.bluez.Device1', 'Paired'):
                    break
                if not props.Get('org.bluez.Device1', 'Connected') and _ > 10:
                    # If not connected after 5 seconds and not pairing, check state
                    pass
        except dbus.exceptions.DBusException as e:
            if 'AlreadyExists' in str(e.get_dbus_name()):
                pass  # Already paired, continue
            else:
                raise

    # Step 5: Trust the device
    props.Set('org.bluez.Device1', 'Trusted', dbus.Boolean(True))

    # Step 6: Connect
    try:
        device.Connect()
    except dbus.exceptions.DBusException as e:
        if 'AlreadyConnected' in str(e.get_dbus_name()):
            pass  # Already connected
        else:
            raise

    # Step 7: Wait for connection to establish
    for _ in range(timeout * 2):
        time.sleep(0.5)
        if props.Get('org.bluez.Device1', 'Connected'):
            # For BLE, also wait for services to resolve
            is_ble = props.Get('org.bluez.Device1', 'AddressType') == 'random'
            if is_ble:
                if props.Get('org.bluez.Device1', 'ServicesResolved'):
                    return {'status': 'connected', 'mac': mac, 'services_resolved': True}
            else:
                return {'status': 'connected', 'mac': mac, 'services_resolved': False}

    # Timeout — check final state
    connected = props.Get('org.bluez.Device1', 'Connected')
    if connected:
        return {'status': 'connected', 'mac': mac}
    else:
        raise TimeoutError(f"Connection to {mac} timed out after {timeout}s")
```

---

## 8. Workflow: Status

### 8.1 Complete Status Workflow

```
Step 1: Get all managed objects
Step 2: Filter for Device1 interfaces
Step 3: Return paired devices with connection status
```

### 8.2 Python Implementation

```python
def get_paired_devices(adapter_path='/org/bluez/hci0'):
    """
    Get all paired devices with their connection status.

    Returns:
        List of dicts with device info
    """
    bus = dbus.SystemBus()
    om = dbus.Interface(
        bus.get_object('org.bluez', '/'),
        'org.freedesktop.DBus.ObjectManager'
    )
    objects = om.GetManagedObjects()

    paired_devices = []
    for path, interfaces in objects.items():
        if 'org.bluez.Device1' in interfaces:
            dev = interfaces['org.bluez.Device1']
            if dev.get('Paired', False):
                paired_devices.append({
                    'mac': str(dev.get('Address', '')),
                    'name': str(dev.get('Name', 'Unknown')),
                    'alias': str(dev.get('Alias', '')),
                    'connected': bool(dev.get('Connected', False)),
                    'paired': True,
                    'trusted': bool(dev.get('Trusted', False)),
                    'class': int(dev.get('Class', 0)),
                    'icon': str(dev.get('Icon', '')),
                    'uuids': [str(u) for u in dev.get('UUIDs', [])],
                    'path': path,
                    'device_type': classify_device_type(dev),
                })

    return paired_devices


def get_device_status(mac, adapter_path='/org/bluez/hci0'):
    """
    Get detailed status of a specific device.

    Returns:
        dict with device info, or None if not found
    """
    bus = dbus.SystemBus()
    device_path = mac_to_path(mac, adapter_path)

    om = dbus.Interface(
        bus.get_object('org.bluez', '/'),
        'org.freedesktop.DBus.ObjectManager'
    )
    objects = om.GetManagedObjects()

    if device_path in objects and 'org.bluez.Device1' in objects[device_path]:
        dev = objects[device_path]['org.bluez.Device1']
        return {
            'mac': str(dev.get('Address', '')),
            'name': str(dev.get('Name', 'Unknown')),
            'alias': str(dev.get('Alias', '')),
            'connected': bool(dev.get('Connected', False)),
            'paired': bool(dev.get('Paired', False)),
            'trusted': bool(dev.get('Trusted', False)),
            'services_resolved': bool(dev.get('ServicesResolved', False)),
            'class': int(dev.get('Class', 0)),
            'icon': str(dev.get('Icon', '')),
            'uuids': [str(u) for u in dev.get('UUIDs', [])],
            'path': device_path,
            'device_type': classify_device_type(dev),
        }
    return None
```

---

## 9. Workflow: Disconnect

### 9.1 Complete Disconnect Workflow

```
Step 1: Build device object path from MAC
Step 2: Verify device exists
Step 3: Call Disconnect()
Step 4: Wait for Connected=False
```

### 9.2 Python Implementation

```python
def disconnect_device(mac, adapter_path='/org/bluez/hci0', timeout=10):
    """
    Disconnect from a specific device.

    Args:
        mac: MAC address
        adapter_path: adapter D-Bus path
        timeout: seconds to wait

    Returns:
        dict with result
    """
    bus = dbus.SystemBus()
    device_path = mac_to_path(mac, adapter_path)

    # Verify device exists
    om = dbus.Interface(
        bus.get_object('org.bluez', '/'),
        'org.freedesktop.DBus.ObjectManager'
    )
    objects = om.GetManagedObjects()

    if device_path not in objects:
        raise ValueError(f"Device {mac} not found")

    device_proxy = bus.get_object('org.bluez', device_path)
    device = dbus.Interface(device_proxy, 'org.bluez.Device1')
    props = dbus.Interface(device_proxy, 'org.freedesktop.DBus.Properties')

    # Check if connected
    if not props.Get('org.bluez.Device1', 'Connected'):
        return {'status': 'already_disconnected', 'mac': mac}

    # Disconnect
    device.Disconnect()

    # Wait for disconnection
    for _ in range(timeout * 2):
        time.sleep(0.5)
        if not props.Get('org.bluez.Device1', 'Connected'):
            return {'status': 'disconnected', 'mac': mac}

    raise TimeoutError(f"Disconnection from {mac} timed out after {timeout}s")


def remove_device(mac, adapter_path='/org/bluez/hci0'):
    """
    Remove (unpair + forget) a device entirely.

    Args:
        mac: MAC address

    Returns:
        dict with result
    """
    bus = dbus.SystemBus()
    device_path = mac_to_path(mac, adapter_path)

    adapter = dbus.Interface(
        bus.get_object('org.bluez', adapter_path),
        'org.bluez.Adapter1'
    )

    adapter.RemoveDevice(dbus.ObjectPath(device_path))
    return {'status': 'removed', 'mac': mac}
```

---

## 10. Threading Model

### 10.1 Can `dbus.SystemBus()` be shared across Flask threads?

**YES — it is thread-safe.** Verified on this system with 5 concurrent threads all using `dbus.SystemBus()` to read adapter properties simultaneously. All succeeded without errors.

The underlying D-Bus connection is thread-safe by design in `dbus-python`. Each `dbus.SystemBus()` call returns the **same connection** (it is a singleton per process), so there is no resource waste.

**However**, for signal handling, there are important considerations.

### 10.2 Do we need `DBusGMainLoop`?

**YES — absolutely required if you need to receive signals.**

```python
from dbus.mainloop.glib import DBusGMainLoop
DBusGMainLoop(set_as_default=True)  # MUST be called FIRST
bus = dbus.SystemBus()
```

Without this, `add_signal_receiver()` will silently not work.

### 10.3 How to handle D-Bus signals in a Flask context

Flask runs its own WSGI server (or gunicorn), which does NOT run a GLib mainloop. D-Bus signals require a running mainloop to be delivered.

**Solution: Run the GLib mainloop in a background thread.**

```python
import threading
from gi.repository import GLib

def start_dbus_signal_loop():
    """Run GLib mainloop in a background thread for D-Bus signals."""
    loop = GLib.MainLoop()
    thread = threading.Thread(target=loop.run, daemon=True)
    thread.start()
    return loop

# At application startup:
# 1. Initialize D-Bus mainloop
DBusGMainLoop(set_as_default=True)
bus = dbus.SystemBus()

# 2. Register signal handlers
bus.add_signal_receiver(on_device_properties_changed, ...)

# 3. Start GLib mainloop in background thread
glib_loop = start_dbus_signal_loop()
```

**Alternative: Poll-based approach (no GLib mainloop needed)**

If you do not need real-time signal monitoring, you can poll:

```python
def poll_device_status(mac, adapter_path='/org/bluez/hci0'):
    """Poll device status without signals."""
    bus = dbus.SystemBus()
    device_path = mac_to_path(mac, adapter_path)
    proxy = bus.get_object('org.bluez', device_path)
    props = dbus.Interface(proxy, 'org.freedesktop.DBus.Properties')
    return {
        'connected': props.Get('org.bluez.Device1', 'Connected'),
        'paired': props.Get('org.bluez.Device1', 'Paired'),
    }
```

### 10.4 Recommended Architecture

```
┌─────────────────────────────────────────────┐
│              Flask Application               │
│  (runs in WSGI server, possibly multi-       │
│   threaded with gunicorn)                    │
│                                              │
│  Thread 1 (Flask request handler):           │
│    - bus = dbus.SystemBus()  (safe)          │
│    - Call D-Bus methods synchronously        │
│    - Return results to HTTP response         │
│                                              │
│  Thread 2 (GLib MainLoop daemon):            │
│    - GLib.MainLoop().run()                   │
│    - Receives D-Bus signals                  │
│    - Updates shared state (thread-safe dict) │
│                                              │
│  Shared State:                               │
│    - threading.Lock protected dict           │
│    - Updated by signal handler               │
│    - Read by Flask request handlers          │
└─────────────────────────────────────────────┘
```

### 10.5 Shared State Pattern

```python
import threading

class BluetoothState:
    """Thread-safe shared state for Bluetooth device info."""

    def __init__(self):
        self._lock = threading.Lock()
        self._devices = {}  # mac → {connected, paired, name, ...}

    def update_device(self, mac, **kwargs):
        with self._lock:
            if mac not in self._devices:
                self._devices[mac] = {}
            self._devices[mac].update(kwargs)

    def get_device(self, mac):
        with self._lock:
            return self._devices.get(mac, {}).copy()

    def get_all_devices(self):
        with self._lock:
            return {mac: info.copy() for mac, info in self._devices.items()}

# Global instance
bt_state = BluetoothState()
```

---

## 11. Error Handling

### 11.1 Complete Error Name Reference

#### BlueZ-Specific Errors (org.bluez.Error.*)

| Error Name | When It Occurs | How to Handle |
|---|---|---|
| `org.bluez.Error.Failed` | Generic failure (most common) | Check error message for details: "br-connection-page-timeout", "br-connection-profile-unavailable", etc. |
| `org.bluez.Error.InProgress` | Operation already in progress | Wait and retry |
| `org.bluez.Error.NotSupported` | Device/adapter doesn't support operation | Fallback or report to user |
| `org.bluez.Error.NotReady` | Adapter not ready (powering on) | Wait and retry |
| `org.bluez.Error.NotConnected` | Operation requires connection | Connect first |
| `org.bluez.Error.AlreadyConnected` | Trying to connect already-connected device | No-op, report success |
| `org.bluez.Error.AlreadyPaired` | Trying to pair already-paired device | No-op, continue with connect |
| `org.bluez.Error.NotPaired` | Operation requires pairing | Pair first |
| `org.bluez.Error.DoesNotExist` | Device/object not in BlueZ database | Verify MAC, may need discovery first |
| `org.bluez.Error.NotAuthorized` | Operation not authorized | Check agent registration |
| `org.bluez.Error.AuthFailed` | Authentication failed | Retry pairing, check PIN |
| `org.bluez.Error.AuthRejected` | Authentication rejected by device | Check device is in pairing mode |
| `org.bluez.Error.AuthCanceled` | User/agent canceled authentication | Report to user |
| `org.bluez.Error.ConnectionAttemptFailed` | Connection attempt failed | Retry, check device is nearby/on |
| `org.bluez.Error.InvalidArguments` | Bad method arguments | Fix arguments |
| `org.bluez.Error.InvalidLength` | Argument length mismatch | Fix argument length |
| `org.bluez.Error.MissingParameters` | Required parameters missing | Add missing parameters |
| `org.bluez.Error.NoResources` | No resources (too many connections) | Disconnect other devices first |

#### D-Bus Standard Errors (org.freedesktop.DBus.Error.*)

| Error Name | When It Occurs | How to Handle |
|---|---|---|
| `org.freedesktop.DBus.Error.InvalidArgs` | Invalid arguments or interface doesn't exist | Check interface/property names |
| `org.freedesktop.DBus.Error.UnknownObject` | Object path doesn't exist | Device not present, verify MAC path |
| `org.freedesktop.DBus.Error.UnknownInterface` | Interface doesn't exist on object | Wrong interface name |
| `org.freedesktop.DBus.Error.UnknownProperty` | Property doesn't exist | Wrong property name |
| `org.freedesktop.DBus.Error.PropertyReadOnly` | Trying to write read-only property | Remove the Set() call |
| `org.freedesktop.DBus.Error.ServiceUnknown` | org.bluez not running | Start bluetoothd |
| `org.freedesktop.DBus.Error.AccessDenied` | Permission denied | Check polkit rules, run as root or add user to bluetooth group |
| `org.freedesktop.DBus.Error.TimedOut` | Method call timed out | Retry with longer timeout |
| `org.freedesktop.DBus.Error.NoReply` | BlueZ didn't respond | BlueZ may be busy, retry |
| `org.freedesktop.DBus.Error.NotSupported` | Operation not supported | Not supported by this BlueZ version |

### 11.2 Common Error Messages (within org.bluez.Error.Failed)

| Message | Meaning |
|---|---|
| `br-connection-page-timeout` | Device didn't respond to connection request (out of range or off) |
| `br-connection-profile-unavailable` | Required profile not available on device |
| `br-connection-unknown` | Unknown connection error |
| `No discovery started` | Called StopDiscovery without active discovery |
| `Already Exists` | Pairing agent already registered, or device already exists |

### 11.3 Error Handling Pattern

```python
import dbus
from dbus.exceptions import DBusException

def safe_dbus_call(func, *args, **kwargs):
    """Wrap a D-Bus call with comprehensive error handling."""
    try:
        return func(*args, **kwargs)
    except DBusException as e:
        error_name = e.get_dbus_name()
        error_msg = e.get_dbus_message()

        if error_name == 'org.freedesktop.DBus.Error.UnknownObject':
            raise DeviceNotFoundError(f"Device not found: {error_msg}")
        elif error_name == 'org.freedesktop.DBus.Error.ServiceUnknown':
            raise BluetoothServiceError("Bluetooth service (bluetoothd) not running")
        elif error_name == 'org.freedesktop.DBus.Error.AccessDenied':
            raise PermissionError(f"Access denied: {error_msg}")
        elif error_name == 'org.bluez.Error.Failed':
            if 'page-timeout' in error_msg:
                raise ConnectionTimeoutError("Device unreachable (out of range or off)")
            elif 'profile-unavailable' in error_msg:
                raise ProfileError("Device profile not available")
            else:
                raise BluetoothError(f"Operation failed: {error_msg}")
        elif error_name == 'org.bluez.Error.AlreadyConnected':
            return None  # Already connected, treat as success
        elif error_name == 'org.bluez.Error.AlreadyPaired':
            return None  # Already paired, treat as success
        elif error_name == 'org.bluez.Error.DoesNotExist':
            raise DeviceNotFoundError(f"Device does not exist: {error_msg}")
        elif error_name == 'org.bluez.Error.NotReady':
            raise AdapterNotReadyError("Adapter is not ready")
        elif error_name == 'org.bluez.Error.ConnectionAttemptFailed':
            raise ConnectionTimeoutError("Connection attempt failed")
        else:
            raise BluetoothError(f"D-Bus error [{error_name}]: {error_msg}")


# Custom exceptions
class BluetoothError(Exception):
    """Base exception for Bluetooth operations."""
    pass

class DeviceNotFoundError(BluetoothError):
    """Device not found in BlueZ database."""
    pass

class ConnectionTimeoutError(BluetoothError):
    """Connection timed out or device unreachable."""
    pass

class BluetoothServiceError(BluetoothError):
    """Bluetooth service not available."""
    pass

class ProfileError(BluetoothError):
    """Bluetooth profile issue."""
    pass

class AdapterNotReadyError(BluetoothError):
    """Adapter is not powered or ready."""
    pass
```

---

## 12. Complete Working Python Module

### 12.1 Module Structure

```
bluetooth_manager.py      — Main module with all workflows
  ├── Helper functions (mac_to_path, classify_device, decode_class)
  ├── BluezAgent class (pairing agent)
  ├── BluetoothManager class
  │   ├── scan_devices()
  │   ├── connect_device()
  │   ├── disconnect_device()
  │   ├── get_paired_devices()
  │   ├── get_device_status()
  │   ├── remove_device()
  │   └── ensure_adapter_powered()
  └── Signal handling (optional, for real-time monitoring)
```

### 12.2 Full Module Implementation

```python
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
    """Base exception for Bluetooth operations."""
    pass

class DeviceNotFoundError(BluetoothError):
    pass

class ConnectionTimeoutError(BluetoothError):
    pass

class BluetoothServiceError(BluetoothError):
    pass

class AdapterNotReadyError(BluetoothError):
    pass


# ============================================================
# Helper Functions
# ============================================================

def mac_to_path(mac: str, adapter_path: str = DEFAULT_ADAPTER_PATH) -> str:
    """Convert MAC address to BlueZ D-Bus object path."""
    return f"{adapter_path}/dev_{mac.replace(':', '_')}"


def classify_device_type(device_props) -> str:
    """Classify device as 'ble', 'classic', 'dual', or 'unknown'."""
    BLE_INDICATORS = {'00001800', '00001801', '0000180a', '0000180f', '0000180d'}
    CLASSIC_PROFILES = {'00001101', '0000110a', '0000110b', '0000110c',
                        '0000110e', '0000111e', '0000111f', '0000112f', '00001132'}
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


def decode_device_class(class_val: int) -> str:
    """Decode Bluetooth CoD to human-readable major class name."""
    MAJOR_NAMES = {
        0: 'Miscellaneous', 1: 'Computer', 2: 'Phone',
        3: 'LAN/Network AP', 4: 'Audio/Video', 5: 'Peripheral',
        6: 'Imaging', 7: 'Wearable', 8: 'Toy', 9: 'Health',
    }
    major = (class_val >> 8) & 0x1F
    return MAJOR_NAMES.get(major, f'Unknown ({major})')


def _parse_device(device_path, device_props) -> dict:
    """Parse device properties into a clean dict."""
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
    """
    Auto-accept pairing agent.

    Uses 'NoInputNoOutput' capability — BlueZ will auto-accept
    all pairing requests without user interaction.
    """

    def __init__(self, bus_name):
        super().__init__(bus_name, AGENT_PATH)
        self._registered = False

    @dbus.service.method(AGENT_IFACE, in_signature='', out_signature='')
    def Release(self):
        logger.info("Agent: Released")
        self._registered = False

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
    """
    High-level Bluetooth management using BlueZ D-Bus API.

    Usage:
        mgr = BluetoothManager()
        devices = mgr.scan()
        mgr.connect("AA:BB:CC:DD:EE:FF")
        status = mgr.status()
        mgr.disconnect("AA:BB:CC:DD:EE:FF")
    """

    def __init__(self, adapter_path: str = DEFAULT_ADAPTER_PATH, register_agent: bool = True):
        self.bus = dbus.SystemBus()
        self.adapter_path = adapter_path
        self._agent = None
        self._bus_name = None
        self._lock = threading.Lock()

        if register_agent:
            self._setup_agent()

    def _setup_agent(self):
        """Register the pairing agent with BlueZ."""
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
            self._agent._registered = True
            logger.info("Pairing agent registered")
        except dbus.exceptions.DBusException as e:
            logger.warning(f"Agent registration failed: {e.get_dbus_name()}: {e.get_dbus_message()}")

    def _get_adapter(self):
        """Get adapter interface tuple (methods, props)."""
        proxy = self.bus.get_object(BLUEZ_BUS, self.adapter_path)
        methods = dbus.Interface(proxy, ADAPTER_IFACE)
        props = dbus.Interface(proxy, PROPERTIES_IFACE)
        return methods, props

    def _get_device(self, device_path):
        """Get device interface tuple (methods, props)."""
        proxy = self.bus.get_object(BLUEZ_BUS, device_path)
        methods = dbus.Interface(proxy, DEVICE_IFACE)
        props = dbus.Interface(proxy, PROPERTIES_IFACE)
        return methods, props

    def _get_all_objects(self):
        """Get all managed objects from BlueZ."""
        om = dbus.Interface(
            self.bus.get_object(BLUEZ_BUS, '/'),
            OBJECT_MANAGER_IFACE
        )
        return om.GetManagedObjects()

    def _find_device_path(self, mac: str) -> str:
        """Find device path by MAC, or raise DeviceNotFoundError."""
        path = mac_to_path(mac, self.adapter_path)
        objects = self._get_all_objects()
        if path in objects and DEVICE_IFACE in objects[path]:
            return path
        raise DeviceNotFoundError(f"Device {mac} not found. Is it paired/in range?")

    def ensure_adapter_powered(self) -> bool:
        """Ensure adapter is powered on. Returns True if powered."""
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
    def scan(self, transport: str = 'auto', timeout: int = 8,
             filter_uuids: list = None) -> list:
        """
        Scan for Bluetooth devices.

        Args:
            transport: 'auto', 'le', or 'bredr'
            timeout: seconds to scan
            filter_uuids: optional list of UUIDs to filter by

        Returns:
            List of device dicts
        """
        with self._lock:
            self.ensure_adapter_powered()
            methods, props = self._get_adapter()

            # Set discovery filter
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

            # Start discovery
            methods.StartDiscovery()

            # Wait
            time.sleep(timeout)

            # Collect devices
            objects = self._get_all_objects()
            devices = []
            for path, interfaces in objects.items():
                if DEVICE_IFACE in interfaces:
                    devices.append(_parse_device(path, interfaces[DEVICE_IFACE]))

            # Stop discovery
            try:
                methods.StopDiscovery()
            except dbus.exceptions.DBusException:
                pass

            # Clear filter
            try:
                methods.SetDiscoveryFilter({})
            except dbus.exceptions.DBusException:
                pass

            return devices

    # --------------------------------------------------------
    # CONNECT
    # --------------------------------------------------------
    def connect(self, mac: str, timeout: int = 15) -> dict:
        """
        Connect to a Bluetooth device (pair + trust + connect).

        Args:
            mac: MAC address
            timeout: max seconds

        Returns:
            Result dict
        """
        with self._lock:
            self.ensure_adapter_powered()
            device_path = self._find_device_path(mac)
            dev, props = self._get_device(device_path)

            # Already connected?
            if props.Get(DEVICE_IFACE, 'Connected'):
                return {'status': 'already_connected', 'mac': mac}

            # Pair if needed
            if not props.Get(DEVICE_IFACE, 'Paired'):
                try:
                    dev.Pair()
                except dbus.exceptions.DBusException as e:
                    if 'AlreadyExists' not in e.get_dbus_name():
                        raise

                # Wait for pairing
                for _ in range(timeout * 2):
                    time.sleep(0.5)
                    if props.Get(DEVICE_IFACE, 'Paired'):
                        break

            # Trust
            props.Set(DEVICE_IFACE, 'Trusted', dbus.Boolean(True))

            # Connect
            try:
                dev.Connect()
            except dbus.exceptions.DBusException as e:
                if 'AlreadyConnected' not in e.get_dbus_name():
                    raise

            # Wait for connected
            for _ in range(timeout * 2):
                time.sleep(0.5)
                if props.Get(DEVICE_IFACE, 'Connected'):
                    return {'status': 'connected', 'mac': mac}

            raise ConnectionTimeoutError(f"Connection to {mac} timed out")

    # --------------------------------------------------------
    # DISCONNECT
    # --------------------------------------------------------
    def disconnect(self, mac: str, timeout: int = 10) -> dict:
        """Disconnect from a device."""
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
    def status(self, mac: str = None) -> list | dict | None:
        """
        Get device status.

        Args:
            mac: specific MAC, or None for all paired devices

        Returns:
            Device dict, list of device dicts, or None
        """
        objects = self._get_all_objects()

        if mac:
            path = mac_to_path(mac, self.adapter_path)
            if path in objects and DEVICE_IFACE in objects[path]:
                return _parse_device(path, objects[path][DEVICE_IFACE])
            return None

        # Return all paired devices
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
    def remove(self, mac: str) -> dict:
        """Remove (unpair + forget) a device."""
        with self._lock:
            device_path = self._find_device_path(mac)
            methods, _ = self._get_adapter()
            methods.RemoveDevice(dbus.ObjectPath(device_path))
            return {'status': 'removed', 'mac': mac}
```

### 12.3 Usage Examples

```python
# Initialize
mgr = BluetoothManager()

# Scan
devices = mgr.scan(transport='auto', timeout=10)
for d in devices:
    print(f"{d['mac']} - {d['name']} ({d['device_type']}) - {d['class_name']}")

# Connect
result = mgr.connect("9B:FC:9A:4F:FD:A4")
print(result)

# Status
all_paired = mgr.status()
for d in all_paired:
    print(f"{d['mac']} - {d['name']} - Connected: {d['connected']}")

# Single device status
info = mgr.status("9B:FC:9A:4F:FD:A4")
print(info)

# Disconnect
mgr.disconnect("9B:FC:9A:4F:FD:A4")

# Remove (unpair)
mgr.remove("9B:FC:9A:4F:FD:A4")
```

---

## 13. Gotchas and Version-Specific Issues

### 13.1 Critical Gotchas

1. **`DBusGMainLoop` MUST be set before `dbus.SystemBus()`** — If you create a bus connection first, then set the mainloop, signals will silently not be delivered. The correct order is:
   ```python
   DBusGMainLoop(set_as_default=True)  # FIRST
   bus = dbus.SystemBus()              # THEN
   ```

2. **Discovery filter must be cleared** — After calling `StopDiscovery()`, call `SetDiscoveryFilter({})` with an empty dict. Otherwise, the next scan may behave unexpectedly.

3. **`StopDiscovery()` fails if discovery was not started** — BlueZ 5.82 returns `org.bluez.Error.Failed: No discovery started` if you call `StopDiscovery()` when discovery is not active. Always wrap in try/except.

4. **Pairing requires an agent** — Without registering an agent, `Device1.Pair()` returns `org.bluez.Error.AlreadyExists` (not a clear error message). Always register an agent first.

5. **BLE devices need `ServicesResolved`** — For BLE devices, `Connected=True` is not enough. You must also wait for `ServicesResolved=True` before the device's GATT services are available.

6. **Device path encoding** — MAC `9B:FC:9A:4F:FD:A4` becomes path `.../dev_9B_FC_9A_4F_FD_A4`. The colons are replaced with underscores, and the path uses uppercase hex.

7. **ObjectManager `GetManagedObjects()` returns ALL objects** — This includes the adapter itself, the agent, and all devices. Filter for `org.bluez.Device1` interface to get only devices.

8. **The agent object must be kept alive** — If Python garbage-collects the agent object, BlueZ will call `Release()` and the agent stops working. Keep a reference in your class/module.

9. **Adapter `Pairable` defaults to False on this system** — The adapter's `Pairable` property is False by default. You may need to set it to True before pairing:
   ```python
   props.Set('org.bluez.Adapter1', 'Pairable', dbus.Boolean(True))
   ```

10. **Discovery filter Transport values are case-sensitive** — Must be lowercase: `"le"`, `"bredr"`, `"auto"`.

### 13.2 BlueZ 5.82 Specific Notes

- **`Connectable` property** on Adapter1 — This is a newer property (BlueZ 5.72+) that controls whether the adapter is connectable. Default is `false` on this system.
- **`Sets` property** on Device1 — Device sets feature added in BlueZ 5.66, allows grouping devices.
- **`ExperimentalFeatures`** on Adapter1 — Lists enabled experimental features.
- **`SupportedSecondaryChannels`** on LEAdvertisingManager1 — For extended advertising.
- **`LegacyPairing`** on Device1 — Indicates if the device used legacy (PIN code) pairing vs Secure Simple Pairing.

### 13.3 Python 3.13 Compatibility

- `dbus-python` 1.4.0 works correctly with Python 3.13.5 on Debian 13.
- `GLib` from `gi.repository` works correctly with Python 3.13.
- All D-Bus types (dbus.String, dbus.Array, dbus.Boolean, etc.) work correctly.
- Thread safety verified with 5 concurrent threads.

### 13.4 Permission Requirements

For non-root users, BlueZ operations require either:
- User in the `bluetooth` group: `sudo usermod -aG bluetooth $USER`
- Or polkit rules allowing the user to manage Bluetooth

If you get `org.freedesktop.DBus.Error.AccessDenied`, check permissions.

---

## 14. References

### On This System (Verified)
- BlueZ 5.82 API introspection: `busctl introspect org.bluez /org/bluez/hci0`
- Object tree: `busctl tree org.bluez`
- Python dbus-python 1.4.0 tutorial: https://dbus.freedesktop.org/doc/dbus-python/tutorial.html

### BlueZ Documentation
- BlueZ source docs: `bluez.git/doc/adapter-api.txt`, `device-api.txt`, `agent-api.txt`, `manager-api.txt`
- BlueZ D-Bus API: https://www.kernel.org/doc/html/latest/subsystem-apis.html

### Python Libraries
- dbus-python (installed): https://pypi.org/project/dbus-python/
- pydbus (NOT installed, do not use): https://pypi.org/project/pydbus/

### Working Example Projects (for reference)
- https://github.com/nickoala/nickoala.github.io — Bluetooth pairing tutorial
- https://github.com/LEW21/pydbus — pydbus library (not installed on this system)
- https://github.com/nickoala/python-bluez-examples — Python BlueZ examples

---

*Generated: 2026-06-20 | System: Debian 13.5 (Trixie) / BlueZ 5.82 / Python 3.13.5*
*All code examples and API details verified against the live system.*
