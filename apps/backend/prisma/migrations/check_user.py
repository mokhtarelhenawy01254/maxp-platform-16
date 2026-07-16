import subprocess, json

env = {"PGPASSWORD": "mokhtar1234"}

# Check user in DB
r = subprocess.run(["psql", "-h", "localhost", "-U", "appuser", "-d", "maxp", "-t", "-c",
    "SELECT id, email FROM users WHERE email='admin@hotelsalam.com';"],
    capture_output=True, text=True, env=env)
print("DB user check:", r.stdout.strip() if r.stdout.strip() else "NOT FOUND")

# Try login against localhost:3007
r = subprocess.run(["curl", "-s", "http://localhost:3007/api/v1/auth/login",
    "-H", "Content-Type: application/json",
    "-d", '{"email":"admin@hotelsalam.com","password":"Test123!"}'],
    capture_output=True, text=True)
try:
    d = json.loads(r.stdout)
    print("Login response:", json.dumps(d, ensure_ascii=False)[:200])
except:
    print("Login raw:", r.stdout[:200])
    print("Login error:", r.stderr[:200])
