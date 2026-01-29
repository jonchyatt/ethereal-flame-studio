# n8n Workflow Templates for Ethereal Flame Studio

This document catalogs n8n workflow templates that can be adapted for the Ethereal Flame Studio automation pipeline.

---

## Table of Contents

1. [YouTube Upload Workflows](#1-youtube-upload-workflows)
2. [Multi-Platform Posting with Blotato](#2-multi-platform-posting-with-blotato)
3. [Google Drive Watch Folder Workflows](#3-google-drive-watch-folder-workflows)
4. [Webhook-Triggered Video Processing](#4-webhook-triggered-video-processing)
5. [Notification Workflows](#5-notification-workflows)
6. [Google Sheets Logging Workflows](#6-google-sheets-logging-workflows)
7. [Best Practices for Video File Handling](#7-best-practices-for-video-file-handling)

---

## 1. YouTube Upload Workflows

### 1.1 Automate YouTube Uploads with AI-Generated Metadata from Google Drive

**Template URL:** https://n8n.io/workflows/3906-automate-youtube-uploads-with-ai-generated-metadata-from-google-drive/

**Description:** Monitors a Google Drive folder for new videos and automatically uploads them to YouTube with AI-generated metadata.

**Node Structure:**
```
Google Drive Trigger
    |
    v
Google Drive (Download File)
    |
    v
AI Node (Generate Metadata) - Title, Description, Tags
    |
    v
YouTube (Upload Video)
    |
    v
Google Sheets (Log Upload)
```

**Required Credentials:**
- Google Drive OAuth2
- YouTube OAuth2 API (with upload and edit permissions)
- OpenAI API (or other AI service for metadata generation)
- Google Sheets OAuth2 (optional, for logging)

**Setup Steps:**
1. Import workflow into n8n instance
2. Configure Google Drive credentials; reference folder ID via n8n variable (do not hard-code)
3. Set up YouTube API credentials with upload and edit permissions
4. Configure AI node with your preferred LLM API key
5. Create a Google Cloud Project with YouTube Data API v3 enabled

**Customizations for Ethereal Flame Studio:**
- Set watch folder to rendered video output directory
- Configure AI prompt to generate meditation/ambient music-specific metadata
- Add scheduling logic to publish at optimal times
- Include thumbnail upload from companion PNG file

---

### 1.2 Automated YouTube Video Scheduling & AI Metadata Generation

**Template URL:** https://n8n.io/workflows/3900-automated-youtube-video-scheduling-and-ai-metadata-generation/

**Description:** Full automation for video transcripts, SEO-optimized descriptions, tags, and scheduled publishing.

**Key Features:**
- Extracts video transcripts via Apify for metadata generation
- Creates SEO-optimized descriptions and tags
- Sets videos to private during initial upload (required for scheduling)
- Implements scheduled publishing at strategic times

**Critical Notes:**
- Videos must be uploaded as **private** initially
- The "Publish At" logic only works for private videos that haven't been published before
- Requires YouTube Data API quota consideration for bulk uploads

**Required Credentials:**
- YouTube OAuth2 API
- Apify API (for transcript extraction)
- OpenAI/Claude API (for content generation)

---

### 1.3 YouTube Shorts Automation Tool

**Template URL:** https://n8n.io/workflows/2941-youtube-shorts-automation-tool/

**Description:** Automates Shorts creation with SEO optimization, visuals, and voiceovers.

**Customizations for Ethereal Flame Studio:**
- Convert rendered animations to vertical format for Shorts
- Generate ambient audio descriptions
- Create preview clips from full-length renders

---

## 2. Multi-Platform Posting with Blotato

### 2.1 Auto-Publish Social Videos to 9 Platforms

**Template URL:** https://n8n.io/workflows/3522-auto-publish-social-videos-to-9-platforms-via-google-sheets-and-blotato/

**Description:** Automates video distribution to 9 social platforms using Google Sheets as the content queue and Blotato for multi-platform posting.

**Supported Platforms:**
- Instagram
- YouTube
- TikTok
- Facebook
- LinkedIn
- Threads
- Twitter/X
- Bluesky
- Pinterest

**Node Structure:**
```
Schedule Trigger (or Google Sheets Trigger)
    |
    v
Google Sheets (Read "Ready to Post" items)
    |
    v
Google Drive (Download Video/Image)
    |
    v
Blotato - Upload Media
    |
    v
[Split to 9 Platform Nodes]
    |
    v
Blotato Publish - Instagram
Blotato Publish - YouTube
Blotato Publish - TikTok
Blotato Publish - Facebook
Blotato Publish - LinkedIn
Blotato Publish - Threads
Blotato Publish - Twitter/X
Blotato Publish - Bluesky
Blotato Publish - Pinterest
    |
    v
Google Sheets (Update Status to "Posted")
```

**Required Credentials:**
- Google Sheets OAuth2
- Google Drive OAuth2
- Blotato API Key (from Blotato Settings > API)
- Social media account connections via Blotato dashboard

**Setup Steps:**
1. Enable "Verified Community Nodes" in n8n Admin Panel
2. Install the Blotato community node
3. Get Blotato API key from Settings > API > Copy API Key
4. Connect each social platform in Blotato's dashboard
5. Configure Google Sheets with columns: Video URL, Caption, Status, Platforms

**Pinterest Special Setup:**
- Requires Board ID
- In Blotato, create a sample Pinterest post, click Publish, choose a board
- Copy the Board ID from the dropdown

**Testing Protocol:**
1. Deactivate all social platform nodes
2. Activate just 1 platform to start
3. Run the workflow
4. Pin data at the "UPLOAD to Blotato" node (locks inputs for repeat tests)
5. Execute 1 platform node from pinned data to validate
6. Activate other social platforms

---

### 2.2 Multi-Platform Social Media Publisher with Airtable

**Template URL:** https://n8n.io/workflows/3816-multi-platform-social-media-publisher-with-blotato-gpt-4-mini-and-airtable/

**Description:** Uses Airtable instead of Google Sheets for content management, with AI-generated captions.

**Customizations for Ethereal Flame Studio:**
- Use Airtable for richer content metadata
- Store render parameters and track which videos have been posted
- Generate platform-specific captions (longer for YouTube, hashtag-heavy for Instagram)

---

### 2.3 Automated Daily Posting to 9 Social Platforms

**Template URL:** https://n8n.io/workflows/8524-automated-daily-posting-to-9-social-platforms-with-google-sheets-drive-and-blotato/

**Description:** Runs on a schedule to check for content marked "Ready to Post" and distributes automatically.

**Workflow Logic:**
1. Schedule trigger (e.g., daily at 9 AM)
2. Check Google Sheet for rows with Status = "Ready to Post"
3. Download media from Google Drive
4. Post to all configured platforms
5. Update status to "Posted"

---

## 3. Google Drive Watch Folder Workflows

### 3.1 Monitor File Changes with Google Drive Push Notifications

**Template URL:** https://n8n.io/workflows/6106-monitor-file-changes-with-google-drive-push-notifications/

**Description:** Uses Google's push notification system for real-time file change detection (more reliable than polling).

**Node Structure:**
```
Webhook (receives Google Push Notification)
    |
    v
Google Drive (Get File Details)
    |
    v
Filter (Check if target folder)
    |
    v
Process File / Trigger Downstream Workflow
```

**Required Credentials:**
- Google Drive OAuth2
- Webhook URL (n8n provides this)

**Advantages over Polling:**
- More reliable than polling-based triggers
- Near-instant detection of new files
- Better for production automation pipelines

**Setup Notes:**
- Requires setting up Google Cloud Pub/Sub
- Push notifications expire and need periodic renewal

---

### 3.2 Scheduled Monitoring of New & Modified Files Across Folders

**Template URL:** https://n8n.io/workflows/9209-scheduled-monitoring-of-new-and-modified-files-across-google-drive-folders/

**Description:** Polls for changes across folders AND subfolders (overcomes built-in trigger limitation).

**Key Features:**
- Triggers on new or changed files in a folder AND all subfolders
- Tracks "last run" timestamp to only process new files
- Works around the single-folder limitation of native trigger

**Required Credentials:**
- Google Drive OAuth2

**Customizations for Ethereal Flame Studio:**
- Monitor the Blender render output folder
- Detect completed render jobs (look for .mp4 and .png pairs)
- Trigger upload pipeline when both video and thumbnail are ready

---

### 3.3 Monitor and Download Changed Files Automatically

**Template URL:** https://n8n.io/workflows/6193-monitor-and-download-changed-files-from-google-drive-automatically/

**Description:** Downloads files that have changed since the last run using a timestamp control file.

**Node Structure:**
```
Schedule Trigger
    |
    v
Read Last Run Timestamp
    |
    v
Google Drive (List Files Modified After Timestamp)
    |
    v
Loop: Download Each File
    |
    v
Process Files
    |
    v
Update Timestamp File
```

---

## 4. Webhook-Triggered Video Processing

### 4.1 Run Multiple Tasks in Parallel with Async Processing

**Template URL:** https://n8n.io/workflows/8578-run-multiple-tasks-in-parallel-with-asynchronous-processing-and-webhooks/

**Description:** Pattern for running long-running video processing tasks without blocking.

**Node Structure:**
```
Webhook (Receive Job Request)
    |
    v
Start Sub-workflows (in parallel)
    |
    +-> Sub-workflow 1 (e.g., YouTube upload)
    +-> Sub-workflow 2 (e.g., Generate Thumbnail)
    +-> Sub-workflow 3 (e.g., Create Preview Clip)
    |
    v
Wait for All Sub-workflows
    |
    v
Respond to Webhook with Results
```

**Key Concepts:**
- Uses "Wait For Sub-workflow Completion" option
- "Wait" node manages concurrent execution
- Collects results from sub-workflows via webhooks

**Customizations for Ethereal Flame Studio:**
- Trigger render job completion processing
- Run uploads to multiple platforms in parallel
- Generate metadata while uploading

---

### 4.2 Unify Multiple Triggers into a Single Workflow

**Template URL:** https://n8n.io/workflows/7784-unify-multiple-triggers-into-a-single-workflow/

**Description:** Design pattern to handle multiple trigger types (Form, Webhook, Sub-workflow) in one workflow.

**Use Case:**
- Accept job requests from multiple sources
- Manual form submission for testing
- API webhook for Blender script integration
- Sub-workflow call from other n8n workflows

---

## 5. Notification Workflows

### 5.1 Slack Alert When Workflow Fails

**Template URL:** https://n8n.io/workflows/1326-get-a-slack-alert-when-a-workflow-went-wrong/

**Description:** Sends Slack notification when any monitored workflow fails.

**Node Structure:**
```
Error Trigger
    |
    v
Format Error Message
    |
    v
Slack (Send Message to Channel)
```

**Required Credentials:**
- Slack OAuth2 (Bot token with chat:write permission)

**Message Template Fields:**
- `{{ $node["Error Trigger"].json.workflow.name }}` - Failed workflow name
- `{{ $node["Error Trigger"].json.workflow.url }}` - Direct link to workflow
- `{{ $node["Error Trigger"].json.execution.error.message }}` - Error message

**Setup:**
1. Create error handler workflow with Error Trigger node
2. Connect Slack node
3. In production workflows: Settings > Error Workflow > Select handler

---

### 5.2 Automated Hourly Error Monitoring with Slack

**Template URL:** https://n8n.io/workflows/7076-automated-hourly-n8n-error-monitoring-with-slack-notifications/

**Description:** Proactively scans for failures every hour and sends digest.

**Node Structure:**
```
Schedule Trigger (Every Hour)
    |
    v
n8n API (Get Failed Executions from Last Hour)
    |
    v
Group by Workflow
    |
    v
Build Rich Message (with error counts and links)
    |
    v
Slack (Send Alert)
```

**Alternative Notification Channels:**
- Discord
- Microsoft Teams
- Telegram
- Email (Gmail, Outlook, SendGrid)

---

### 5.3 Centralized Error Management with Email Alerts

**Template URL:** https://n8n.io/workflows/4519-centralized-n8n-error-management-system-with-automated-email-alerts-via-gmail/

**Description:** Email-based error notifications with rich context.

**Email Content Includes:**
- Error messages and stack traces
- Last executed node
- Direct links to failed executions
- Trigger failure context

---

### 5.4 Notion Status-Based Alert Messages

**Template URL:** https://n8n.io/workflows/4386-notion-status-based-alert-messages-slack-telegram-whatsapp-discord-email/

**Description:** Watches Notion database and routes alerts based on item status.

**Customizations for Ethereal Flame Studio:**
- Track render job status in Notion
- Alert when jobs move to "Ready for Review" or "Failed"
- Route different alerts to different channels

---

## 6. Google Sheets Logging Workflows

### 6.1 Workflow Error Logging with Google Sheets and Gmail

**Template URL:** https://n8n.io/workflows/7876-workflow-error-logging-and-alerts-with-google-sheets-and-gmail/

**Description:** Comprehensive error tracking with spreadsheet logging.

**Logged Fields:**
- Workflow name and ID
- Failed node details
- Timestamp
- Full error stack trace
- Direct link to failed execution

**Additional Columns to Add:**
- Error severity level
- Affected systems
- Resolution status
- Assigned owner

**Required Credentials:**
- Google Sheets OAuth2
- Gmail OAuth2

---

### 6.2 Workflow Inventory Dashboard

**Template URL:** https://n8n.io/workflows/9113-create-workflow-inventory-dashboard-with-n8n-api-and-google-sheets/

**Description:** Creates a master list of all workflows in a Google Sheet.

**Use Case:**
- Document all automation workflows
- Track which workflows are active
- Monitor workflow versions

---

### 6.3 Custom Logging for Ethereal Flame Studio

**Recommended Sheet Structure:**

| Column | Description |
|--------|-------------|
| Timestamp | When the render/upload occurred |
| Video ID | Unique identifier for the render |
| Render Duration | How long the Blender render took |
| File Size | Size of output video |
| YouTube URL | Link to uploaded video |
| Platforms Posted | Comma-separated list of platforms |
| Status | Completed, Failed, Processing |
| Error Message | If failed, the error details |
| Metadata | JSON blob with title, description, tags |

---

## 7. Best Practices for Video File Handling

### 7.1 Binary Data Storage Modes

**Critical:** n8n stores binary data in memory by default, which causes crashes with large video files.

**Environment Variable Configuration:**

```bash
# Change from memory to filesystem storage
N8N_DEFAULT_BINARY_DATA_MODE=filesystem

# For enterprise/multi-node setups, use S3
N8N_DEFAULT_BINARY_DATA_MODE=s3

# S3 Configuration (Enterprise only)
N8N_AVAILABLE_BINARY_DATA_MODES=filesystem,s3
N8N_EXTERNAL_STORAGE_S3_HOST=s3.amazonaws.com
N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME=your-bucket
N8N_EXTERNAL_STORAGE_S3_BUCKET_REGION=us-east-1
N8N_EXTERNAL_STORAGE_S3_ACCESS_KEY=your-access-key
N8N_EXTERNAL_STORAGE_S3_ACCESS_SECRET=your-secret-key
```

### 7.2 Recommended Settings by File Size

| File Size | Recommended Mode | Notes |
|-----------|-----------------|-------|
| < 10 MB | Memory (default) | Small images, short clips |
| 10-50 MB | Filesystem | Large images, high-res renders |
| 50-200 MB | Filesystem + Timeout | Short videos, large datasets |
| > 200 MB | S3 Mode | Full-length videos, batch processing |

### 7.3 Memory Optimization Strategies

**Chunked Processing:**
- Split large batches into smaller chunks
- Process 5-10 videos per execution instead of 50+
- Use sub-workflows to isolate memory usage

**Sub-workflow Architecture:**
```
Main Workflow
    |
    v
Split into Batches (5 items each)
    |
    v
Call Sub-workflow for Each Batch
    |
    v
Sub-workflow processes batch
    |
    v
Memory freed after sub-workflow completes
    |
    v
Main workflow continues with next batch
```

**Avoid Memory Pitfalls:**
- Don't use Code node for large file processing
- Avoid manual executions with large datasets
- Don't pass binary data between sub-workflows unnecessarily

### 7.4 Timeout Configuration

**Environment Variables:**

```bash
# Default timeout for all workflows (in seconds)
# -1 = disabled (not recommended for production)
EXECUTIONS_TIMEOUT=3600

# Maximum allowed timeout (hard limit)
EXECUTIONS_TIMEOUT_MAX=7200

# Webhook maximum payload size (default: 16MB)
N8N_PAYLOAD_SIZE_MAX=16777216
```

**Per-Node Timeout:**
- HTTP Request node: Options > Timeout (in milliseconds)
- Example: `60000` for 60 seconds

**Per-Workflow Timeout:**
1. Open workflow settings
2. Enable "Timeout After"
3. Set hours/minutes/seconds

### 7.5 Video Processing with External Tools

**FFmpeg Integration Pattern:**

```
Webhook (Receive video path)
    |
    v
Execute Command Node (FFmpeg)
    |
    v
[FFmpeg processes video directly on disk]
    |
    v
Read output file path (not file content)
    |
    v
Upload via API using file path
```

**Advantages:**
- FFmpeg processes files directly without loading into n8n memory
- Works with videos of any size
- Faster processing

### 7.6 n8n Cloud vs Self-Hosted

| Feature | n8n Cloud | Self-Hosted |
|---------|-----------|-------------|
| Global timeout control | Contact support | Full control |
| Binary data mode | Managed | Configurable |
| S3 storage | Enterprise plan | Enterprise license |
| Memory limits | Plan-dependent | Server-dependent |

### 7.7 Error Handling for Large Files

**Common Errors:**
- "Execution stopped at this node (n8n may have run out of memory)"
- "Connection Lost"
- "503 Service Temporarily Unavailable"
- "JavaScript heap out of memory"

**Solutions:**

```bash
# Increase V8 memory allocation
NODE_OPTIONS="--max-old-space-size=4096"

# Or in Docker:
NODE_OPTIONS: "--max-old-space-size=4096"
```

**Preventing Binary Data Loss Between Nodes:**
- Always use `getBinaryDataBuffer()` helper function
- Don't directly access the data property
- The helper handles n8n's internal storage format correctly

---

## Summary: Recommended Workflow Architecture for Ethereal Flame Studio

```
[Blender Renders Complete]
         |
         v
[Google Drive - Watch Folder]
    (Trigger: New .mp4 + .png detected)
         |
         v
[Validate File Pair]
    (Ensure video + thumbnail exist)
         |
         v
[AI Generate Metadata]
    (Title, Description, Tags via OpenAI/Claude)
         |
         v
[YouTube Upload]
    (Primary platform, schedule for optimal time)
         |
         v
[Blotato Multi-Platform Post]
    (Instagram, TikTok, Facebook, etc.)
         |
         v
[Google Sheets Log]
    (Track all uploads and metadata)
         |
         v
[Slack Notification]
    (Alert team of successful upload)
         |
    [If Error]
         |
         v
[Error Handler Workflow]
    (Log to Sheets, send alert)
```

---

## References

- [n8n YouTube Node Documentation](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.youtube/)
- [n8n Blotato Integration](https://n8n.io/integrations/blotato/)
- [n8n Binary Data Environment Variables](https://docs.n8n.io/hosting/configuration/environment-variables/binary-data/)
- [n8n Scaling Binary Data](https://docs.n8n.io/hosting/scaling/binary-data/)
- [n8n Memory Errors](https://docs.n8n.io/hosting/scaling/memory-errors/)
- [n8n Error Handling](https://docs.n8n.io/flow-logic/error-handling/)
- [n8n Google Drive Trigger](https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.googledrivetrigger/)
- [Blotato n8n Node Documentation](https://help.blotato.com/api/n8n/n8n-blotato-node)
- [Blotato GitHub Repository](https://github.com/Blotato-Inc/n8n-nodes-blotato)
