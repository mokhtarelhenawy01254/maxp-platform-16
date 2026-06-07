import os
import re

def fix_all_relative_imports(root_dir, services_dir):
    # root_dir: H:\maxp-platform\apps\backend\legacy-ai-agent
    # services_dir: H:\maxp-platform\apps\backend\services
    
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith('.js'):
                filepath = os.path.join(dirpath, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Regex to find all require('...') or require("...")
                    pattern = r"require\(['\"]([^'\"]+)['\"]\)"
                    
                    def replace_func(match):
                        import_path = match.group(1)
                        
                        # Only process relative paths
                        if not (import_path.startswith('.') or import_path.startswith('/')):
                            return match.group(0)
                        
                        # Resolve the current import path to an absolute path
                        abs_import_path = os.path.normpath(os.path.join(dirpath, import_path))
                        if not abs_import_path.endswith('.js'):
                            abs_import_path += '.js'
                        
                        # If the file exists at the current relative path, leave it alone
                        if os.path.exists(abs_import_path):
                            return match.group(0)
                        
                        # Try to see if it exists in the services directory
                        # Extract the filename part of the import
                        service_name = os.path.basename(import_path)
                        # If it was something like '../services/something', we just want 'something'
                        # but since we are looking for things that BROKE, it's probably '../something'
                        
                        # Try to construct a path to services
                        # e.g., if import is '../redisCacheService', try 'apps/backend/services/redisCacheService.js'
                        potential_service_path = os.path.join(services_dir, service_name + '.js')
                        
                        if os.path.exists(potential_service_path):
                            # Calculate relative path from current file to the service file
                            import os.path as osp
                            rel = osp.relpath(potential_service_path, dirpath)
                            # Node.js requires forward slashes
                            rel = rel.replace(os.sep, '/')
                            # Remove .js extension for the require call
                            if rel.endswith('.js'):
                                rel = rel[:-3]
                            return f"require('{rel}')"
                        
                        return match.group(0)

                    new_content = re.sub(pattern, replace_func, content)
                    
                    if new_content != content:
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Fixed imports in: {filepath}")
                except Exception as e:
                    print(f"Error processing {filepath}: {e}")

if __name__ == '__main__':
    root = r'H:\maxp-platform\apps\backend\legacy-ai-agent'
    services = r'H:\maxp-platform\apps\backend\services'
    fix_all_relative_imports(root, services)
