import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('153.92.223.119', username='root', password='Mokhtar1234@#', timeout=10)

# Check the last AI reply in messages table for this company
stdin,stdout,stderr = client.exec_command("PGPASSWORD=mokhtar1234 psql -h localhost -U appuser -d maxp << 'SQL'
SELECT m.\"content\", m.\"createdAt\", m.\"metadata\", c.\"facebookId\", c.id as customer_id
FROM messages m 
JOIN conversations cv ON cv.id = m.\"conversationId\"
JOIN customers c ON c.id = cv.\"customerId\"
WHERE m.\"isFromCustomer\" = false 
  AND cv.\"companyId\" = 'cmleybpf70028juo2wwpmp8rt'
ORDER BY m.\"createdAt\" DESC 
LIMIT 5;
SQL")
print("Messages:", stdout.read().decode())

client.close()
