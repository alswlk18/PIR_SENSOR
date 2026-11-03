"""아두이노 시리얼(9600)에서 한 줄씩 값을 읽어 Supabase readings.value에 저장한다.

사용법:
    .venv/bin/python upload.py                      # 포트 자동 탐색
    .venv/bin/python upload.py /dev/cu.usbmodem2101  # 포트 직접 지정
"""
import argparse
import os
import sys

import serial
from serial.tools import list_ports
from dotenv import load_dotenv
from supabase import create_client

BAUD_RATE = 9600


def find_port():
    for p in list_ports.comports():
        if "usbmodem" in p.device or "usbserial" in p.device or "Arduino" in (p.manufacturer or ""):
            return p.device
    return None


def parse_value(line):
    text = line.strip()
    if not text:
        return None
    if text.upper() in ("HIGH", "TRUE", "ON"):
        return 1.0
    if text.upper() in ("LOW", "FALSE", "OFF"):
        return 0.0
    try:
        return float(text)
    except ValueError:
        return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("port", nargs="?", help="시리얼 포트 (생략하면 자동 탐색)")
    args = parser.parse_args()

    load_dotenv()
    url = os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("VITE_SUPABASE_ANON_KEY")
    if not url or not key:
        sys.exit(".env에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY가 필요합니다.")

    port = args.port or find_port()
    if not port:
        sys.exit("아두이노 포트를 찾지 못했습니다. 아두이노 IDE의 Tools > Port 이름을 인자로 넘겨주세요.")

    supabase = create_client(url, key)
    print(f"포트 {port} ({BAUD_RATE}) 에서 읽는 중... 중지: Ctrl+C")

    with serial.Serial(port, BAUD_RATE, timeout=2) as ser:
        while True:
            raw = ser.readline().decode("utf-8", errors="ignore")
            value = parse_value(raw)
            if value is None:
                continue
            try:
                supabase.table("readings").insert({"value": value}).execute()
                print(value)
            except Exception as e:  # 네트워크/권한 오류가 나도 계속 읽는다
                print(f"저장 실패: {e}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n종료")
