import subprocess
import uuid
from pathlib import Path

chrome = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
root = Path(r"D:\work-h\work_contents\AI-develop\mimo\shixu-app-mac")
html = root / "renderer"
img = root / "docs" / "images"
img.mkdir(parents=True, exist_ok=True)
udd = Path.home() / "AppData/Local/Temp" / f"chrome-shot-{uuid.uuid4().hex[:8]}"

def shot(url_path: str, out: Path, w: int, h: int):
    url = "file:///" + (html / url_path).as_posix()
    cmd = [
        chrome,
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        f"--user-data-dir={udd}",
        f"--window-size={w},{h}",
        f"--screenshot={out}",
        "--virtual-time-budget=3500",
        url,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    size = out.stat().st_size if out.exists() else 0
    print(out.name, size, r.returncode)

shot("index.html?demo=1&tab=board", img / "app-board.png", 430, 920)
shot("index.html?demo=1&tab=projects", img / "app-projects.png", 430, 920)
shot("index.html?demo=1&tab=review", img / "app-review.png", 430, 920)
shot("dock.html?demo=1&expanded=1", img / "dock-expanded.png", 420, 680)
shot("dock.html?demo=1", img / "dock-collapsed.png", 340, 220)


def shot(url_path: str, out: Path, w: int, h: int):
    url = "file:///" + (html / url_path).as_posix()
    cmd = [
        chrome,
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        f"--user-data-dir={udd}",
        f"--window-size={w},{h}",
        f"--screenshot={out}",
        "--virtual-time-budget=3500",
        url,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    size = out.stat().st_size if out.exists() else 0
    print(out.name, size, r.returncode, (r.stderr or "")[-200:])

shot("index.html?demo=1&tab=board", img / "app-board.png", 430, 920)
shot("index.html?demo=1&tab=projects", img / "app-projects.png", 430, 920)
shot("index.html?demo=1&tab=review", img / "app-review.png", 430, 920)
shot("dock.html?demo=1&expanded=1", img / "dock-expanded.png", 420, 680)
shot("dock.html?demo=1", img / "dock-collapsed.png", 340, 220)
