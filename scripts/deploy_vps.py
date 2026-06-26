import paramiko
import time
import sys
import io

HOST = "203.194.115.184"
USER = "root"
PASS = "d$rCDnG4%9MU56"
APP_DIR = "/var/www/nokosku"

H2H_ENV = """
# H2H.id API
H2H_MEMBER_ID="riogaming"
H2H_PASSWORD="9HGQQxs5zcE"
H2H_PIN="085085"
"""

def run(client, cmd, timeout=300, show_output=True):
    """Run command and stream output, return (stdout_text, exit_code)"""
    print(f"\n\033[94m>>> {cmd[:100]}{'...' if len(cmd)>100 else ''}\033[0m")
    
    transport = client.get_transport()
    channel = transport.open_session()
    channel.set_combine_stderr(True)
    channel.get_pty(width=200)
    channel.exec_command(cmd)
    
    out = ""
    deadline = time.time() + timeout
    while not channel.exit_status_ready():
        if time.time() > deadline:
            print("\033[91m[TIMEOUT]\033[0m")
            break
        if channel.recv_ready():
            chunk = channel.recv(8192).decode("utf-8", errors="replace")
            out += chunk
            if show_output:
                print(chunk, end="", flush=True)
        else:
            time.sleep(0.2)
    
    # drain
    while channel.recv_ready():
        chunk = channel.recv(8192).decode("utf-8", errors="replace")
        out += chunk
        if show_output:
            print(chunk, end="", flush=True)
    
    ec = channel.recv_exit_status()
    channel.close()
    print(f"\n\033[{'92' if ec==0 else '91'}m[exit: {ec}]\033[0m")
    return out, ec

def sftp_write(sftp, remote_path, content):
    """Write content to remote file via SFTP"""
    with sftp.open(remote_path, "w") as f:
        f.write(content)
    print(f"  -> Written {remote_path}")

def main():
    print("=" * 70)
    print("NOKOSKU VPS DEPLOYMENT — FULL AUTOMATED")
    print("=" * 70)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    print(f"\nConnecting to {HOST}...")
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    print("[OK] SSH connected!")

    # ── Step 1: Check existing setup ─────────────────────────────────────────
    print("\n" + "="*50)
    print("STEP 1: Check existing environment")
    print("="*50)
    run(client, "node --version 2>/dev/null && echo 'Node OK' || echo 'Node NOT found'", timeout=10)
    run(client, "pm2 --version 2>/dev/null && echo 'PM2 OK' || echo 'PM2 NOT found'", timeout=10)
    run(client, "nginx -v 2>&1 | head -1 && echo 'Nginx OK' || echo 'Nginx NOT found'", timeout=10)
    run(client, f"test -d {APP_DIR}/.git && echo 'Repo exists' || echo 'Repo NOT found'", timeout=10)

    # ── Step 2: Update & Install dependencies if needed ──────────────────────
    print("\n" + "="*50)
    print("STEP 2: System packages")
    print("="*50)
    run(client, "apt-get update -y 2>&1 | tail -3", timeout=120)
    
    # Install Node.js if not present
    out, _ = run(client, "node --version 2>/dev/null || echo 'MISSING'", timeout=10)
    if "MISSING" in out or "not found" in out:
        print("Installing Node.js LTS...")
        run(client, "curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && apt-get install -y nodejs", timeout=300)
    
    # Install PM2 if not present
    out, _ = run(client, "pm2 --version 2>/dev/null || echo 'MISSING'", timeout=10)
    if "MISSING" in out or "not found" in out:
        run(client, "npm install -g pm2", timeout=120)
    
    # Install Nginx if not present
    out, _ = run(client, "nginx -v 2>/dev/null || echo 'MISSING'", timeout=10)
    if "MISSING" in out or "not found" in out:
        run(client, "apt-get install -y nginx && systemctl enable nginx && systemctl start nginx", timeout=120)

    # ── Step 3: Git pull / clone ──────────────────────────────────────────────
    print("\n" + "="*50)
    print("STEP 3: Pull latest code")
    print("="*50)
    out, _ = run(client, f"test -d {APP_DIR}/.git && echo 'EXISTS'", timeout=10)
    
    if "EXISTS" in out:
        print("Repo exists — pulling latest...")
        run(client, f"cd {APP_DIR} && git fetch --all && git reset --hard origin/main && git pull origin main 2>&1", timeout=120)
    else:
        print("Cloning repo...")
        REPO = "https://github.com/riownidek/nokosku.id.git"
        run(client, f"mkdir -p /var/www && git clone {REPO} {APP_DIR} 2>&1", timeout=120)

    # ── Step 4: Update .env ───────────────────────────────────────────────────
    print("\n" + "="*50)
    print("STEP 4: Update .env with H2H credentials")
    print("="*50)
    
    # Check if H2H vars already exist
    out, _ = run(client, f"grep -c 'H2H_MEMBER_ID' {APP_DIR}/.env 2>/dev/null || echo '0'", timeout=10)
    if out.strip() == "0" or "0" in out:
        run(client, f"cat >> {APP_DIR}/.env << 'ENVEOF'\n{H2H_ENV}\nENVEOF", timeout=15)
        print("H2H credentials appended to .env")
    else:
        print("H2H credentials already in .env")
    
    run(client, f"grep 'H2H_' {APP_DIR}/.env", timeout=10)

    # ── Step 5: Install npm deps ──────────────────────────────────────────────
    print("\n" + "="*50)
    print("STEP 5: npm install")
    print("="*50)
    run(client, f"cd {APP_DIR} && npm install --prefer-offline 2>&1 | tail -5", timeout=300)
    run(client, f"cd {APP_DIR} && npx prisma generate 2>&1 | tail -5", timeout=120)

    # ── Step 6: Build ─────────────────────────────────────────────────────────
    print("\n" + "="*50)
    print("STEP 6: npm run build (this may take 3-7 minutes)")
    print("="*50)
    out, ec = run(client, f"cd {APP_DIR} && npm run build 2>&1", timeout=600)
    
    if ec != 0:
        print("\033[91mBUILD FAILED! Showing last 50 lines of output:\033[0m")
        lines = out.strip().split("\n")
        print("\n".join(lines[-50:]))
        client.close()
        sys.exit(1)
    
    print("\033[92mBuild SUCCESSFUL!\033[0m")

    # ── Step 7: Restart PM2 ───────────────────────────────────────────────────
    print("\n" + "="*50)
    print("STEP 7: PM2 restart with updated env")
    print("="*50)
    
    # Check if PM2 app exists
    out, _ = run(client, "pm2 list 2>/dev/null | grep nokosku || echo 'NOT_RUNNING'", timeout=15)
    
    if "NOT_RUNNING" in out or "nokosku" not in out:
        # Create ecosystem config
        eco = f"""module.exports = {{
  apps: [{{
    name: 'nokosku',
    cwd: '{APP_DIR}',
    script: 'node_modules/.bin/next',
    args: 'start',
    env_file: '{APP_DIR}/.env',
    env: {{
      NODE_ENV: 'production',
      PORT: 10000,
    }},
    max_memory_restart: '512M',
    restart_delay: 3000,
    instances: 1,
  }}],
}};"""
        run(client, f"cat > {APP_DIR}/ecosystem.config.js << 'ECOEOF'\n{eco}\nECOEOF", timeout=15)
        run(client, f"pm2 start {APP_DIR}/ecosystem.config.js --env production 2>&1", timeout=60)
    else:
        run(client, f"cd {APP_DIR} && pm2 restart nokosku --update-env 2>&1", timeout=60)
    
    run(client, "pm2 save && pm2 startup systemd -u root --hp /root 2>&1 | tail -5", timeout=30)
    run(client, "pm2 status", timeout=15)

    # ── Step 8: Configure Nginx ───────────────────────────────────────────────
    print("\n" + "="*50)
    print("STEP 8: Nginx config")
    print("="*50)
    
    nginx_conf = """server {
    listen 80;
    server_name nokosku.id www.nokosku.id admin.nokosku.id;

    # Fix 502 pada logout/clear-session: tingkatkan buffer header
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
    run(client, f"cat > /etc/nginx/sites-available/nokosku << 'NGEOF'\n{nginx_conf}\nNGEOF", timeout=15)
    run(client, "ln -sf /etc/nginx/sites-available/nokosku /etc/nginx/sites-enabled/ && rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true", timeout=10)
    run(client, "nginx -t && systemctl reload nginx", timeout=30)

    # ── Step 9: SSL Certbot ───────────────────────────────────────────────────
    print("\n" + "="*50)
    print("STEP 9: SSL Certificate")
    print("="*50)
    
    # Check if certbot is installed
    out, _ = run(client, "certbot --version 2>/dev/null || echo 'MISSING'", timeout=10)
    if "MISSING" in out:
        run(client, "apt-get install -y certbot python3-certbot-nginx 2>&1 | tail -5", timeout=120)
    
    # Check if cert already exists
    out, _ = run(client, "certbot certificates 2>/dev/null | grep 'nokosku.id' || echo 'NO_CERT'", timeout=30)
    if "NO_CERT" in out or "nokosku.id" not in out:
        run(client,
            "certbot --nginx -d nokosku.id -d www.nokosku.id -d admin.nokosku.id "
            "--non-interactive --agree-tos --email admin@nokosku.id --redirect 2>&1",
            timeout=120)
    else:
        print("SSL cert already exists — renewing if needed...")
        run(client, "certbot renew --dry-run 2>&1 | tail -5", timeout=60)
    
    run(client, "systemctl reload nginx", timeout=15)

    # ── Final health check ────────────────────────────────────────────────────
    print("\n" + "="*50)
    print("FINAL: Health Check")
    print("="*50)
    
    time.sleep(3)  # wait for PM2 to fully start
    run(client, "pm2 status", timeout=15)
    run(client, "curl -sk --max-time 10 https://nokosku.id/api/dev/health 2>/dev/null || curl -s --max-time 10 http://localhost:10000/api/dev/health 2>/dev/null || echo 'Health check pending...'", timeout=20)
    run(client, "systemctl status nginx --no-pager -l | head -10", timeout=15)

    client.close()
    print("\n" + "=" * 70)
    print("DEPLOYMENT COMPLETE!")
    print("App: https://nokosku.id")
    print("Admin: https://admin.nokosku.id")
    print("Webhook H2H: https://nokosku.id/api/webhooks/h2h")
    print("=" * 70)

if __name__ == "__main__":
    main()
