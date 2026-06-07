import os
import re

root_dir = r'H:\maxp-platform\apps\backend\legacy-ai-agent'
replacements = {
    r"require\(['\"](?:\.\./){2}sharedDatabase['\"]\)", r"require('../../../services/sharedDatabase')",
    r"require\(['\"](?:\.\./){2}orderService['\"]\)", r"require('../../../services/orderService')",
    r"require\(['\"](?:\.\./){2}shippingService['\"]\)", r"require('../../../services/shippingService')",
    r"require\(['\"](?:\.\./){2}competitorService['\"]\)", r"require('../../../services/competitorService')",
    r"require\(['\"](?:\.\./){2}competitorSocialService['\"]\)", r"require('../../../services/competitorSocialService')",
    r"require\(['\"](?:\.\./){2}competitorLobbyService['\"]\)", r"require('../../../services/competitorLobbyService')",
    r"require\(['\"](?:\.\./){2}competitorAdService['\"]\)", r"require('../../../services/competitorAdService')",
    r"require\(['\"](?:\.\./){2}competitorPlatformService['\"]\)", r"require('../../../services/competitorPlatformService')",
    r"require\(['\"](?:\.\./){2}hr/attendanceService['\"]\)", r"require('../../../services/hr/attendanceService')",
}

for dirpath, _, filenames in os.walk(root_dir):
    for filename in filenames:
        if filename.endswith('.js'):
            filepath = os.path.join(dirpath, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = content
                for pattern, replacement in replacements.items():
                    new_content = re.sub(pattern, replacement, new_content)
                
                if new_content != content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Fixed: {filepath}")
            except Exception as e:
                print(f"Error processing {filepath}: {e}")
