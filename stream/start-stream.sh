#!/bin/bash

# 1. Čiščenje
killall -9 Xvfb chromium-browser ffmpeg 2>/dev/null

# 2. Virtualni zaslon
Xvfb :99 -screen 0 1920x1080x24 &
sleep 3

# 3. Zagon brskalnika (Dodal sem par trikov za boljši rendering)
DISPLAY=:99 chromium-browser \
  --no-sandbox \
  --disable-setuid-sandbox \
  --disable-dev-shm-usage \
  --disable-gpu \
  --kiosk \
  --window-size=1920,1080 \
  --window-position=0,0 \
  "https://www.tradingview.com/chart/RbBZg9Zz/?symbol=PEPPERSTONE%3AXAUUSD" &

# Počakamo dlje, da se indikatorji izračunajo
sleep 20

# 4. Kick povezava
STREAM_URL="rtmps://fa723fc1b171.global-contribute.live-video.net/app/sk_us-west-2_auybjR5dmw91_cFFO0G35e9jGWbZLmyuktyYppNFnts"

# 5. FFmpeg zagon
DISPLAY=:99 ffmpeg -nostdin \
  -f x11grab -video_size 1920x1080 -framerate 30 -i :99 \
  -stream_loop -1 -re -i /var/www/gainwave/stream/background_music.mp3 \
  -c:v libx264 -preset veryfast -b:v 4500k -maxrate 4500k -bufsize 9000k \
  -pix_fmt yuv420p -g 60 \
  -c:a aac -b:a 128k -ar 44100 \
  -f flv "$STREAM_URL"
