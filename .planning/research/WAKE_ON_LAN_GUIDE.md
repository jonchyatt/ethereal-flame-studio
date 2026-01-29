# Wake-on-LAN (WoL) Setup Guide for Multi-Machine Render Farm

**Phase:** 4 (Automation)
**Related Plans:** 04-10 through 04-14
**Created:** 2026-01-28
**Status:** Research Complete

---

## Table of Contents

1. [Overview](#overview)
2. [Hardware Requirements](#hardware-requirements)
3. [BIOS/UEFI Setup](#biosuefi-setup)
4. [Windows 10/11 Configuration](#windows-1011-configuration)
5. [Triggering WoL](#triggering-wol)
   - [Command Line](#command-line-tools)
   - [n8n Workflow](#n8n-workflow-integration)
   - [Mobile Apps](#mobile-apps)
6. [WoL Over Internet](#wol-over-internet)
7. [Node.js Libraries](#nodejs-libraries)
8. [Render Farm Integration Pattern](#render-farm-integration-pattern)
9. [Fallback Strategies](#fallback-strategies)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Wake-on-LAN (WoL) is a network standard that allows you to remotely power on a device that is powered off or in a low-power state. It works by sending a "magic packet" to the device's network interface card (NIC). This packet contains the device's unique MAC address and, when received, instructs the hardware to power up the system.

### How It Works

1. When a computer is shut down (but still connected to power), the NIC remains powered in a low-energy state
2. A "magic packet" is broadcast over the network containing the target MAC address
3. The NIC recognizes its own MAC address in the packet
4. The NIC signals the motherboard to power on the system

### Limitations

- **Wired Ethernet required**: Most Wi-Fi adapters do not support WoL (some support Wake-on-Wireless/WoWLAN)
- **Same subnet**: WoL magic packets are broadcast packets that don't cross routers by default
- **Power required**: The computer must be connected to AC power (not battery)
- **Proper shutdown**: The PC must have been shut down cleanly

---

## Hardware Requirements

### Network Interface Card (NIC)

- Must support Wake-on-LAN functionality
- Must be connected via **wired Ethernet** (not Wi-Fi)
- Most modern Intel, Realtek, and Broadcom NICs support WoL
- Verify support in Device Manager > Network Adapters > Properties > Advanced tab

### Motherboard

- Must support WoL/PME (Power Management Events)
- Most motherboards manufactured after 2010 support WoL
- Some older boards require a physical WoL cable connecting NIC to motherboard

### Power Supply

- Computer must remain connected to AC power
- WoL does not work when running on battery power

---

## BIOS/UEFI Setup

The first step is enabling Wake-on-LAN in your computer's BIOS/UEFI firmware.

### Accessing BIOS

1. Restart your computer
2. Press the BIOS key during boot (commonly: `F2`, `F10`, `Del`, or `Esc`)
3. Navigate to **Advanced** or **Power Management** section

### Required Settings

| Setting | Required Value | Notes |
|---------|---------------|-------|
| Wake on LAN | **Enabled** | May be labeled "WoL", "Wake on PCI-E", "Power On by PCI-E/PCI", or "PME" |
| ERP/ErP Mode | **Disabled** | Energy-Related Products mode cuts power to NIC when off |
| EuP 2013 | **Disabled** | Similar to ErP |
| Deep Sleep | **Disabled** | Prevents NIC from maintaining power |
| Wake on LAN from S4/S5 | **Enabled** | Allows wake from hibernate/shutdown states |

### BIOS Screenshots by Manufacturer

**ASUS**: Power > APM Configuration > Power On By PCI-E > Enabled

**MSI**: Settings > Advanced > Wake Up Event Setup > Resume By PCI-E Device > Enabled

**Gigabyte**: Power > Wake on LAN > Enabled

**Dell**: Power Management > Wake on LAN > LAN with PXE Boot or LAN Only

**HP**: Advanced > Boot Options > Wake on LAN > Enabled

---

## Windows 10/11 Configuration

### Step 1: Configure Network Adapter

1. Open **Device Manager** (right-click Start > Device Manager)
2. Expand **Network adapters**
3. Right-click your Ethernet adapter > **Properties**

#### Power Management Tab

Enable all of these:
- [x] Allow the computer to turn off this device to save power
- [x] Allow this device to wake the computer
- [x] Only allow a magic packet to wake the computer

#### Advanced Tab

Find and configure these settings:

| Property | Value |
|----------|-------|
| Wake on Magic Packet | **Enabled** |
| Wake on Pattern Match | **Enabled** |
| Shutdown Wake-On-Lan | **Enabled** |
| WOL & Shutdown Link Speed | **10 Mbps First** |
| Energy Efficient Ethernet | **Disabled** (if present) |

### Step 2: Disable Fast Startup (Critical!)

Windows Fast Startup puts the system into a hybrid shutdown state (S4) that prevents WoL from working in most cases.

1. Open **Control Panel** > **Hardware and Sound** > **Power Options**
2. Click **Choose what the power buttons do**
3. Click **Change settings that are currently unavailable**
4. **Uncheck**: Turn on fast startup (recommended)
5. Click **Save changes**

### Step 3: Note Your MAC Address

You'll need the MAC address to send magic packets.

**Method 1: Settings App**
1. Settings > Network & Internet > Ethernet
2. Click your connection name
3. Scroll down to find **Physical address (MAC)**

**Method 2: Command Prompt**
```cmd
ipconfig /all
```
Look for "Physical Address" under your Ethernet adapter.

**Method 3: PowerShell**
```powershell
Get-NetAdapter | Select-Object Name, MacAddress
```

### Step 4: Set Static IP (Recommended)

To ensure the router always knows where to send packets:

1. Settings > Network & Internet > Ethernet > IP assignment > Edit
2. Set to **Manual**
3. Configure IPv4 with a static IP (e.g., 192.168.1.100)

---

## Triggering WoL

### Command Line Tools

#### WOL.EXE (Gammadyne) - Recommended for Windows

Download from: https://www.gammadyne.com/wol.htm

```cmd
wol.exe AA-BB-CC-DD-EE-FF
wol.exe AA-BB-CC-DD-EE-FF 192.168.1.255 9
wol.exe AA-BB-CC-DD-EE-FF /pwd secretpassword
```

#### WOLCMD (Depicus)

Download from: https://www.depicus.com/wake-on-lan/wake-on-lan-cmd

```cmd
wolcmd AA:BB:CC:DD:EE:FF 192.168.1.255 255.255.255.0 9
```

#### WOL (GitHub - ynlamy)

Download from: https://github.com/ynlamy/wol

```cmd
wol.exe AA:BB:CC:DD:EE:FF
wol.exe AA:BB:CC:DD:EE:FF -i 192.168.1.255 -p 9
wol.exe -f machines.txt
```

#### PowerShell Script

```powershell
function Send-WoL {
    param([string]$MacAddress)

    $mac = [byte[]]($MacAddress -replace '[:-]' -split '(..)' | Where-Object { $_ } | ForEach-Object { [convert]::ToByte($_, 16) })
    $packet = [byte[]](,0xFF * 6) + ($mac * 16)

    $udpClient = New-Object System.Net.Sockets.UdpClient
    $udpClient.Connect([System.Net.IPAddress]::Broadcast, 9)
    $udpClient.Send($packet, $packet.Length) | Out-Null
    $udpClient.Close()
}

Send-WoL -MacAddress "AA:BB:CC:DD:EE:FF"
```

### n8n Workflow Integration

Since n8n doesn't have a built-in WoL node, use the **Code Node** with a Node.js library.

#### Prerequisites (Self-hosted n8n)

Install the `wake_on_lan` package in your n8n environment:

```bash
# In your n8n Docker container or server
npm install -g wake_on_lan
```

#### n8n Code Node

```javascript
// Code Node - Send Wake-on-LAN packet
const wol = require('wake_on_lan');

const macAddress = $input.first().json.macAddress;
const broadcastAddress = $input.first().json.broadcastAddress || '255.255.255.255';

return new Promise((resolve, reject) => {
  wol.wake(macAddress, { address: broadcastAddress }, (err) => {
    if (err) {
      reject(new Error(`WoL failed: ${err.message}`));
    } else {
      resolve([{ json: { success: true, macAddress, timestamp: new Date().toISOString() } }]);
    }
  });
});
```

#### Alternative: Execute Command Node

If you can't install npm packages, use the **Execute Command** node:

```bash
# Using wol.exe installed on the n8n server
wol.exe {{ $json.macAddress }}
```

### Mobile Apps

#### iOS

| App | Features |
|-----|----------|
| **[Mocha WOL](https://apps.apple.com/us/app/mocha-wol/id422625778)** | Simple, reliable, stores 30 configs, ping support |
| **[Wake Me Up](https://apps.apple.com/us/app/wake-me-up-wake-on-lan/id1465416032)** | Widgets, Siri integration, Apple Watch support |
| **[Wolow](https://wolow.site/)** | Cross-platform, shutdown/reboot commands |

#### Android

| App | Features |
|-----|----------|
| **[Wake On Lan (Mr. Webb)](https://play.google.com/store/apps/details?id=co.uk.mrwebb.wakeonlan)** | Clean interface, widgets, Tasker integration, network scan |
| **[WolOn](https://wolon.app/)** | Device status monitoring, SSH commands, widgets |
| **[Wolow](https://wolow.site/)** | Cross-platform, shutdown support |

---

## WoL Over Internet

WoL magic packets are **broadcast packets** that don't cross router boundaries. To wake machines remotely over the internet, you need a relay device or special configuration.

### The Challenge

> "There is no way to do this natively with Cloudflare Tunnel. You'll have to run the WOL utility on another internal host that's on the same LAN as the target to be woken up."

### Solution 1: Raspberry Pi Relay (Recommended)

Use a low-power device (Raspberry Pi, old laptop) as a WoL relay:

```
Internet → Cloudflare Tunnel → Raspberry Pi → Magic Packet → Target PC
```

**Setup:**

1. Set up Raspberry Pi on same LAN as target machines
2. Install `etherwake` or `wakeonlan`:
   ```bash
   sudo apt install etherwake wakeonlan
   ```
3. Create a simple API server (Express/Fastify) that accepts WoL requests
4. Expose via Cloudflare Tunnel with Access policies
5. Send authenticated requests to wake machines

**Example Express server:**

```javascript
const express = require('express');
const wol = require('wake_on_lan');

const app = express();
app.use(express.json());

// Verify API key or use Cloudflare Access JWT
app.post('/wake/:machine', async (req, res) => {
  const machines = {
    'desktop': 'AA:BB:CC:DD:EE:FF',
    'laptop': '11:22:33:44:55:66'
  };

  const mac = machines[req.params.machine];
  if (!mac) return res.status(404).json({ error: 'Unknown machine' });

  wol.wake(mac, { address: '192.168.1.255' }, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, machine: req.params.machine });
  });
});

app.listen(3030);
```

### Solution 2: UpSnap (Self-Hosted App)

[UpSnap](https://github.com/seriousm4x/UpSnap) is a self-hosted Wake-on-LAN web app with REST API.

**Features:**
- Web dashboard for device management
- REST API for automation
- Scheduled wake/shutdown via cron
- Device status monitoring (ping)
- User permissions per device
- Docker support (amd64, arm64, arm/v7)

**API Endpoints:**
```
GET /api/upsnap/wake/:id         # Wake device
GET /api/upsnap/sleep/:id        # Sleep device
GET /api/upsnap/shutdown/:id     # Shutdown device
GET /api/upsnap/scan             # Scan network
```

**Docker Compose:**
```yaml
services:
  upsnap:
    image: ghcr.io/seriousm4x/upsnap:latest
    container_name: upsnap
    network_mode: host  # Required for WoL
    restart: unless-stopped
    volumes:
      - ./data:/app/pb_data
```

**Security Warning**: UpSnap's shutdown command executes shell commands. Never expose directly to internet without authentication (Cloudflare Access, VPN, etc.)

### Solution 3: Wake Anywhere (Cloudflare-Native)

[Wake Anywhere](https://github.com/jottocraft/wake-anywhere) integrates with Cloudflare:
- Dashboard secured by Cloudflare Access
- Device list stored in Cloudflare KV
- Controller runs on any Node.js device via Cloudflare Tunnel

### Solution 4: Router Port Forwarding (Less Secure)

If your router supports it, forward UDP port 9 to a broadcast address:

1. Set static IP for target PC (e.g., 192.168.1.100)
2. Create static ARP entry: `arp -s 192.168.1.100 AA:BB:CC:DD:EE:FF`
3. Forward UDP port 9 to 192.168.1.100 (or broadcast 192.168.1.255)
4. Send magic packet to your public IP

**Note**: This is less secure and many routers don't support forwarding to broadcast addresses.

---

## Node.js Libraries

### wake_on_lan (Most Popular)

**Install:**
```bash
npm install wake_on_lan
```

**Usage:**
```javascript
const wol = require('wake_on_lan');

// Simple wake
wol.wake('AA:BB:CC:DD:EE:FF');

// With callback
wol.wake('AA:BB:CC:DD:EE:FF', (err) => {
  if (err) console.error('WoL failed:', err);
  else console.log('Magic packet sent!');
});

// With options (required on Windows)
wol.wake('AA:BB:CC:DD:EE:FF', {
  address: '192.168.1.255',  // Broadcast address
  port: 9,                    // Default UDP port
  num_packets: 3,             // Number of packets to send
  interval: 100               // Ms between packets
}, callback);

// Create magic packet buffer
const packet = wol.createMagicPacket('AA:BB:CC:DD:EE:FF');
```

**MAC Address Formats:**
- `AA:BB:CC:DD:EE:FF`
- `AA-BB-CC-DD-EE-FF`
- `AABBCCDDEEFF`

**TypeScript:** `npm install @types/wake_on_lan`

### wol (Alternative)

```bash
npm install wol
```

```javascript
const wol = require('wol');

wol.wake('AA:BB:CC:DD:EE:FF', (err, res) => {
  console.log(res); // Magic packet sent
});
```

### wakeonlan (Promise-based)

```bash
npm install wakeonlan
```

```javascript
const wakeonlan = require('wakeonlan');

await wakeonlan('AA:BB:CC:DD:EE:FF');
await wakeonlan('AA:BB:CC:DD:EE:FF', { address: '192.168.1.255' });
```

---

## Render Farm Integration Pattern

### Complete Workflow

```
┌──────────────────────────────────────────────────────────────────┐
│                     RENDER JOB REQUEST                           │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 1: Check if machine is online                              │
│  ─────────────────────────────────────────────────────────────── │
│  GET https://render-desktop.yourdomain.com/api/health            │
│  Timeout: 5 seconds                                              │
│                                                                  │
│  Response 200?  ──YES──▶  Machine is ONLINE → Skip to Step 4     │
│       │                                                          │
│      NO (timeout/error)                                          │
│       │                                                          │
│       ▼                                                          │
│  Machine is OFFLINE                                              │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 2: Send Wake-on-LAN packet                                 │
│  ─────────────────────────────────────────────────────────────── │
│  POST https://wol-relay.yourdomain.com/wake/desktop              │
│  (Or use local WoL if n8n is on same LAN)                        │
│                                                                  │
│  wol.wake(macAddress, { address: '192.168.1.255' })              │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 3: Wait for machine to boot                                │
│  ─────────────────────────────────────────────────────────────── │
│  Poll health endpoint every 10 seconds                           │
│  Max attempts: 18 (3 minutes total)                              │
│                                                                  │
│  for (let i = 0; i < 18; i++) {                                  │
│    await sleep(10000);                                           │
│    if (await checkHealth(machine)) break;                        │
│  }                                                               │
│                                                                  │
│  Still offline after 3 min? → FAIL with error                    │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 4: Submit render job                                       │
│  ─────────────────────────────────────────────────────────────── │
│  POST https://render-desktop.yourdomain.com/api/render           │
│  Body: { audioFile, template, format }                           │
│                                                                  │
│  Return job ID to caller                                         │
└──────────────────────────────────────────────────────────────────┘
```

### n8n Workflow Implementation

```javascript
// Code Node: Wake Machine If Needed

const machineName = $input.first().json.machine;
const machines = {
  desktop: {
    tunnelUrl: 'https://render-desktop.yourdomain.com',
    mac: 'AA:BB:CC:DD:EE:FF',
    broadcastAddress: '192.168.1.255'
  },
  laptop: {
    tunnelUrl: 'https://render-laptop.yourdomain.com',
    mac: '11:22:33:44:55:66',
    broadcastAddress: '192.168.1.255'
  }
};

const machine = machines[machineName];
if (!machine) throw new Error(`Unknown machine: ${machineName}`);

// Step 1: Check if online
async function checkHealth(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${url}/api/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

let isOnline = await checkHealth(machine.tunnelUrl);

if (!isOnline) {
  // Step 2: Send WoL
  const wol = require('wake_on_lan');
  await new Promise((resolve, reject) => {
    wol.wake(machine.mac, { address: machine.broadcastAddress }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Step 3: Wait for boot
  const maxAttempts = 18;
  const pollInterval = 10000;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, pollInterval));
    if (await checkHealth(machine.tunnelUrl)) {
      isOnline = true;
      break;
    }
  }

  if (!isOnline) {
    throw new Error(`Machine ${machineName} did not come online after WoL`);
  }
}

return [{ json: {
  ...machine,
  machineName,
  status: 'online',
  readyForJob: true
}}];
```

### Machine Registry Schema (Extended)

```json
{
  "machines": [
    {
      "id": "desktop",
      "name": "Desktop (RTX 4090)",
      "tunnelUrl": "https://render-desktop.yourdomain.com",
      "healthEndpoint": "/api/health",
      "wol": {
        "enabled": true,
        "mac": "AA:BB:CC:DD:EE:FF",
        "broadcastAddress": "192.168.1.255",
        "port": 9,
        "bootTimeSeconds": 60
      },
      "capabilities": {
        "gpu": "RTX 4090",
        "vram": 24
      }
    },
    {
      "id": "laptop",
      "name": "Laptop (RTX 3070)",
      "tunnelUrl": "https://render-laptop.yourdomain.com",
      "healthEndpoint": "/api/health",
      "wol": {
        "enabled": true,
        "mac": "11:22:33:44:55:66",
        "broadcastAddress": "192.168.1.255",
        "port": 9,
        "bootTimeSeconds": 45
      },
      "capabilities": {
        "gpu": "RTX 3070",
        "vram": 8
      }
    }
  ]
}
```

---

## Fallback Strategies

### Strategy 1: Alternative Machine

If the primary machine doesn't wake, try another:

```javascript
const machinePreference = ['desktop', 'laptop', 'other'];

for (const machineName of machinePreference) {
  const machine = machines[machineName];

  // Try to wake and use this machine
  const result = await tryWakeAndCheck(machine);
  if (result.online) {
    return { machine: machineName, url: machine.tunnelUrl };
  }
}

throw new Error('No machines available');
```

### Strategy 2: Queue and Retry

If no machines are available, queue the job for later:

```javascript
if (!anyMachineOnline) {
  // Save job to database with status 'pending_machine'
  await saveJob({
    ...jobDetails,
    status: 'pending_machine',
    retryAt: Date.now() + 30 * 60 * 1000  // Retry in 30 min
  });

  return { queued: true, message: 'No machines available. Job queued for retry.' };
}
```

### Strategy 3: Scheduled Batch Processing

For non-urgent renders:

```javascript
// Schedule jobs for overnight batch
const batchWindow = {
  start: '22:00',
  end: '06:00'
};

if (!isWithinBatchWindow()) {
  await scheduleForBatch(job);
  return { scheduled: true, batchTime: batchWindow.start };
}
```

### Strategy 4: Manual Notification

Alert user to power on machine:

```javascript
if (!machineOnline && !wolSuccess) {
  // Send notification (email, SMS, push)
  await notify({
    channel: 'push',
    title: 'Render Machine Offline',
    body: `Please power on ${machineName} to process render job`,
    action: {
      label: 'Retry',
      url: `/api/jobs/${jobId}/retry`
    }
  });

  return {
    status: 'waiting_manual',
    message: 'Machine offline. User notified.'
  };
}
```

### Strategy 5: Cloud Fallback

Use cloud GPU when local machines unavailable:

```javascript
const cloudProviders = {
  runpod: { url: 'https://api.runpod.io/v2/...', costPerMin: 0.40 },
  vast: { url: 'https://vast.ai/api/...', costPerMin: 0.30 }
};

if (!localMachineAvailable && job.allowCloudFallback) {
  const provider = cheapestAvailableProvider(cloudProviders);
  return await submitToCloud(provider, job);
}
```

---

## Troubleshooting

### Quick Diagnostic Checklist

1. **Check NIC link light after shutdown** - Should remain on
2. **Verify MAC address** - Run `ipconfig /all` on target
3. **Test on same subnet first** - Use local WoL tool
4. **Check BIOS settings** - WoL enabled, ErP disabled
5. **Disable Fast Startup** - Critical for Windows

### Common Issues and Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| WoL works from sleep but not shutdown | Fast Startup enabled | Disable Fast Startup in Power Options |
| WoL worked then stopped | Router flushed ARP table | Create static ARP entry or wake within 30 min |
| No network light after shutdown | ErP/EuP mode enabled | Disable in BIOS |
| WoL works locally, not remotely | Broadcast not forwarded | Use relay device or port forwarding |
| Intermittent failures | Energy Efficient Ethernet | Disable in adapter Advanced settings |
| Wake from S4/S5 not working | BIOS limitation | Check if motherboard supports S5 wake |
| Works once then fails | Deep Sleep enabled | Disable Deep Sleep in BIOS |

### Verification Commands

**Check adapter supports WoL:**
```cmd
powercfg -devicequery wake_armed
```

**Verify network adapter settings:**
```powershell
Get-NetAdapter | Get-NetAdapterPowerManagement
```

**Monitor magic packets (on target):**
```bash
# Linux
sudo tcpdump -i eth0 'udp port 9'

# Windows (Wireshark filter)
eth.dst == ff:ff:ff:ff:ff:ff && udp.port == 9
```

**Send test packet and verify:**
```powershell
# Ping before
ping 192.168.1.100

# Send WoL
wol.exe AA:BB:CC:DD:EE:FF

# Wait 60 seconds, then ping again
ping 192.168.1.100
```

### BIOS Not Saving Settings

Some systems reset WoL settings after power loss:
1. Remove/replace CMOS battery
2. Check for "Restore AC Power Loss" setting - set to "Last State" or "Power On"
3. Update BIOS firmware

---

## References

### Official Documentation
- [Wake-on-LAN - Wikipedia](https://en.wikipedia.org/wiki/Wake-on-LAN)
- [Wake-on-LAN - ArchWiki](https://wiki.archlinux.org/title/Wake-on-LAN)
- [Microsoft: WoL behavior in Windows 10](https://learn.microsoft.com/en-us/troubleshoot/windows-client/setup-upgrade-and-drivers/wake-on-lan-feature)

### Setup Guides
- [How to Enable Wake-on-LAN in Windows 10 and 11 - How-To Geek](https://www.howtogeek.com/764943/how-to-enable-wake-on-lan-in-windows-10-and-11/)
- [Windows Central: Configure WoL on Windows 10](https://www.windowscentral.com/how-enable-and-use-wake-lan-wol-windows-10)
- [Windows Central: Set up WoL on Windows 11](https://www.windowscentral.com/software-apps/windows-11/how-to-enable-wake-on-lan-on-windows-11)

### Manufacturer Guides
- [ASUS: How to enable WOL in BIOS](https://www.asus.com/support/faq/1045950/)
- [MSI: How to set up Wake-On-Lan](https://www.msi.com/support/technical_details/MB_Wake_On_LAN)
- [Dell: WoL Troubleshooting Guide](https://www.dell.com/support/kbdoc/en-us/000129137/wake-on-lan-wol-troubleshooting-best-practices)

### Tools & Libraries
- [wake_on_lan npm package](https://www.npmjs.com/package/wake_on_lan)
- [GitHub: node_wake_on_lan](https://github.com/agnat/node_wake_on_lan)
- [WOL.EXE - Gammadyne](https://www.gammadyne.com/wol.htm)
- [WOLCMD - Depicus](https://www.depicus.com/wake-on-lan/wake-on-lan-cmd)
- [WakeMeOnLan - NirSoft](https://www.nirsoft.net/utils/wake_on_lan.html)

### Self-Hosted Solutions
- [UpSnap - GitHub](https://github.com/seriousm4x/UpSnap)
- [Wake Anywhere - GitHub](https://github.com/jottocraft/wake-anywhere)
- [Tailscale WoL with UpSnap](https://tailscale.com/blog/wake-on-lan-tailscale-upsnap)

### WoL Over Internet
- [Remote Power-On Guide 2026 - TheLinuxCode](https://thelinuxcode.com/remote-power-on-over-the-internet-with-wake-on-lan-a-practical-2026-guide/)
- [Cloudflare Community: WoL with Tunnel](https://community.cloudflare.com/t/send-wol-request-to-a-machine-behind-zerotrust-tunnel/448124)

---

*Research completed: 2026-01-28*
