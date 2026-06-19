"""
zalo_web_sender.py — Gửi ảnh hóa đơn qua Zalo Web (chat.zalo.me) tự động.

Lần đầu chạy (setup đăng nhập):
    python zalo_web_sender.py --setup

Gửi ảnh bình thường:
    python zalo_web_sender.py --phone 0702399126 --file "C:\\path\\hoadon.png"

Yêu cầu:
    pip install playwright
    python -m playwright install chromium
"""

import sys
import io
import time
import argparse
import os

# Fix encoding cho Windows subprocess (cp1252 không encode được emoji)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
except ImportError:
    print("Thieu playwright. Chay: pip install playwright && python -m playwright install chromium")
    sys.exit(1)

# ── Cấu hình ──────────────────────────────────────────────────────────────────

# File lưu session (cookies + localStorage) — không lock như persistent_context
STORAGE_STATE_PATH = os.path.join(
    os.environ.get('APPDATA', os.path.expanduser('~')),
    'ZaloBot', 'storage_state.json'
)

ZALO_URL   = 'https://chat.zalo.me'
VIEWPORT   = {'width': 1100, 'height': 700}
TIMEOUT    = 30_000

# Tọa độ nút ảnh trong toolbar Zalo Web (viewport 1100x700)
IMG_BTN_X  = 478
IMG_BTN_Y  = 630

# ── Setup lần đầu ─────────────────────────────────────────────────────────────

def setup_login():
    os.makedirs(os.path.dirname(STORAGE_STATE_PATH), exist_ok=True)
    print("Mo trinh duyet de dang nhap Zalo Web...")
    print("Quet QR code bang Zalo dien thoai.")
    print("SAU KHI dang nhap xong -> nhan Enter trong cua so nay.")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, args=['--no-sandbox'])
        context = browser.new_context(viewport=VIEWPORT)
        page = context.new_page()
        page.goto(ZALO_URL)

        input("\n>>> Nhan Enter sau khi da thay giao dien chat Zalo: ")

        context.storage_state(path=STORAGE_STATE_PATH)
        print(f"Session da luu: {STORAGE_STATE_PATH}")
        browser.close()
        print("Setup hoan thanh!")

# ── Gửi ảnh ───────────────────────────────────────────────────────────────────

def send_image(phone: str, file_path: str):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Khong tim thay file: {file_path}")
    if not os.path.exists(STORAGE_STATE_PATH):
        raise RuntimeError(
            "Chua co session. Chay: python zalo_web_sender.py --setup"
        )

    print(f"Gui cho {phone} <- {os.path.basename(file_path)}")

    with sync_playwright() as p:
        # Dung launch() + storage_state — khong lock profile
        browser = p.chromium.launch(
            headless=True,
            args=['--no-sandbox'],
        )
        context = browser.new_context(
            storage_state=STORAGE_STATE_PATH,
            viewport=VIEWPORT,
        )
        page = context.new_page()

        # 1. Mo Zalo Web
        page.goto(ZALO_URL, wait_until='domcontentloaded')
        print("Mo Zalo Web...")
        time.sleep(4)

        # 2. Kiem tra dang nhap
        sc1 = os.path.join(os.environ.get('USERPROFILE', ''), 'Desktop', 'zalo_step1_login.png')
        page.screenshot(path=sc1)
        print(f"URL hien tai: {page.url}")
        print(f"Screenshot login: {sc1}")
        if 'chat.zalo.me' not in page.url:
            browser.close()
            raise RuntimeError("Session het han. Chay lai --setup")
        print("Da xac nhan dang nhap")

        # 3. Tim kiem contact
        print(f"Tim kiem {phone}...")
        search_clicked = False
        for sel in [
            'input[placeholder="Tim kiem"]',
            'input[placeholder*="kiem"]',
            'input[placeholder*="Search"]',
            'input[type="text"]',
        ]:
            try:
                el = page.locator(sel).first
                el.wait_for(timeout=5000)
                el.click()
                el.fill(phone)
                search_clicked = True
                break
            except Exception:
                continue

        if not search_clicked:
            page.keyboard.press('Control+f')
            time.sleep(0.5)
            page.keyboard.type(phone)

        time.sleep(2.5)

        # 4. Click vao ket qua dau tien
        result_clicked = False
        for sel in [
            f'text="{phone}"',
            f':text("{phone}")',
            'div[class*="list-item"] >> nth=0',
            'li[class*="item"] >> nth=0',
        ]:
            try:
                el = page.locator(sel).first
                el.wait_for(timeout=5000)
                el.click()
                result_clicked = True
                print("Da mo chat")
                break
            except Exception:
                continue

        if not result_clicked:
            dbg = os.path.join(os.environ.get('USERPROFILE', ''), 'Desktop', 'zalo_debug.png')
            page.screenshot(path=dbg)
            browser.close()
            raise RuntimeError(f"Khong click duoc ket qua search. Xem: {dbg}")

        time.sleep(1.5)
        sc2 = os.path.join(os.environ.get('USERPROFILE', ''), 'Desktop', 'zalo_step2_chat.png')
        page.screenshot(path=sc2)
        print(f"Screenshot sau khi mo chat: {sc2}")

        # 5. Dong dialog "Dong bo ngay" neu co
        try:
            sync_btn = page.locator('button:has-text("Dong bo"), button:has-text("bo ngay")').first
            sync_btn.wait_for(timeout=3000)
            sync_btn.click()
            print("Da dong dialog dong bo")
            time.sleep(1)
        except Exception:
            pass

        # 6. Upload anh — click toa do nut anh (478, 630) + file chooser
        sc3 = os.path.join(os.environ.get('USERPROFILE', ''), 'Desktop', 'zalo_step3_before_upload.png')
        page.screenshot(path=sc3)
        print(f"Screenshot truoc upload: {sc3}")
        print("Upload anh...")
        uploaded = False

        for x, y in [(IMG_BTN_X, IMG_BTN_Y), (IMG_BTN_X + 2, IMG_BTN_Y), (IMG_BTN_X - 2, IMG_BTN_Y)]:
            try:
                with page.expect_file_chooser(timeout=8000) as fc_info:
                    page.mouse.click(x, y)
                fc_info.value.set_files(file_path)
                uploaded = True
                print(f"Upload thanh cong tai ({x}, {y})")
                break
            except Exception as ex:
                print(f"  ({x},{y}) that bai: {ex}")

        if not uploaded:
            sc = os.path.join(os.environ.get('USERPROFILE', ''), 'Desktop', 'zalo_upload_fail.png')
            page.screenshot(path=sc)
            browser.close()
            raise RuntimeError(f"Khong upload duoc anh. Xem: {sc}")

        time.sleep(2)

        # 7. Gui
        page.keyboard.press('Enter')
        time.sleep(2)

        # 8. Screenshot xac nhan
        sc = os.path.join(os.environ.get('USERPROFILE', ''), 'Desktop', 'zalo_sent.png')
        page.screenshot(path=sc)
        print(f"Screenshot xac nhan: {sc}")
        print(f"Da gui anh hoa don cho {phone}")
        browser.close()

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--setup', action='store_true')
    parser.add_argument('--phone')
    parser.add_argument('--file')
    args = parser.parse_args()

    try:
        if args.setup:
            setup_login()
        elif args.phone and args.file:
            send_image(phone=args.phone, file_path=args.file)
        else:
            parser.print_help()
            sys.exit(1)
    except Exception as e:
        print(f"Loi: {e}", file=sys.stderr)
        sys.exit(1)
