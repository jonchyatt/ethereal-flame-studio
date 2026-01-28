# Google Drive Setup for Ethereal Flame Studio

> **Note:** Run `deploy.bat → "2"` first to start Docker services, then configure rclone as described below.

## Prerequisites

1. Install rclone: https://rclone.org/install/
2. Google account with Google Drive access

## Quick Setup (Interactive)

1. Run rclone config:
   ```bash
   rclone config
   ```

2. Follow the prompts:
   - `n` for new remote
   - Name: `gdrive` (or your preferred name)
   - Storage type: `drive` (Google Drive)
   - Leave client_id and client_secret blank (uses rclone's)
   - Scope: `1` (full access)
   - Leave root_folder_id blank
   - Leave service_account_file blank
   - `n` for advanced config
   - `y` for auto config (opens browser)

3. Authorize in browser

4. `n` for team drive (unless you use one)

5. Confirm with `y`

## Environment Variables

Add to your `.env`:

```
GDRIVE_REMOTE=gdrive
GDRIVE_OUTPUT_FOLDER=EtherealFlame/Renders
```

## Verify Setup

```bash
# List files in root
rclone ls gdrive:

# Test upload
echo "test" > /tmp/test.txt
rclone copy /tmp/test.txt gdrive:EtherealFlame/
rclone ls gdrive:EtherealFlame/

# Clean up
rclone delete gdrive:EtherealFlame/test.txt
```

## Unattended Operation (Service Account)

For running without interactive auth (server deployment):

1. Create a service account in Google Cloud Console
2. Download the JSON key file
3. Share your Google Drive folder with the service account email
4. Configure rclone:
   ```bash
   rclone config
   # When prompted for service_account_file, provide path to JSON key
   ```

## Troubleshooting

**Token expired:**
```bash
rclone config reconnect gdrive:
```

**Check connection:**
```bash
rclone about gdrive:
```

**Debug upload issues:**
```bash
rclone -vv copy /path/to/file gdrive:folder/
```
