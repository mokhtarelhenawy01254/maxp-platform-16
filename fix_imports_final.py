import os
import re

def fix_shared_db_imports(root_dir):
    target_file = 'services/sharedDatabase'
    
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith('.js'):
                filepath = os.path.join(dirpath, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Find all require calls
                    # Match: require('...') or require("...")
                    # Capture the path inside
                    pattern = r"require\(['\"]([^'\"]+)['\"]\)"
                    
                    def replace_func(match):
                        path = match.group(1)
                        if 'sharedDatabase' in path:
                            # Calculate relative path from dirpath to apps/backend/services/sharedDatabase.js
                            # root_dir is apps/backend/legacy-ai-agent
                            # target is apps/backend/services/sharedDatabase.js
                            
                            # Current file is at dirpath
                            # We need to go up to apps/backend/
                            
                            # Normalized paths
                            abs_dirpath = os.path.abspath(dirpath)
                            abs_target_dir = os.path.abspath(os.path.join(root_dir, '..', 'services'))
                            
                            # Use os.path.relpath
                            rel = os.path.relpath(abs_target_dir, abs_dirpath)
                            # Node.js requires forward slashes
                            rel = rel.replace(os.sep, '/')
                            
                            return f"require('{rel}/sharedDatabase')"
                        return match.group(0)

                    new_content = re.sub(pattern, replace_func, content)
                    
                    if new_content != content:
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Fixed: {filepath}")
                except Exception as e:
                    print(f"Error processing {filepath}: {e}")

if __name__ == '__main__':
    fix_shared_db_imports(r'H:\maxp-platform\apps\backend\legacy-ai-agent')
