from __future__ import annotations

import json
import os
import socket
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tkinter import BOTH, END, LEFT, RIGHT, Button, Entry, Frame, Label, Listbox, StringVar, Tk, colorchooser, messagebox


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "data" / "config.json"
DESIGN_PATH = ROOT / "data" / "site_design.json"
LAYOUT_DRAFT_PATH = ROOT / "data" / "home_layout_draft.json"

DEFAULT_CONFIG = {
    "title": "神州降神、經驗、修練試算、掉落查詢系統",
    "maker": "製作By文昌 慕容淵",
    "authRequired": False,
}
DEFAULT_DESIGN = {
    "theme": "jade",
    "accent": "#2dd4bf",
    "background": "#07111f",
}
DEFAULT_HOME_ITEMS = [
    {"id": "support", "title": "副降神試算", "subtitle": "組合副降神並計算能力加成"},
    {"id": "starAura", "title": "星等與靈氣", "subtitle": "計算降神數量與靈氣需求"},
    {"id": "training", "title": "修練機制", "subtitle": "統計材料與能力提升"},
    {"id": "monster", "title": "怪物查詢", "subtitle": "查等級、位置、技能、能力與掉落"},
    {"id": "reverse", "title": "掉落反查", "subtitle": "輸入道具名稱，反查會掉落的怪物"},
    {"id": "item", "title": "道具查詢", "subtitle": "查道具類型、能力與說明"},
    {"id": "compound", "title": "裝備合成", "subtitle": "挑裝備、配方與材料清單"},
]


def read_json(path: Path, default):
    if not path.exists():
        return json.loads(json.dumps(default, ensure_ascii=False))
    for encoding in ("utf-8-sig", "utf-8", "cp950", "big5"):
        try:
            return json.loads(path.read_text(encoding=encoding))
        except Exception:
            continue
    return json.loads(json.dumps(default, ensure_ascii=False))


def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        return


class PreviewServer:
    def __init__(self):
        self.port = find_free_port()
        self.httpd = ThreadingHTTPServer(("127.0.0.1", self.port), QuietHandler)
        self.thread = threading.Thread(target=self._serve, daemon=True)

    def _serve(self):
        old = os.getcwd()
        try:
            os.chdir(ROOT)
            self.httpd.serve_forever()
        finally:
            os.chdir(old)

    def start(self):
        self.thread.start()

    @property
    def url(self) -> str:
        return f"http://127.0.0.1:{self.port}/index.html"


class LayoutDesigner:
    def __init__(self):
        self.root = Tk()
        self.root.title("神州 Online 版面設計工具")
        self.root.geometry("760x620")
        self.server = PreviewServer()
        self.server.start()

        self.config = read_json(CONFIG_PATH, DEFAULT_CONFIG)
        self.design = read_json(DESIGN_PATH, DEFAULT_DESIGN)
        self.home_items = read_json(LAYOUT_DRAFT_PATH, DEFAULT_HOME_ITEMS)
        if not isinstance(self.home_items, list):
            self.home_items = DEFAULT_HOME_ITEMS[:]

        self.title_var = StringVar(value=str(self.config.get("title") or DEFAULT_CONFIG["title"]))
        self.maker_var = StringVar(value=str(self.config.get("maker") or DEFAULT_CONFIG["maker"]))
        self.accent_var = StringVar(value=str(self.design.get("accent") or DEFAULT_DESIGN["accent"]))
        self.bg_var = StringVar(value=str(self.design.get("background") or DEFAULT_DESIGN["background"]))
        self.selected_index = None

        self.build_ui()
        self.refresh_list()

    def build_ui(self):
        top = Frame(self.root, padx=14, pady=12)
        top.pack(fill=BOTH)

        Label(top, text="網站標題").pack(anchor="w")
        Entry(top, textvariable=self.title_var).pack(fill=BOTH, pady=(2, 8))

        Label(top, text="手機與桌機署名").pack(anchor="w")
        Entry(top, textvariable=self.maker_var).pack(fill=BOTH, pady=(2, 8))

        colors = Frame(top)
        colors.pack(fill=BOTH, pady=(4, 10))
        Button(colors, text="選主題色", command=self.pick_accent).pack(side=LEFT, padx=(0, 8))
        Entry(colors, textvariable=self.accent_var, width=14).pack(side=LEFT, padx=(0, 18))
        Button(colors, text="選背景色", command=self.pick_background).pack(side=LEFT, padx=(0, 8))
        Entry(colors, textvariable=self.bg_var, width=14).pack(side=LEFT)

        middle = Frame(self.root, padx=14)
        middle.pack(fill=BOTH, expand=True)
        left = Frame(middle)
        left.pack(side=LEFT, fill=BOTH, expand=True, padx=(0, 10))
        right = Frame(middle)
        right.pack(side=RIGHT, fill=BOTH)

        Label(left, text="首頁快捷卡片順序（可拖曳或用上下移動；目前先儲存設計草稿）").pack(anchor="w")
        self.listbox = Listbox(left, height=14)
        self.listbox.pack(fill=BOTH, expand=True, pady=(4, 8))
        self.listbox.bind("<<ListboxSelect>>", self.on_select)
        self.listbox.bind("<B1-Motion>", self.on_drag)

        Label(left, text="卡片標題").pack(anchor="w")
        self.card_title_var = StringVar()
        Entry(left, textvariable=self.card_title_var).pack(fill=BOTH, pady=(2, 8))
        Label(left, text="卡片說明").pack(anchor="w")
        self.card_subtitle_var = StringVar()
        Entry(left, textvariable=self.card_subtitle_var).pack(fill=BOTH, pady=(2, 8))

        Button(right, text="上移", width=14, command=lambda: self.move_selected(-1)).pack(pady=(22, 6))
        Button(right, text="下移", width=14, command=lambda: self.move_selected(1)).pack(pady=6)
        Button(right, text="套用文字", width=14, command=self.apply_card_text).pack(pady=6)
        Button(right, text="新增卡片", width=14, command=self.add_card).pack(pady=6)
        Button(right, text="刪除卡片", width=14, command=self.remove_card).pack(pady=6)

        bottom = Frame(self.root, padx=14, pady=12)
        bottom.pack(fill=BOTH)
        Button(bottom, text="儲存設定", command=self.save).pack(side=LEFT, padx=(0, 8))
        Button(bottom, text="開啟預覽", command=self.open_preview).pack(side=LEFT, padx=(0, 8))
        Button(bottom, text="儲存並預覽", command=self.save_and_preview).pack(side=LEFT)
        Label(bottom, text=self.server.url).pack(side=RIGHT)

    def refresh_list(self):
        self.listbox.delete(0, END)
        for item in self.home_items:
            self.listbox.insert(END, f"{item.get('title','未命名')}  -  {item.get('subtitle','')}")

    def on_select(self, _event=None):
        selection = self.listbox.curselection()
        if not selection:
            return
        self.selected_index = int(selection[0])
        item = self.home_items[self.selected_index]
        self.card_title_var.set(str(item.get("title", "")))
        self.card_subtitle_var.set(str(item.get("subtitle", "")))

    def on_drag(self, event):
        target = self.listbox.nearest(event.y)
        if self.selected_index is None or target == self.selected_index or target < 0:
            return
        item = self.home_items.pop(self.selected_index)
        self.home_items.insert(target, item)
        self.selected_index = target
        self.refresh_list()
        self.listbox.selection_set(target)

    def move_selected(self, step):
        if self.selected_index is None:
            return
        target = self.selected_index + step
        if target < 0 or target >= len(self.home_items):
            return
        self.home_items[self.selected_index], self.home_items[target] = self.home_items[target], self.home_items[self.selected_index]
        self.selected_index = target
        self.refresh_list()
        self.listbox.selection_set(target)

    def apply_card_text(self):
        if self.selected_index is None:
            return
        self.home_items[self.selected_index]["title"] = self.card_title_var.get().strip() or "未命名"
        self.home_items[self.selected_index]["subtitle"] = self.card_subtitle_var.get().strip()
        self.refresh_list()
        self.listbox.selection_set(self.selected_index)

    def add_card(self):
        self.home_items.append({"id": f"custom-{len(self.home_items)+1}", "title": "新增項目", "subtitle": ""})
        self.refresh_list()

    def remove_card(self):
        if self.selected_index is None:
            return
        self.home_items.pop(self.selected_index)
        self.selected_index = None
        self.card_title_var.set("")
        self.card_subtitle_var.set("")
        self.refresh_list()

    def pick_accent(self):
        color = colorchooser.askcolor(color=self.accent_var.get(), title="選主題色")[1]
        if color:
            self.accent_var.set(color)

    def pick_background(self):
        color = colorchooser.askcolor(color=self.bg_var.get(), title="選背景色")[1]
        if color:
            self.bg_var.set(color)

    def save(self):
        self.config["title"] = self.title_var.get().strip() or DEFAULT_CONFIG["title"]
        self.config["maker"] = self.maker_var.get().strip() or DEFAULT_CONFIG["maker"]
        self.design["theme"] = "custom"
        self.design["accent"] = self.accent_var.get().strip() or DEFAULT_DESIGN["accent"]
        self.design["background"] = self.bg_var.get().strip() or DEFAULT_DESIGN["background"]
        write_json(CONFIG_PATH, self.config)
        write_json(DESIGN_PATH, self.design)
        write_json(LAYOUT_DRAFT_PATH, self.home_items)
        messagebox.showinfo("完成", "已儲存設定。預覽頁若已開啟，請按 F5 重新整理。")

    def open_preview(self):
        webbrowser.open(self.server.url)

    def save_and_preview(self):
        self.save()
        self.open_preview()

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    LayoutDesigner().run()
