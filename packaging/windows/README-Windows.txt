Prospectus AI - Windows portable bundle
=======================================

No separate Node.js install required: this folder includes node\node.exe.
No separate Python install required for agents: python-embed\ bootstraps a local venv on first launch.

Start
-----
1. Double-click Prospectus AI.exe, or install the ProspectusAI-Setup installer and use the shortcut.
2. First launch creates venv\ and installs Python packages on this machine (5-20 minutes depending on network).
3. The desktop window starts the local service and opens the app automatically.
4. If needed, use Open-Prospectus-UI.cmd as a browser fallback.
5. In the app, open Model & inference settings to configure Qwen or an OpenAI-compatible API.

GPU (optional)
--------------
This bundle uses CPU PyTorch by default. For NVIDIA GPU, activate the venv and reinstall CUDA builds
per https://pytorch.org/get-started/locally/

Troubleshooting
---------------
- If Windows SmartScreen warns: click More info -> Run anyway (or sign the app for distribution).
- Antivirus may slow first run while scanning venv and node.

中文简要说明
------------
无需单独安装 Node.js（已包含 node\node.exe）或系统 Python（首次启动会用 python-embed 在本机创建 venv）。
第一次启动会安装 Python 依赖，可能需要 5-20 分钟；之后双击 Prospectus AI.exe 会自动启动本地服务并打开桌面窗口；也可使用 Open-Prospectus-UI.cmd 作为浏览器备用入口。
首次请在“Model & inference”页面配置本地 Qwen 或 OpenAI 兼容 API。
