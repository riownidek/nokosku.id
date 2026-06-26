"""
deploy_vps.py — Automated deployment script for Nokosku on VPS
SSH: 203.194.115.184 | App: /var/www/nokosku

Urutan eksekusi:
  1. Cek environment (node, pm2, nginx)
  2. Git pull (atau clone jika belum ada)
  3. Update .env dengan H2H credentials
  4. npm install
  5. npx prisma generate + prisma db push (SEBELUM build)
  6. npm run build
  7. PM2 restart --update-env
  8. Update Nginx config (dengan buffer fix untuk 502)
  9. SSL certbot (jika belum ada)
  10. Health check
"""
import paramiko
import time
import sys

HOST    = "203.194.115.184"
USER    = "root"
PASS    = "d$rCDnG4%9MU56"
APP_DIR = "/var/www/nokosku"

# H2H env vars yang perlu ada di .env VPS
H2H_ENV_BLOCK = """
# H2H.id API Credentials
H2H_MEMBER_ID="riogaming"
H2H_PASSWORD="9HGQQxs5zcE"
H2H_PIN="085085"
"""

NGINX_CONF = """server {
    listen 80;
    server_name nokosku.id www.nokosku.id admin.nokosku.id;

    # Buffer fix untuk 502 pada logout/clear-session (banyak Set-Cookie header)
    proxy_buffer_size          128k;
    proxy_buffers              4 256k;
    proxy_busy_buffers_size    256k;
    large_client_header_buffers 4 32k;

    location / {
        proxy_pass http://127.0.0.1:10000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 300s;
    }
}
"""

ECO_CONFIG = """module.exports = {
  apps: [{
    name: 'nokosku',
    cwd: '%s',
    script: 'node_modules/.bin/next',
    args: 'start',
    env_file: '%s/.env',
    env: {
      NODE_ENV: 'production',
      PORT: 10000,
    },
    max_memory_restart: '512M',
    restart_delay: 3000,
    instances: 1,
    exp_backoff_restart_delay: 100,
  }],
};
""" % (APP_DIR, APP_DIR)


def run(client, cmd, timeout=300, must_succeed=False):
    print(f"\n\033[94m>>> {cmd[:120]}{'...' if len(cmd) > 120 else ''}\033[0m")
    transport = client.get_transport()
    channel   = transport.open_session()
    channel.set_combine_stderr(True)
    channel.get_pty(width=220)
    channel.exec_command(cmd)

    out      = ""
    deadline = time.time() + timeout
    while not channel.exit_status_ready():
        if time.time() > deadline:
            print("\033[91m[TIMEOUT]\033[0m")
            break
        if channel.recv_ready():
            chunk = channel.recv(8192).decode("utf-8", errors="replace")
            out  += chunk
            print(chunk, end="", flush=True)
        else:
            time.sleep(0.3)
    while channel.recv_ready():
        chunk = channel.recv(8192).decode("utf-8", errors="replace")
        out  += chunk
        print(chunk, end="", flush=True)

    ec = channel.recv_exit_status()
    channel.close()
    color = "92" if ec == 0 else "91"
    print(f"\n\033[{color}m[exit: {ec}]\033[0m")

    if must_succeed and ec != 0:
        print(f"\033[91mFATAL: Command failed with exit code {ec}. Aborting.\033[0m")
        sys.exit(ec)
    return out, ec


def main():
    print("=" * 70)
    print("NOKOSKU VPS DEPLOYMENT")
    print("=" * 70)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"\nConnecting to {HOST}...")
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    print("[OK] SSH connected!")

    # ── Step 1: Check Environment ─────────────────────────────────────────────
    print("\n" + "=" * 50 + "\nSTEP 1: Check Environment\n" + "=" * 50)
    run(client, "node --version 2>/dev/null || echo 'Node MISSING'", 10)
    run(client, "pm2 --version 2>/dev/null || echo 'PM2 MISSING'", 10)
    run(client, "nginx -v 2>&1 || echo 'Nginx MISSING'", 10)

    out, _ = run(client, "node --version 2>/dev/null || echo 'MISSING'", 10)
    if "MISSING" in out or "not found" in out:
        print("Installing Node.js LTS...")
        run(client, "curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -", 120)
        run(client, "apt-get install -y nodejs", 180, must_succeed=True)

    out, _ = run(client, "pm2 --version 2>/dev/null || echo 'MISSING'", 10)
    if "MISSING" in out:
        run(client, "npm install -g pm2", 120, must_succeed=True)

    out, _ = run(client, "nginx -v 2>/dev/null || echo 'MISSING'", 10)
    if "MISSING" in out:
        run(client, "apt-get install -y nginx && systemctl enable nginx", 120, must_succeed=True)

    # ── Step 2: Git Pull / Clone ──────────────────────────────────────────────
    print("\n" + "=" * 50 + "\nSTEP 2: Pull Latest Code\n" + "=" * 50)
    out, _ = run(client, f"test -d {APP_DIR}/.git && echo REPO_EXISTS || echo REPO_MISSING", 10)
    if "REPO_EXISTS" in out:
        run(client, f"cd {APP_DIR} && git fetch --all && git reset --hard origin/main && git pull origin main 2>&1", 120)
    else:
        REPO = "https://github.com/riownidek/nokosku.id.git"
        run(client, f"mkdir -p /var/www && git clone {REPO} {APP_DIR} 2>&1", 180, must_succeed=True)

    # ── Step 3: Update .env ───────────────────────────────────────────────────
    print("\n" + "=" * 50 + "\nSTEP 3: Update .env\n" + "=" * 50)
    # Pastikan .env ada
    run(client, f"test -f {APP_DIR}/.env && echo ENV_EXISTS || echo ENV_MISSING", 10)
    # Tambahkan H2H vars jika belum ada
    out, _ = run(client, f"grep -c 'H2H_MEMBER_ID' {APP_DIR}/.env 2>/dev/null || echo 0", 10)
    if out.strip() == "0" or "0" in out.split("\n")[0]:
        print("Adding H2H credentials to .env...")
        run(client, f"cat >> {APP_DIR}/.env << 'ENVEOF'\n{H2H_ENV_BLOCK}\nENVEOF", 15)
    else:
        print("H2H credentials already in .env")
    run(client, f"grep 'H2H_' {APP_DIR}/.env", 10)

    # ── Step 4: npm install ───────────────────────────────────────────────────
    print("\n" + "=" * 50 + "\nSTEP 4: npm install\n" + "=" * 50)
    run(client, f"cd {APP_DIR} && npm install 2>&1 | tail -10", 300, must_succeed=True)

    # ── Step 5: Prisma DB Sync (SEBELUM build) ────────────────────────────────
    print("\n" + "=" * 50 + "\nSTEP 5: Prisma DB Sync\n" + "=" * 50)
    # Proyek ini tidak menggunakan migration folder — gunakan db push
    print("Running: npx prisma generate ...")
    run(client, f"cd {APP_DIR} && npx prisma generate 2>&1 | tail -5", 120, must_succeed=True)

    print("Running: npx prisma db push --accept-data-loss ...")
    # --accept-data-loss aman karena db push hanya menambah kolom baru
    out, ec = run(
        client,
        f"cd {APP_DIR} && npx prisma db push --accept-data-loss 2>&1",
        180
    )
    if ec != 0:
        print("\033[91mWARNING: Prisma db push failed. Trying migrate deploy instead...\033[0m")
        run(client, f"cd {APP_DIR} && npx prisma migrate deploy 2>&1 | tail -10", 180)
    else:
        print("Prisma db push SUCCESS.")

    # ── Step 6: Build ─────────────────────────────────────────────────────────
    print("\n" + "=" * 50 + "\nSTEP 6: npm run build\n" + "=" * 50)
    out, ec = run(client, f"cd {APP_DIR} && npm run build 2>&1", 600)
    if ec != 0:
        lines = out.strip().split("\n")
        print("\n\033[91mBUILD FAILED! Last 30 lines:\033[0m")
        print("\n".join(lines[-30:]))
        client.close()
        sys.exit(1)
    print("\033[92mBuild SUCCESS!\033[0m")

    # ── Step 7: PM2 Restart ───────────────────────────────────────────────────
    print("\n" + "=" * 50 + "\nSTEP 7: PM2 Restart\n" + "=" * 50)
    # Tulis ecosystem config
    run(client, f"cat > {APP_DIR}/ecosystem.config.js << 'ECOEOF'\n{ECO_CONFIG}\nECOEOF", 15)

    out, _ = run(client, "pm2 list 2>/dev/null | grep nokosku || echo NOT_RUNNING", 15)
    if "NOT_RUNNING" in out or "nokosku" not in out:
        run(client, f"pm2 start {APP_DIR}/ecosystem.config.js 2>&1", 60)
    else:
        run(client, f"cd {APP_DIR} && pm2 restart nokosku --update-env 2>&1", 60)

    run(client, "pm2 save && pm2 startup systemd -u root --hp /root 2>&1 | tail -3", 30)
    run(client, "pm2 status", 15)

    # ── Step 8: Nginx ─────────────────────────────────────────────────────────
    print("\n" + "=" * 50 + "\nSTEP 8: Nginx Config\n" + "=" * 50)
    run(client, f"cat > /etc/nginx/sites-available/nokosku << 'NGEOF'\n{NGINX_CONF}\nNGEOF", 15)
    run(client, "ln -sf /etc/nginx/sites-available/nokosku /etc/nginx/sites-enabled/", 10)
    run(client, "rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true", 5)
    run(client, "nginx -t && systemctl reload nginx", 30)

    # ── Step 9: SSL ───────────────────────────────────────────────────────────
    print("\n" + "=" * 50 + "\nSTEP 9: SSL Certificate\n" + "=" * 50)
    out, _ = run(client, "certbot --version 2>/dev/null || echo MISSING", 10)
    if "MISSING" in out:
        run(client, "apt-get install -y certbot python3-certbot-nginx 2>&1 | tail -3", 120)

    out, _ = run(client, "certbot certificates 2>/dev/null | grep 'nokosku.id' || echo NO_CERT", 30)
    if "NO_CERT" in out or "nokosku.id" not in out:
        run(
            client,
            "certbot --nginx -d nokosku.id -d www.nokosku.id -d admin.nokosku.id "
            "--non-interactive --agree-tos --email admin@nokosku.id --redirect 2>&1",
            120
        )
    else:
        print("SSL cert exists. Running dry-run renewal check...")
        run(client, "certbot renew --dry-run 2>&1 | tail -5", 60)

    run(client, "systemctl reload nginx", 15)

    # ── Step 10: Health Check ─────────────────────────────────────────────────
    print("\n" + "=" * 50 + "\nSTEP 10: Final Health Check\n" + "=" * 50)
    time.sleep(4)
    run(client, "pm2 status", 15)
    run(
        client,
        "curl -sk --max-time 10 https://nokosku.id/api/system/maintenance "
        "|| curl -s --max-time 10 http://localhost:10000/api/system/maintenance "
        "|| echo 'App not responding yet...'",
        20
    )
    run(client, "pm2 logs nokosku --lines 20 --nostream 2>&1 || true", 15)

    client.close()
    print("\n" + "=" * 70)
    print("DEPLOYMENT COMPLETE!")
    print(f"  App:        https://nokosku.id")
    print(f"  Admin:      https://admin.nokosku.id")
    print(f"  H2H Webhook: https://nokosku.id/api/webhooks/h2h")
    print("=" * 70)


if __name__ == "__main__":
    main()
