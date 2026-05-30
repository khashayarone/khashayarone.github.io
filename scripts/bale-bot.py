#!/usr/bin/env python3
"""
Bale Bot — Connection Handler for Tool Platform
Links users from the web platform to their Bale chat for receiving download notifications.

Features:
  - Receives connection codes from users
  - Creates connection files in data/bale-connections/
  - Sends download notifications with inline buttons
  - Handles /start, /help, and connection code commands

Part of Vanilla Micro-SPA Tool Platform
"""

import json
import os
import sys
import time
import uuid
from datetime import datetime, timezone

import requests

# ============================================
# Configuration
# ============================================

BALE_TOKEN = os.environ.get("BALE_BOT_TOKEN", "")
BALE_API = f"https://tapi.bale.ai/bot{BALE_TOKEN}"
BOT_USERNAME = "khashayarbot"
PLATFORM_URL = "https://khashayarone.github.io"

# Storage paths
CONNECTIONS_DIR = "data/bale-connections"
STATE_FILE = f"{CONNECTIONS_DIR}/bot_state.json"

# Polling config
POLL_TIMEOUT = 25  # Seconds
MAX_UPDATES = 10

# ============================================
# Ensure directories exist
# ============================================

os.makedirs(CONNECTIONS_DIR, exist_ok=True)

# ============================================
# State Management
# ============================================

def load_state():
    """Load bot state (last update_id) from file."""
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {"last_update_id": 0, "connected_users": {}}


def save_state(state):
    """Save bot state to file."""
    os.makedirs(CONNECTIONS_DIR, exist_ok=True)
    with open(STATE_FILE, 'w', encoding='utf-8') as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def save_connection(code, user_data):
    """Save connection file for a user."""
    connection_file = f"{CONNECTIONS_DIR}/{code}.json"
    connection_data = {
        "code": code,
        "chat_id": user_data.get("chat_id"),
        "username": user_data.get("username", ""),
        "first_name": user_data.get("first_name", ""),
        "last_name": user_data.get("last_name", ""),
        "connected_at": datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        "status": "connected"
    }
    with open(connection_file, 'w', encoding='utf-8') as f:
        json.dump(connection_data, f, ensure_ascii=False, indent=2)
    return connection_data


def connection_exists(code):
    """Check if a connection code already exists."""
    return os.path.exists(f"{CONNECTIONS_DIR}/{code}.json")


# ============================================
# API Helpers
# ============================================

def api_call(method, params=None, files=None, timeout=15):
    """
    Make an API call to Bale bot API.
    Returns response JSON or None on failure.
    """
    url = f"{BALE_API}/{method}"
    try:
        if files:
            response = requests.post(url, data=params, files=files, timeout=timeout)
        elif params:
            response = requests.post(url, json=params, timeout=timeout)
        else:
            response = requests.get(url, timeout=timeout)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                return data.get("result")
            else:
                print(f"  ⚠️ API error ({method}): {data.get('description', 'Unknown')}")
                return None
        else:
            print(f"  ❌ HTTP {response.status_code} for {method}")
            return None
    except requests.RequestException as e:
        print(f"  ❌ Request failed ({method}): {e}")
        return None


def get_updates(offset=0, timeout=POLL_TIMEOUT):
    """Get updates using long polling."""
    params = {
        "offset": offset,
        "limit": MAX_UPDATES,
        "timeout": timeout
    }
    return api_call("getUpdates", params) or []


def send_message(chat_id, text, reply_markup=None):
    """Send a text message to a user."""
    params = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown"
    }
    if reply_markup:
        params["reply_markup"] = reply_markup
    return api_call("sendMessage", params)


def answer_callback(callback_query_id, text=None, show_alert=False):
    """Answer a callback query."""
    params = {
        "callback_query_id": callback_query_id
    }
    if text:
        params["text"] = text
    if show_alert:
        params["show_alert"] = True
    return api_call("answerCallbackQuery", params)


# ============================================
# Message Handlers
# ============================================

def generate_connection_code():
    """Generate a unique, user-friendly connection code."""
    # Format: XXXX-XXXX-XXXX (uppercase, easy to type)
    code = uuid.uuid4().hex[:12].upper()
    return f"{code[:4]}-{code[4:8]}-{code[8:12]}"


def handle_start(chat_id, user):
    """Handle /start command."""
    first_name = user.get("first_name", "کاربر")
    
    welcome_text = (
        f"🎉 *سلام {first_name} عزیز!*\n\n"
        f"به ربات Tool Platform خوش اومدی! 🚀\n\n"
        f"من اینجام تا وقتی از ابزارهای پلتفرم استفاده می‌کنی، "
        f"نتیجه دانلود و خروجی کارهات رو برات همینجا بفرستم.\n\n"
        f"📌 *برای اتصال حساب کاربریت:*\n"
        f"۱. وارد لینک زیر شو:\n"
        f"[باز کردن Tool Platform]({PLATFORM_URL})\n\n"
        f"۲. از منوی سمت راست برو به *تنظیمات*\n"
        f"۳. روی کارت *اتصال ربات بله* کلیک کن\n"
        f"۴. کدی که بهت نشون داده میشه رو کپی کن\n"
        f"۵. همون کد رو *اینجا برام بفرست*\n\n"
        f"✨ بعد از اتصال، هر وقت از ابزارها استفاده کنی، "
        f"نتیجه رو همینجا با دکمه‌های دانلود دریافت می‌کنی!"
    )
    
    keyboard = {
        "inline_keyboard": [
            [
                {
                    "text": "🔗 باز کردن Tool Platform",
                    "url": PLATFORM_URL
                }
            ],
            [
                {
                    "text": "❓ راهنما",
                    "callback_data": "help"
                }
            ]
        ]
    }
    
    send_message(chat_id, welcome_text, keyboard)


def handle_help(chat_id):
    """Handle help command."""
    help_text = (
        "📚 *راهنمای ربات Tool Platform*\n\n"
        "این ربات برای دریافت خروجی ابزارهای پلتفرم Tool Platform استفاده میشه.\n\n"
        "🔹 *ابزارهای فعلی:*\n"
        "• 🎬 دانلودر یوتوب\n"
        "• 🔍 فیلم‌یاب\n"
        "• 🛡️ پروکسی‌یاب\n\n"
        "🔹 *نحوه اتصال:*\n"
        f"از منوی *تنظیمات* داخل [{PLATFORM_URL}]({PLATFORM_URL}) "
        "کد اتصال رو دریافت کن و همینجا بفرست.\n\n"
        "🔹 *بعد از اتصال:*\n"
        "وقتی از ابزارها استفاده کنی، فایل خروجی "
        "با دکمه‌های دانلود همینجا برات ارسال میشه.\n\n"
        "❓ سوال دیگه‌ای داری؟ به پشتیبانی پیام بده."
    )
    send_message(chat_id, help_text)


def handle_code_submission(chat_id, user, code):
    """Handle a connection code submitted by user."""
    code = code.strip().upper()
    
    # Validate code format: XXXX-XXXX-XXXX
    if not (len(code) == 14 and code[4] == '-' and code[9] == '-'):
        send_message(
            chat_id,
            "⚠️ *کد نامعتبر است!*\n\n"
            "کد اتصال باید به این شکل باشه:\n"
            "`XXXX-XXXX-XXXX`\n\n"
            "لطفاً کد رو دقیقاً از بخش *تنظیمات* داخل Tool Platform کپی کن و بفرست."
        )
        return
    
    # Check if already connected
    if connection_exists(code):
        send_message(
            chat_id,
            "ℹ️ این کد قبلاً استفاده شده و اتصال برقراره!\n\n"
            "اگر می‌خوای با یه کد جدید متصل بشی، از تنظیمات پلتفرم کد جدید بگیر."
        )
        return
    
    # Create connection
    user_data = {
        "chat_id": chat_id,
        "username": user.get("username", ""),
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", "")
    }
    
    connection = save_connection(code, user_data)
    
    # Update state
    state = load_state()
    state["connected_users"][str(chat_id)] = {
        "code": code,
        "connected_at": connection["connected_at"]
    }
    save_state(state)
    
    # Success message
    success_text = (
        "✅ *اتصال با موفقیت برقرار شد!*\n\n"
        f"🎉 حساب کاربری شما با کد `{code}` به ربات متصل شد.\n\n"
        "از این به بعد، هر وقت از ابزارهای Tool Platform استفاده کنی، "
        "نتیجه دانلود و فایل‌های خروجی رو همینجا دریافت می‌کنی.\n\n"
        "📥 *دکمه‌های دانلود* زیر هر پیام قرار می‌گیرن.\n"
        "🔄 *آپدیت خودکار* — همه چیز بلادرنگ انجام میشه."
    )
    
    keyboard = {
        "inline_keyboard": [
            [
                {
                    "text": "🔗 باز کردن Tool Platform",
                    "url": PLATFORM_URL
                }
            ]
        ]
    }
    
    send_message(chat_id, success_text, keyboard)


def handle_callback(callback_query):
    """Handle inline button callbacks."""
    query_id = callback_query.get("id")
    data = callback_query.get("data", "")
    message = callback_query.get("message", {})
    chat_id = message.get("chat", {}).get("id")
    
    if not chat_id:
        answer_callback(query_id, "خطا در پردازش")
        return
    
    if data == "help":
        answer_callback(query_id)
        handle_help(chat_id)
    else:
        answer_callback(query_id, "ناشناخته")


def handle_message(message):
    """Handle an incoming message."""
    text = message.get("text", "").strip()
    chat_id = message.get("chat", {}).get("id")
    user = message.get("from", {})
    
    if not chat_id:
        return
    
    # Check if it's a command
    if text.startswith("/"):
        command = text.split()[0].lower()
        
        if command == "/start":
            handle_start(chat_id, user)
        elif command == "/help":
            handle_help(chat_id)
        elif command == "/code":
            # Generate and show a new code (for testing)
            code = generate_connection_code()
            send_message(
                chat_id,
                f"🔑 *کد اتصال جدید:*\n\n`{code}`\n\n"
                f"این کد رو از بخش *تنظیمات* Tool Platform وارد کن."
            )
        else:
            send_message(chat_id, f"❓ دستور ناشناخته: `{text}`\n\nاز /help برای راهنما استفاده کن.")
    else:
        # Check if it looks like a connection code (XXXX-XXXX-XXXX)
        if len(text) == 14 and text[4] == '-' and text[9] == '-':
            handle_code_submission(chat_id, user, text)
        else:
            # Not a code — user might need help
            send_message(
                chat_id,
                "👋 سلام!\n\n"
                "برای اتصال به Tool Platform، کد اتصال رو از بخش *تنظیمات* دریافت کن و همینجا بفرست.\n\n"
                "کد به این شکله: `XXXX-XXXX-XXXX`\n\n"
                "راهنما: /help"
            )


# ============================================
# Main Bot Loop
# ============================================

def main():
    print("=" * 60)
    print("🤖 Bale Bot — Connection Handler")
    print(f"   Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print("=" * 60)
    
    if not BALE_TOKEN:
        print("❌ BALE_BOT_TOKEN not set!")
        print("   Add it to GitHub Secrets: Settings → Secrets → Actions → BALE_BOT_TOKEN")
        return
    
    # Load state
    state = load_state()
    last_update_id = state.get("last_update_id", 0)
    
    # Get updates
    print(f"📡 Polling for updates (offset: {last_update_id})...")
    updates = get_updates(offset=last_update_id + 1)
    
    if not updates:
        print("   No new updates")
        return
    
    print(f"   Received {len(updates)} update(s)")
    
    # Process updates
    for update in updates:
        update_id = update.get("update_id", 0)
        
        # Update state
        if update_id > last_update_id:
            last_update_id = update_id
        
        # Handle different update types
        if "message" in update:
            message = update["message"]
            handle_message(message)
            
            user_info = message.get("from", {})
            user_name = user_info.get("first_name", "Unknown")
            text_preview = (message.get("text") or message.get("caption") or "[non-text]")[:50]
            print(f"   📩 @{user_name}: {text_preview}")
            
        elif "callback_query" in update:
            callback = update["callback_query"]
            handle_callback(callback)
            
            user_info = callback.get("from", {})
            user_name = user_info.get("first_name", "Unknown")
            print(f"   🔘 Callback from @{user_name}: {callback.get('data', '?')}")
    
    # Save state
    state["last_update_id"] = last_update_id
    save_state(state)
    print(f"✅ Processed. Last update_id: {last_update_id}")


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"❌ Bot error: {e}", file=sys.stderr)
        sys.exit(1)
