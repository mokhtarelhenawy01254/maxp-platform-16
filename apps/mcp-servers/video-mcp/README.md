# maxp-mcp-video

FastMCP Server for Google Veo AI Video Generation within MaxP Platform.

## Features
- `create_video_task`: Dispatches an asynchronous video generation task via Google Veo.
- `check_video_status`: Returns current progress, completion status, and download/streaming MP4 URL.
- `list_recent_videos`: Retrieves recent videos generated for the company.

## Running Locally
```bash
python -m maxp_mcp_video.server
```
Default Port: `7102` (Stateless HTTP / Streamable HTTP)
