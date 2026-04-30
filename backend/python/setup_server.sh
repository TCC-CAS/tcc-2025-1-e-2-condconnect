#!/bin/bash
# CondConnect Flask Backend Setup Script
# Run as root on AWS Lightsail (Ubuntu)

set -e

echo "=== Installing Python dependencies ==="
apt-get update -y
apt-get install -y python3 python3-pip python3-venv

echo "=== Creating app directory ==="
mkdir -p /var/www/html/condconnect/backend/python
cp -r "$(dirname "$0")"/* /var/www/html/condconnect/backend/python/

echo "=== Creating virtual environment ==="
cd /var/www/html/condconnect/backend/python
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "=== Creating systemd service ==="
cat > /etc/systemd/system/condconnect-flask.service << 'EOF'
[Unit]
Description=CondConnect Flask Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/html/condconnect/backend/python
Environment="PATH=/var/www/html/condconnect/backend/python/venv/bin"
ExecStart=/var/www/html/condconnect/backend/python/venv/bin/gunicorn \
    --workers 3 \
    --bind 127.0.0.1:5000 \
    --timeout 60 \
    app:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "=== Enabling and starting service ==="
systemctl daemon-reload
systemctl enable condconnect-flask
systemctl start condconnect-flask

echo "=== Enabling Apache proxy modules ==="
a2enmod proxy proxy_http headers rewrite
systemctl reload apache2

echo "=== Done! Flask running on port 5000 ==="
systemctl status condconnect-flask
