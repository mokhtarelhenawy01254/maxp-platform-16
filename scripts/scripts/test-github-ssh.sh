#!/bin/bash

# 🧪 سكريبت اختبار اتصال SSH من GitHub Actions
# يمكن تشغيله محلياً لمحاكاة سلوك GitHub Actions

echo "🧪 اختبار اتصال SSH (محاكاة GitHub Actions)..."
echo "=========================================="

# قراءة المتغيرات
read -p "أدخل SERVER_HOST (مثال: mokhtarelhenawy.online): " SERVER_HOST
read -p "أدخل SERVER_USER (مثال: root): " SERVER_USER
read -p "أدخل مسار SSH Key (مثال: ~/.ssh/id_rsa): " SSH_KEY_PATH

# التحقق من وجود المفتاح
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo "❌ المفتاح غير موجود: $SSH_KEY_PATH"
    exit 1
fi

# التحقق من صلاحيات المفتاح
KEY_PERMS=$(stat -c %a "$SSH_KEY_PATH" 2>/dev/null || stat -f %A "$SSH_KEY_PATH" 2>/dev/null)
if [ "$KEY_PERMS" != "600" ]; then
    echo "⚠️ صلاحيات المفتاح غير صحيحة ($KEY_PERMS)"
    echo "إصلاح الصلاحيات..."
    chmod 600 "$SSH_KEY_PATH"
fi

echo ""
echo "📋 معلومات الاتصال:"
echo "  Host: $SERVER_HOST"
echo "  User: $SERVER_USER"
echo "  Key: $SSH_KEY_PATH"
echo ""

# 1. اختبار Ping
echo "1️⃣ اختبار Ping..."
if ping -c 3 "$SERVER_HOST" > /dev/null 2>&1; then
    echo "✅ السيرفر يستجيب للـ ping"
else
    echo "⚠️ السيرفر لا يستجيب للـ ping (قد يكون ICMP محجوباً)"
fi

# 2. اختبار Port 22
echo ""
echo "2️⃣ اختبار Port 22..."
if timeout 10 bash -c "cat < /dev/null > /dev/tcp/$SERVER_HOST/22" 2>/dev/null; then
    echo "✅ Port 22 مفتوح"
else
    echo "❌ Port 22 مغلق أو محجوب"
    echo "تحقق من Firewall على السيرفر"
    exit 1
fi

# 3. اختبار SSH Connection (Verbose)
echo ""
echo "3️⃣ اختبار اتصال SSH (Verbose)..."
echo "محاولة الاتصال..."
ssh -v -i "$SSH_KEY_PATH" \
    -o ConnectTimeout=30 \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    "$SERVER_USER@$SERVER_HOST" \
    "echo '✅ SSH connection successful'; whoami; hostname; pwd" 2>&1 | tee /tmp/ssh_test.log

SSH_EXIT_CODE=${PIPESTATUS[0]}

echo ""
if [ $SSH_EXIT_CODE -eq 0 ]; then
    echo "✅ الاتصال نجح!"
else
    echo "❌ الاتصال فشل (Exit Code: $SSH_EXIT_CODE)"
    echo ""
    echo "📋 تحليل الخطأ:"
    
    if grep -q "Permission denied" /tmp/ssh_test.log; then
        echo "❌ خطأ في الصلاحيات - تحقق من:"
        echo "   1. المفتاح العام موجود في ~/.ssh/authorized_keys على السيرفر"
        echo "   2. صلاحيات ~/.ssh/authorized_keys هي 600 أو 644"
        echo "   3. صلاحيات ~/.ssh هي 700"
    fi
    
    if grep -q "Connection timed out" /tmp/ssh_test.log; then
        echo "❌ انتهت مهلة الاتصال - تحقق من:"
        echo "   1. Firewall على السيرفر يسمح بـ Port 22"
        echo "   2. Security Groups على مزود الاستضافة"
        echo "   3. SSH Service يعمل على السيرفر"
    fi
    
    if grep -q "Connection refused" /tmp/ssh_test.log; then
        echo "❌ الاتصال مرفوض - تحقق من:"
        echo "   1. SSH Service يعمل: sudo systemctl status ssh"
        echo "   2. Port 22 مفتوح: sudo netstat -tulpn | grep :22"
    fi
    
    if grep -q "Host key verification failed" /tmp/ssh_test.log; then
        echo "⚠️ فشل التحقق من مفتاح المضيف"
        echo "   حذف المفتاح القديم: ssh-keygen -R $SERVER_HOST"
    fi
fi

# 4. اختبار الأوامر
if [ $SSH_EXIT_CODE -eq 0 ]; then
    echo ""
    echo "4️⃣ اختبار تنفيذ الأوامر..."
    
    echo "اختبار 1: معلومات النظام"
    ssh -i "$SSH_KEY_PATH" \
        -o ConnectTimeout=30 \
        -o StrictHostKeyChecking=no \
        "$SERVER_USER@$SERVER_HOST" \
        "uname -a; df -h | head -n 5"
    
    echo ""
    echo "اختبار 2: فحص PM2"
    ssh -i "$SSH_KEY_PATH" \
        -o ConnectTimeout=30 \
        -o StrictHostKeyChecking=no \
        "$SERVER_USER@$SERVER_HOST" \
        "which pm2 && pm2 list || echo 'PM2 not found'"
    
    echo ""
    echo "اختبار 3: فحص Node.js"
    ssh -i "$SSH_KEY_PATH" \
        -o ConnectTimeout=30 \
        -o StrictHostKeyChecking=no \
        "$SERVER_USER@$SERVER_HOST" \
        "which node && node --version || echo 'Node.js not found'"
fi

# 5. اختبار نقل الملفات (SCP)
if [ $SSH_EXIT_CODE -eq 0 ]; then
    echo ""
    echo "5️⃣ اختبار نقل الملفات (SCP)..."
    
    # إنشاء ملف اختبار
    echo "test file content" > /tmp/ssh_test_file.txt
    
    # نقل الملف
    if scp -i "$SSH_KEY_PATH" \
        -o ConnectTimeout=30 \
        -o StrictHostKeyChecking=no \
        /tmp/ssh_test_file.txt \
        "$SERVER_USER@$SERVER_HOST:/tmp/"; then
        echo "✅ نقل الملف نجح"
        
        # التحقق من الملف
        ssh -i "$SSH_KEY_PATH" \
            -o ConnectTimeout=30 \
            -o StrictHostKeyChecking=no \
            "$SERVER_USER@$SERVER_HOST" \
            "cat /tmp/ssh_test_file.txt && rm /tmp/ssh_test_file.txt"
    else
        echo "❌ فشل نقل الملف"
    fi
    
    rm /tmp/ssh_test_file.txt
fi

# 6. اختبار Timeout
echo ""
echo "6️⃣ اختبار Timeout (محاكاة GitHub Actions)..."
echo "محاولة الاتصال مع timeout 120 ثانية..."

timeout 120 ssh -i "$SSH_KEY_PATH" \
    -o ConnectTimeout=120 \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=3 \
    -o StrictHostKeyChecking=no \
    "$SERVER_USER@$SERVER_HOST" \
    "echo 'Connected'; sleep 5; echo 'Done'"

TIMEOUT_EXIT=$?
if [ $TIMEOUT_EXIT -eq 124 ]; then
    echo "❌ انتهت المهلة (Timeout) - قد تحتاج لزيادة timeout في GitHub Actions"
elif [ $TIMEOUT_EXIT -eq 0 ]; then
    echo "✅ الاتصال نجح ضمن المهلة"
else
    echo "⚠️ خطأ آخر (Exit Code: $TIMEOUT_EXIT)"
fi

# النتيجة النهائية
echo ""
echo "=========================================="
echo "📊 ملخص النتائج:"
echo ""

if [ $SSH_EXIT_CODE -eq 0 ]; then
    echo "✅ جميع الاختبارات نجحت!"
    echo ""
    echo "💡 الخطوات التالية:"
    echo "   1. تأكد من أن GitHub Secrets تحتوي على نفس القيم"
    echo "   2. تأكد من أن المفتاح الخاص كامل في SERVER_SSH_KEY"
    echo "   3. جرّب تشغيل GitHub Actions workflow"
else
    echo "❌ فشلت بعض الاختبارات"
    echo ""
    echo "🔧 خطوات الإصلاح:"
    echo "   1. راجع الأخطاء أعلاه"
    echo "   2. شغّل سكريبت verify-ssh-server.sh على السيرفر"
    echo "   3. تحقق من Firewall وSecurity Groups"
    echo "   4. تحقق من GitHub Secrets"
fi

echo ""
echo "📝 Log الكامل محفوظ في: /tmp/ssh_test.log"
