# Blender MCP Setup Guide (Windows)

## Prerequisites

- **Blender 4.5 LTS** (recommended) or 5.0+ -- download from https://www.blender.org/download/
- **uv** -- Python package manager required by blender-mcp
- **Claude Code** -- MCP client

## Step 1: Install uv

```powershell
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

Add to PATH:
```powershell
$localBin = "$env:USERPROFILE\.local\bin"
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
[Environment]::SetEnvironmentVariable("Path", "$userPath;$localBin", "User")
```

Verify: `uv --version`

## Step 2: Add blender-mcp to Claude Code

```bash
claude mcp add blender uvx blender-mcp
```

This registers the MCP server. Claude Code will launch it automatically when Blender tools are used.

## Step 3: Install Blender Addon

1. Download `addon.py` from https://github.com/ahujasid/blender-mcp/blob/main/src/blender_mcp/addon.py
2. Open Blender
3. Edit > Preferences > Add-ons > Install from Disk
4. Select the downloaded `addon.py`
5. Enable the "BlenderMCP" addon (check the checkbox)

## Step 4: Connect

1. In Blender, press N to open the side panel
2. Click the "BlenderMCP" tab
3. Click "Connect to Claude"
4. Status should show "Connected" on port 9876

## Step 5: Verify Connection

From Claude Code, run the connection test:

```
Use execute_blender_code to run:
exec(open('C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts/connection_test.py').read())
```

Expected output: JSON with `"all_tests_pass": true` and `"status": "PASS - MCP bridge verified"`.

## Troubleshooting

### Connection refused
- Ensure Blender is running with the addon enabled
- Check that "Connect to Claude" was clicked in the N-panel
- Verify port 9876 is not blocked by firewall

### Windows ProactorEventLoop error (GitHub issue #52)
- Update blender-mcp to latest version
- If persists, the maintainer patches this frequently -- check GitHub issues

### 180-second timeout on long operations
- This is expected behavior -- see PITFALLS.md
- All bakes and renders MUST use async patterns (async_bake.py, async_render.py)
- NEVER run bpy.ops.fluid.bake_all() or bpy.ops.render.render() directly via execute_blender_code

### Screenshot token cost
- Each screenshot costs ~2,765 tokens (1920x1080)
- Use get_scene_info and get_object_info (text) as primary feedback
- Screenshots only at validation checkpoints

## Architecture

```
Claude Code
    |
    v (MCP Protocol - JSON-RPC)
blender-mcp server (uvx blender-mcp)
    |
    v (TCP Socket, localhost:9876)
Blender Addon (addon.py)
    |
    v (bpy.app.timers - main thread marshal)
Blender Python API (bpy)
```

## Version Pinning

- **Blender:** 4.5 LTS (stable API, long-term support)
- **blender-mcp:** v1.5.5+ (latest stable)
- Do NOT auto-update Blender mid-project (API breaking changes between major versions)

## Directory Structure

```
blender/
  scripts/     # Python scripts for MCP execution
  scenes/      # .blend template files (gitignored)
  cache/       # Mantaflow simulation cache (gitignored, can reach 30-180+ GB)
  renders/     # Rendered frames and videos (gitignored)
  masks/       # Segmentation masks for Luminous Being (gitignored)
```
