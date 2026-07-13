#!/bin/bash

# 🔍 سكريبت التحقق من إعدادات SSH على السيرفر
# يجب تشغيله على السيرفر مباشرة

echo "🔍 فحص إعدادات SSH على السيرفر..."
echo "=========================================="

# 1. فحص حالة SSH Service
echo ""
echo "1️⃣ حالة SSH Service:"
if systemctl is-active --quiet ssh; then
    echo "✅ SSH Service يعمل"
    systemctl status ssh --no-pager | head -n 5
else
    echo "❌ SSH Service متوقف"
    echo "تشغيل SSH..."
    sudo systemctl start ssh
fi

# 2. فحص Port 22
echo ""
echo "2️⃣ فحص Port 22:"
if sudo netstat -tulpn | grep -q ":22"; then
    echo "✅ Port 22 مفتوح ويستمع"
    sudo netstat -tulpn | grep ":22"
else
    echo "❌ Port 22 غير مفتوح"
fi

# 3. فحص Firewall (UFW)
echo ""
echo "3️⃣ فحص Firewall (UFW):"
if command -v ufw &> /dev/null; then
    echo "حالة UFW:"
    sudo ufw status | grep -E "Status|22"
    
    if sudo ufw status | grep -q "22.*ALLOW"; then
        echo "✅ Port 22 مسموح في UFW"
    else
        echo "⚠️ Port 22 قد يكون محجوباً في UFW"
        echo "للسماح بـ SSH: sudo ufw allow 22/tcp"
    fi
else
    echo "ℹ️ UFW غير مثبت"
fi

# 4. فحص iptables
echo ""
echo "4️⃣ فحص iptables:"
if sudo iptables -L INPUT -n | grep -q "dpt:22"; then
    echo "✅ قواعد iptables موجودة للـ Port 22"
    sudo iptables -L INPUT -n | grep "dpt:22"
else
    echo "ℹ️ لا توجد قواعد iptables محددة للـ Port 22"
fi

# 5. فحص SSH Configuration
echo ""
echo "5️⃣ فحص إعدادات SSH:"
if [ -f /etc/ssh/sshd_config ]; then
    echo "Port:"
    grep "^Port" /etc/ssh/sshd_config || echo "  Port 22 (default)"
    
    echo "PermitRootLogin:"
    grep "^PermitRootLogin" /etc/ssh/sshd_config || echo "  غير محدد (قد يكون yes)"
    
    echo "PubkeyAuthentication:"
    grep "^PubkeyAuthentication" /etc/ssh/sshd_config || echo "  yes (default)"
    
    echo "PasswordAuthentication:"
    grep "^PasswordAuthentication" /etc/ssh/sshd_config || echo "  غير محدد"
    
    echo "UseDNS:"
    grep "^UseDNS" /etc/ssh/sshd_config || echo "  غير محدد (قد يسبب بطء)"
else
    echo "❌ ملف sshd_config غير موجود"
fi

# 6. فحص Authorized Keys
echo ""
echo "6️⃣ فحص Authorized Keys:"
if [ -f ~/.ssh/authorized_keys ]; then
    echo "✅ ملف authorized_keys موجود"
    echo "عدد المفاتيح: $(grep -c "^ssh-" ~/.ssh/authorized_keys 2>/dev/null || echo 0)"
    echo "صلاحيات الملف:"
    ls -la ~/.ssh/authorized_keys
    
    # التحقق من الصلاحيات الصحيحة
    perms=$(stat -c %a ~/.ssh/authorized_keys 2>/dev/null || stat -f %A ~/.ssh/authorized_keys 2>/dev/null)
    if [ "$perms" = "600" ] || [ "$perms" = "644" ]; then
        echo "✅ الصلاحيات صحيحة ($perms)"
    else
        echo "⚠️ الصلاحيات غير صحيحة ($perms) - يجب أن تكون 600 أو 644"
        echo "لإصلاحها: chmod 600 ~/.ssh/authorized_keys"
    fi
else
    echo "❌ ملف authorized_keys غير موجود"
    echo "إنشاء المجلد: mkdir -p ~/.ssh && chmod 700 ~/.ssh"
fi

# 7. فحص SSH Logs
echo ""
echo "7️⃣ آخر محاولات الاتصال (من auth.log):"
if [ -f /var/log/auth.log ]; then
    echo "آخر 10 محاولات SSH:"
    sudo tail -n 50 /var/log/auth.log | grep -i "sshd" | tail -n 10
else
    echo "⚠️ ملف auth.log غير موجود"
fi

# 8. فحص Network Connectivity
echo ""
echo "8️⃣ فحص الاتصال بالشبكة:"
echo "عنوان IP العام:"
curl -s ifconfig.me || echo "⚠️ فشل الحصول على IP العام"

echo ""
echo "الواجهات الشبكية:"
ip addr show | grep -E "inet |UP"

# 9. فحص GitHub Actions IPs (اختياري)
echo ""
echo "9️⃣ معلومات GitHub Actions IPs:"
echo "للسماح بـ GitHub Actions، راجع: https://api.github.com/meta"
echo "أو استخدم: curl -s https://api.github.com/meta | jq .actions"

# 10. اختبار الاتصال المحلي
echo ""
echo "🔟 اختبار الاتصال المحلي:"
if ssh -o BatchMode=yes -o ConnectTimeout=5 localhost exit 2>/dev/null; then
    echo "✅ الاتصال المحلي يعمل"
else
    echo "⚠️ فشل الاتصال المحلي - قد تكون هناك مشكلة في الإعدادات"
fi

# 11. توصيات
echo ""
echo "=========================================="
echo "📋 التوصيات:"
echo ""

# التحقق من UseDNS
if ! grep -q "^UseDNS no" /etc/ssh/sshd_config 2>/dev/null; then
    echo "⚡ لتسريع الاتصال، أضف إلى /etc/ssh/sshd_config:"
    echo "   UseDNS no"
    echo "   ثم: sudo systemctl restart ssh"
    echo ""
fi

# التحقق من PermitRootLogin
if ! grep -q "^PermitRootLogin" /etc/ssh/sshd_config 2>/dev/null; then
    echo "🔐 للسماح بـ root login عبر SSH Key فقط:"
    echo "   PermitRootLogin prohibit-password"
    echo "   ثم: sudo systemctl restart ssh"
    echo ""
fi

# التحقق من fail2ban
if ! command -v fail2ban-client &> /dev/null; then
    echo "🛡️ لحماية SSH من الهجمات، ثبّت fail2ban:"
    echo "   sudo apt install fail2ban"
    echo ""
fi

echo "✅ انتهى الفحص!"
echo ""
echo "💡 نصيحة: إذا كنت تواجه مشاكل في الاتصال من GitHub Actions:"
echo "   1. تأكد من أن SERVER_HOST صحيح في GitHub Secrets"
echo "   2. تأكد من أن SERVER_SSH_KEY يحتوي على المفتاح الخاص الكامل"
echo "   3. تأكد من أن المفتاح العام موجود في ~/.ssh/authorized_keys"
echo "   4. تحقق من Firewall/Security Groups على مزود الاستضافة"
