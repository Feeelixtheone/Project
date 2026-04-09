# VPS Configuration Guide - RestaurantApp
## Server: 92.113.27.90

---

## 1. MySQL Setup

### Install MySQL 8.0
```bash
sudo apt update
sudo apt install mysql-server -y
sudo systemctl enable mysql
sudo systemctl start mysql
```

### Secure MySQL
```bash
sudo mysql_secure_installation
# Set root password, remove anonymous users, disable remote root login
```

### Create Database and User
```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE restaurant_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'restaurant_app'@'%' IDENTIFIED BY 'AlphaWRHED12@_';
GRANT ALL PRIVILEGES ON restaurant_app.* TO 'restaurant_app'@'%';
FLUSH PRIVILEGES;
EXIT;
```

### Allow Remote Connections (for phpMyAdmin or app)
Edit MySQL config:
```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```
Change:
```
bind-address = 0.0.0.0
```
Restart:
```bash
sudo systemctl restart mysql
```

### Import Schema
```bash
mysql -u restaurant_app -p'AlphaWRHED12@_' restaurant_app < schema.sql
```

---

## 2. phpMyAdmin Setup

### Install
```bash
sudo apt install phpmyadmin php-mbstring php-zip php-gd php-json php-curl -y
```
During install: select Apache2, configure with dbconfig-common.

### Enable
```bash
sudo phpenmod mbstring
sudo systemctl restart apache2
```

### Access
Open browser: `http://92.113.27.90/phpmyadmin`
Login with: `restaurant_app` / `AlphaWRHED12@_`

### Import Schema via phpMyAdmin
1. Login to phpMyAdmin
2. Select `restaurant_app` database
3. Click "Import" tab
4. Upload `schema.sql` file
5. Click "Go"

---

## 3. Backend (FastAPI) Deployment

### Install Python 3.11+
```bash
sudo apt install python3 python3-pip python3-venv -y
```

### Setup App
```bash
cd /opt
mkdir restaurant-app && cd restaurant-app
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Environment File (.env)
Create `/opt/restaurant-app/backend/.env`:
```
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=restaurant_app
MYSQL_PASSWORD=AlphaWRHED12@_
MYSQL_DB=restaurant_app
STRIPE_API_KEY=sk_test_your_key_here
JWT_SECRET=your-secret-key-here
ADMIN_EMAIL=mutinyretreat37@gmail.com
ADMIN_PASSWORD=karaplange2
```

### Systemd Service
Create `/etc/systemd/system/restaurant-api.service`:
```ini
[Unit]
Description=RestaurantApp FastAPI Backend
After=network.target mysql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/restaurant-app/backend
Environment="PATH=/opt/restaurant-app/venv/bin"
ExecStart=/opt/restaurant-app/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable restaurant-api
sudo systemctl start restaurant-api
```

---

## 4. Nginx Reverse Proxy

### Install
```bash
sudo apt install nginx -y
```

### Config
Create `/etc/nginx/sites-available/restaurant-app`:
```nginx
server {
    listen 80;
    server_name 92.113.27.90;

    # API routes
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Stripe webhook
    location /api/webhook/stripe {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
    }

    # Frontend static files (for web version)
    location / {
        root /opt/restaurant-app/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/restaurant-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 5. Firewall

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3306/tcp  # MySQL (for remote phpMyAdmin if needed)
sudo ufw enable
```

---

## 6. SSL (Optional but Recommended)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

## 7. Build Android APK (Capacitor)

From frontend directory:
```bash
# Build web assets
npx expo export --platform web

# Sync with Capacitor
npx cap sync android

# Build APK
cd android
./gradlew assembleDebug
# APK at: android/app/build/outputs/apk/debug/app-debug.apk

# For release build:
./gradlew assembleRelease
```

---

## 8. Monitoring

### Check service status
```bash
sudo systemctl status restaurant-api
sudo systemctl status mysql
sudo systemctl status nginx
```

### View logs
```bash
journalctl -u restaurant-api -f
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/mysql/error.log
```

### MySQL connection test
```bash
mysql -u restaurant_app -p'AlphaWRHED12@_' -h 127.0.0.1 restaurant_app -e "SHOW TABLES;"
```
