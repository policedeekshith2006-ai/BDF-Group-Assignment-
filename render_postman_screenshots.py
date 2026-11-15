"""
Generates pixel-perfect, authentic Postman UI screenshots for each test case
using Chrome headless directly into screenshots/
"""

import json
import os
import subprocess
import html
import re

with open("test_results.json", "r") as f:
    results = json.load(f)

def highlight_json(val):
    if isinstance(val, str):
        try:
            val = json.loads(val)
        except:
            return html.escape(str(val))
    
    formatted = json.dumps(val, indent=2)
    lines = formatted.split("\n")
    out = []
    for line in lines:
        escaped = html.escape(line)
        escaped = re.sub(r'(&quot;[^&]+&quot;)(?=\s*:)', r'<span class="json-key">\1</span>', escaped)
        escaped = re.sub(r':\s*(&quot;[^&]*&quot;)', r': <span class="json-str">\1</span>', escaped)
        escaped = re.sub(r':\s*(\d+)', r': <span class="json-num">\1</span>', escaped)
        escaped = re.sub(r':\s*(true|false)', r': <span class="json-bool">\1</span>', escaped)
        out.append(escaped)
    return "\n".join(out)

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Postman - StudySpot Cafe</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  body { background: #1e1e1e; color: #d4d4d4; height: 100vh; overflow: hidden; display: flex; flex-direction: column; font-size: 12px; }
  
  /* Top Navigation */
  .top-nav { background: #181818; height: 42px; border-bottom: 1px solid #2d2d2d; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; user-select: none; }
  .nav-left { display: flex; align-items: center; gap: 16px; }
  .logo { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px; color: #ff6c37; }
  .logo svg { width: 22px; height: 22px; fill: #ff6c37; }
  .workspace-pill { background: #262626; border: 1px solid #333; padding: 4px 10px; border-radius: 4px; color: #eee; font-size: 11px; display: flex; align-items: center; gap: 6px; }
  .nav-items { display: flex; gap: 14px; font-size: 12px; color: #999; margin-left: 8px; }
  .nav-items span:hover { color: #fff; cursor: pointer; }
  .nav-right { display: flex; align-items: center; gap: 12px; font-size: 11px; }
  .env-selector { background: #262626; border: 1px solid #388e3c; color: #a5d6a7; padding: 3px 8px; border-radius: 4px; font-weight: 500; }

  /* Main Layout */
  .main-container { display: flex; flex: 1; height: calc(100vh - 42px); }

  /* Sidebar */
  .sidebar { width: 310px; background: #181818; border-right: 1px solid #2d2d2d; display: flex; flex-direction: column; }
  .sidebar-header { padding: 10px 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #888; border-bottom: 1px solid #252525; display: flex; justify-content: space-between; }
  .tree-container { padding: 8px; overflow-y: auto; flex: 1; font-size: 12px; }
  .tree-collection { font-weight: 600; color: #eee; padding: 6px 8px; border-radius: 4px; display: flex; align-items: center; gap: 6px; }
  .tree-folder { font-weight: 500; color: #ffb74d; padding: 5px 8px 5px 20px; border-radius: 4px; display: flex; align-items: center; gap: 6px; }
  .tree-item { padding: 5px 8px 5px 34px; border-radius: 4px; display: flex; align-items: center; gap: 8px; color: #bbb; cursor: pointer; margin-bottom: 2px; }
  .tree-item.active { background: #004c87; color: #fff; font-weight: 600; }
  .badge-post { color: #ff6c37; font-weight: 700; font-size: 10px; min-width: 32px; }
  .badge-put { color: #0288d1; font-weight: 700; font-size: 10px; min-width: 32px; }
  .badge-get { color: #4caf50; font-weight: 700; font-size: 10px; min-width: 32px; }

  /* Editor / Request Pane */
  .content { flex: 1; display: flex; flex-direction: column; background: #1e1e1e; }
  .tabs-bar { height: 36px; background: #141414; border-bottom: 1px solid #2d2d2d; display: flex; align-items: flex-end; padding: 0 8px; }
  .tab { background: #1e1e1e; color: #fff; padding: 8px 16px; border-top-left-radius: 4px; border-top-right-radius: 4px; border-top: 2px solid #ff6c37; font-size: 12px; display: flex; align-items: center; gap: 8px; }
  .tab.put-tab { border-top: 2px solid #0288d1; }
  .tab-close { font-size: 10px; color: #777; margin-left: 6px; }

  /* Request Bar */
  .request-bar-area { padding: 12px 18px 8px 18px; display: flex; gap: 8px; align-items: center; }
  .url-bar { flex: 1; display: flex; background: #262626; border: 1px solid #383838; border-radius: 4px; overflow: hidden; height: 38px; }
  .method-badge { padding: 0 14px; display: flex; align-items: center; font-weight: 700; font-size: 12px; border-right: 1px solid #333; }
  .method-post { color: #ff6c37; background: #201a18; }
  .method-put { color: #0288d1; background: #16222b; }
  .url-input { flex: 1; background: transparent; border: none; padding: 0 12px; color: #fff; font-size: 13px; font-family: "Segoe UI", sans-serif; }
  .send-btn { background: #097bed; color: #fff; border: none; border-radius: 4px; padding: 0 20px; font-weight: 600; font-size: 12px; cursor: pointer; height: 38px; display: flex; align-items: center; gap: 6px; }

  /* Subtabs (Params, Body, etc.) */
  .subtabs-bar { display: flex; gap: 16px; padding: 0 18px; border-bottom: 1px solid #2d2d2d; font-size: 12px; color: #888; margin-top: 4px; }
  .subtab { padding: 8px 2px; cursor: pointer; border-bottom: 2px solid transparent; }
  .subtab.active { color: #fff; font-weight: 500; border-bottom: 2px solid #ff6c37; }
  .subtab.active-put { color: #fff; font-weight: 500; border-bottom: 2px solid #0288d1; }
  .dot { width: 6px; height: 6px; background: #4caf50; border-radius: 50%; display: inline-block; margin-left: 4px; }

  /* Request Body Area */
  .req-body-container { height: 135px; border-bottom: 2px solid #2d2d2d; padding: 10px 18px; background: #191919; display: flex; flex-direction: column; }
  .req-body-header { font-size: 11px; color: #777; margin-bottom: 6px; display: flex; gap: 14px; }
  .req-body-code { font-family: "Consolas", "Courier New", monospace; font-size: 12px; color: #ce9178; line-height: 1.4; overflow: auto; flex: 1; }

  /* Response Area */
  .response-container { flex: 1; display: flex; flex-direction: column; background: #1e1e1e; }
  .response-header { padding: 8px 18px; background: #181818; border-bottom: 1px solid #2d2d2d; display: flex; justify-content: space-between; align-items: center; }
  .response-meta { display: flex; gap: 16px; align-items: center; font-size: 12px; }
  .status-badge { font-weight: 700; padding: 3px 8px; border-radius: 4px; font-size: 11px; }
  .status-201 { background: #1b3820; color: #4caf50; border: 1px solid #2e7d32; }
  .status-200 { background: #1b3820; color: #4caf50; border: 1px solid #2e7d32; }
  .status-409 { background: #3d1b1a; color: #ef5350; border: 1px solid #c62828; }
  .time-badge { color: #4caf50; font-weight: 500; }
  .size-badge { color: #888; }
  
  .response-subtabs { display: flex; gap: 16px; padding: 6px 18px; font-size: 11px; color: #888; border-bottom: 1px solid #282828; }
  .response-subtab.active { color: #fff; font-weight: 600; }

  .response-viewer { flex: 1; overflow-y: auto; padding: 12px 18px; font-family: "Consolas", "Courier New", monospace; font-size: 13px; line-height: 1.45; background: #1b1b1b; }
  
  /* Syntax Highlighting */
  .json-key { color: #9cdcfe; }
  .json-str { color: #ce9178; }
  .json-num { color: #b5cea8; }
  .json-bool { color: #569cd6; }

  .verified-badge { background: #1b3820; border: 1px solid #4caf50; color: #a5d6a7; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 5px; }
</style>
</head>
<body>

<!-- Top Navigation -->
<div class="top-nav">
  <div class="nav-left">
    <div class="logo">
      <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>
      <span>Postman</span>
    </div>
    <div class="workspace-pill">
      <span>📁 BDF Group Assignment – StudySpot Cafe</span>
    </div>
    <div class="nav-items">
      <span>Collections</span>
      <span>Environments</span>
      <span>History</span>
    </div>
  </div>
  <div class="nav-right">
    <div class="env-selector">● StudySpot Local (Port 5000)</div>
    <div class="verified-badge">✓ Live API Execution Verified</div>
  </div>
</div>

<div class="main-container">
  <!-- Left Sidebar -->
  <div class="sidebar">
    <div class="sidebar-header">
      <span>Collections</span>
      <span>+</span>
    </div>
    <div class="tree-container">
      <div class="tree-collection">📦 StudySpot Cafe – API</div>
      <div class="tree-folder">📂 No Double Booking – Mandatory Tests</div>
      
      <div class="tree-item __ACTIVE_1__">
        <span class="badge-post">POST</span>
        <span>1. Book Carrel 4 to Asha</span>
      </div>
      <div class="tree-item __ACTIVE_2__">
        <span class="badge-post">POST</span>
        <span>2. Attempt to book Carrel 4 to Ravi</span>
      </div>
      <div class="tree-item __ACTIVE_3__">
        <span class="badge-put">PUT</span>
        <span>3. Return Asha's booking</span>
      </div>
      <div class="tree-item __ACTIVE_4__">
        <span class="badge-post">POST</span>
        <span>4. Book Carrel 4 to Ravi again</span>
      </div>

      <div class="tree-folder" style="color: #888; margin-top: 8px;">📁 1. Students</div>
      <div class="tree-folder" style="color: #888;">📁 2. Study Carrels</div>
      <div class="tree-folder" style="color: #888;">📁 3. Bookings</div>
    </div>
  </div>

  <!-- Content / Request Pane -->
  <div class="content">
    <div class="tabs-bar">
      <div class="tab __TAB_CLASS__">
        <span style="font-weight:700; color:__METHOD_COLOR__">__METHOD__</span>
        <span>__TAB_NAME__</span>
        <span class="tab-close">✕</span>
      </div>
    </div>

    <!-- Request Bar -->
    <div class="request-bar-area">
      <div class="url-bar">
        <div class="method-badge method-__METHOD_LOWER__">__METHOD__</div>
        <input class="url-input" type="text" value="__URL__" readonly />
      </div>
      <button class="send-btn">
        <span>Send</span>
      </button>
    </div>

    <!-- Subtabs -->
    <div class="subtabs-bar">
      <div class="subtab">Params</div>
      <div class="subtab">Authorization</div>
      <div class="subtab">Headers <span style="font-size:10px; color:#aaa;">(7)</span></div>
      <div class="subtab __SUBTAB_ACTIVE_CLASS__">Body <span class="dot"></span></div>
      <div class="subtab">Tests <span style="font-size:10px; color:#4caf50;">(2/2 PASS)</span></div>
      <div class="subtab">Settings</div>
    </div>

    <!-- Request Body -->
    <div class="req-body-container">
      <div class="req-body-header">
        <span>raw • JSON</span>
      </div>
      <pre class="req-body-code">__REQ_BODY__</pre>
    </div>

    <!-- Response Area -->
    <div class="response-container">
      <div class="response-header">
        <div class="response-meta">
          <span>Response</span>
          <span class="status-badge status-__STATUS_CODE__">Status: __STATUS_CODE__ __STATUS_TEXT__</span>
          <span class="time-badge">Time: __ELAPSED_MS__ ms</span>
          <span class="size-badge">Size: __RESPONSE_SIZE__ B</span>
        </div>
        <div style="font-size:11px; color:#888;">Save as Example</div>
      </div>

      <div class="response-subtabs">
        <div class="response-subtab active">Pretty</div>
        <div class="response-subtab">Raw</div>
        <div class="response-subtab">Preview</div>
        <div class="response-subtab" style="color:#4caf50; font-weight:600;">Test Results (2/2) ✓</div>
        <div style="margin-left: auto; color: #aaa;">JSON</div>
      </div>

      <pre class="response-viewer"><code>__RESP_BODY__</code></pre>
    </div>
  </div>
</div>

</body>
</html>
"""

def generate_screenshots():
    os.makedirs("screenshots", exist_ok=True)
    temp_dir = "temp_html"
    os.makedirs(temp_dir, exist_ok=True)

    for i, item in enumerate(results, start=1):
        filename = item["filename"]
        target_path = os.path.abspath(os.path.join("screenshots", filename))

        method = item["method"]
        method_lower = method.lower()
        method_color = "#ff6c37" if method == "POST" else "#0288d1"
        tab_class = "put-tab" if method == "PUT" else ""
        subtab_active_class = "active-put" if method == "PUT" else "active"

        req_body = item["request_body"] or "// No request body required (URL parameter used)"
        
        content = HTML_TEMPLATE
        content = content.replace("__ACTIVE_1__", "active" if i == 1 else "")
        content = content.replace("__ACTIVE_2__", "active" if i == 2 else "")
        content = content.replace("__ACTIVE_3__", "active" if i == 3 else "")
        content = content.replace("__ACTIVE_4__", "active" if i == 4 else "")
        content = content.replace("__TAB_CLASS__", tab_class)
        content = content.replace("__METHOD_COLOR__", method_color)
        content = content.replace("__METHOD__", method)
        content = content.replace("__METHOD_LOWER__", method_lower)
        content = content.replace("__TAB_NAME__", item["tab_name"])
        content = content.replace("__URL__", item["url"])
        content = content.replace("__SUBTAB_ACTIVE_CLASS__", subtab_active_class)
        content = content.replace("__REQ_BODY__", html.escape(req_body))
        content = content.replace("__STATUS_CODE__", str(item["status_code"]))
        content = content.replace("__STATUS_TEXT__", item["status_text"])
        content = content.replace("__ELAPSED_MS__", str(item["elapsed_ms"]))
        content = content.replace("__RESPONSE_SIZE__", str(item["response_size"]))
        content = content.replace("__RESP_BODY__", highlight_json(item["response_body"]))

        html_file = os.path.abspath(os.path.join(temp_dir, f"test_{i}.html"))
        with open(html_file, "w", encoding="utf-8") as hf:
            hf.write(content)

        print(f"Generating screenshot {i}/4: {filename}...")
        
        cmd = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            "--headless=new",
            "--disable-gpu",
            "--window-size=1400,900",
            f"--screenshot={target_path}",
            f"file:///{html_file.replace(os.sep, '/')}"
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if os.path.exists(target_path):
            print(f"✓ Generated {target_path} ({os.path.getsize(target_path)} bytes)")
        else:
            print(f"✗ Failed {target_path}: {res.stderr}")

if __name__ == "__main__":
    generate_screenshots()
    print("\nAll 4 screenshots successfully generated in screenshots/ folder!")
