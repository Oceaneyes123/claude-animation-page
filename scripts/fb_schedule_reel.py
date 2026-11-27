"""Upload and schedule a Facebook Page Reel via the Meta Graph API.

Usage:
    python scripts/fb_schedule_reel.py <video.mp4> --time "2026-11-29T06:00:00+08:00" --caption "..."
"""

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

GRAPH_VERSION = "v21.0"


def load_env(env_path: Path) -> dict[str, str]:
    """Parse key=value pairs from a .env file without modifying os.environ."""
    env: dict[str, str] = {}
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def graph_post(url: str, params: dict[str, str]) -> dict:
    """Send a form-encoded POST request to the Graph API and parse JSON."""
    data = urllib.parse.urlencode(params).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        body = err.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Graph API HTTP {err.code}: {body}") from err


def upload_binary(upload_url: str, token: str, video_path: Path) -> dict:
    """Stream the MP4 binary to Meta's rupload endpoint using curl."""
    file_size = video_path.stat().st_size
    cmd = [
        "curl.exe",
        "-sS",
        "-X",
        "POST",
        upload_url,
        "-H",
        f"Authorization: OAuth {token}",
        "-H",
        "offset: 0",
        "-H",
        f"file_size: {file_size}",
        "--data-binary",
        f"@{video_path}",
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if res.returncode != 0:
        raise RuntimeError(f"curl upload failed ({res.returncode}): {res.stderr.strip()}")
    try:
        parsed = json.loads(res.stdout)
    except json.JSONDecodeError as err:
        raise RuntimeError(f"Unexpected upload response: {res.stdout}") from err
    if not parsed.get("success"):
        raise RuntimeError(f"Upload did not report success: {res.stdout}")
    return parsed


def schedule_reel(
    page_id: str,
    token: str,
    video_path: Path,
    publish_ts: int,
    caption: str,
    is_ai_generated: bool = True,
) -> dict:
    """Execute the 3-phase video_reels upload and schedule the Reel."""
    base_url = f"https://graph.facebook.com/{GRAPH_VERSION}/{page_id}/video_reels"

    start = graph_post(base_url, {"upload_phase": "start", "access_token": token})
    video_id = start["video_id"]
    upload_url = start["upload_url"]

    upload_binary(upload_url, token, video_path)

    finish = graph_post(
        base_url,
        {
            "upload_phase": "finish",
            "video_id": video_id,
            "video_state": "SCHEDULED",
            "scheduled_publish_time": str(publish_ts),
            "description": caption,
            "is_ai_generated": "true" if is_ai_generated else "false",
            "access_token": token,
        },
    )
    return {"video_id": video_id, "finish": finish}


def main() -> int:
    parser = argparse.ArgumentParser(description="Schedule a Facebook Page Reel.")
    parser.add_argument("video", type=Path, help="Path to the .mp4 video file")
    parser.add_argument("--time", required=True, help="ISO-8601 publish time, e.g. 2026-11-29T06:00:00+08:00")
    parser.add_argument("--caption", default="", help="Reel description text")
    parser.add_argument("--caption-file", type=Path, help="UTF-8 text file containing the Reel description")
    parser.add_argument("--no-ai-label", action="store_true", help="Disable the Made with AI self-disclosure flag (enabled by default)")
    parser.add_argument("--env", type=Path, default=Path(".env"), help="Path to .env file")
    parser.add_argument("--dry-run", action="store_true", help="Print payload details without uploading")
    args = parser.parse_args()

    caption = args.caption_file.read_text(encoding="utf-8").strip() if args.caption_file else args.caption
    is_ai_generated = not args.no_ai_label

    if not args.video.is_file():
        print(f"Video file not found: {args.video}", file=sys.stderr)
        return 1

    dt = datetime.fromisoformat(args.time)
    if dt.tzinfo is None:
        print("--time must include a timezone offset (e.g. +08:00)", file=sys.stderr)
        return 1
    publish_ts = int(dt.timestamp())

    env = load_env(args.env)
    page_id = env.get("FACEBOOK_PAGE_ID", "")
    token = env.get("FACEBOOK_PAGE_ACCESS_TOKEN", "")
    if not page_id or not token:
        print("Missing FACEBOOK_PAGE_ID or FACEBOOK_PAGE_ACCESS_TOKEN in .env", file=sys.stderr)
        return 1

    if args.dry_run:
        print(
            json.dumps(
                {
                    "video": str(args.video),
                    "size_bytes": args.video.stat().st_size,
                    "page_id": page_id,
                    "scheduled_iso": dt.isoformat(),
                    "scheduled_unix": publish_ts,
                    "is_ai_generated": is_ai_generated,
                    "caption_len": len(caption),
                },
                indent=2,
            )
        )
        return 0

    result = schedule_reel(page_id, token, args.video, publish_ts, caption, is_ai_generated=is_ai_generated)
    print(json.dumps({"video": str(args.video), "scheduled_unix": publish_ts, **result}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
