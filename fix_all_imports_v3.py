import os
import re

def find_file_in_services(filename, services_dir):
    for dirpath, _, filenames in os.walk(services_dir):
        if filename in filenames:
            return os.path.join(dirpath, filename)
    
    # Try without .js extension if it was provided
    if filename.endswith('.js'):
        name_no_ext = filename[:-3]
        for dirpath, _, filenames in os.walk(services_dir):
            if name_no_ext in filenames:
                return os.path.join(dirpath, filename)
                
    return None

def fix_all_relative_imports(root_dir, services_dir):
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith('.js'):
                filepath = os.path.join(dirpath, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    pattern = r"require\(['\"]([^'\"]+)['\"]\)"
                    
                    def replace_func(match):
                        import_path = match.group(1)
                        if not (import_path.startswith('.') or import_path.startswith('/')):
                            return match.group(0)
                        
                        abs_import_path = os.path.normpath(os.path.join(dirpath, import_path))
                        if not abs_import_path.endswith('.js'):
                            abs_import_path += '.js'
                        
                        if os.path.exists(abs_import_path):
                            return match.group(0)
                        
                        # Try to find the file in services_dir
                        # Extract the filename (e.g., 'CorrectiveRAGEngine' from '../../rag/CorrectiveRAGEngine')
                        parts = import_path.split('/')
                        filename = parts[-1]
                        if filename.endswith('.js'):
                            filename = filename[:-3]
                        
                        # Search for the file in the services directory
                        target_path = find_file_in_services(filename + '.js', services_dir)
                        if not target_path:
                            # Try without extension
                            target_path = find_file_in_services(filename, services_dir)
                        
                        if target_path:
                            import os.path as osp
                            rel = osp.relpath(target_path, dirpath)
                            rel = rel.replace(os.sep, '/')
                            if rel.endswith('.js'):
                                rel = rel[:-3]
                            return f"require('{rel}')"
                        
                        return match.group(0)

                    new_content = re.sub(pattern, replace_func, content)
                    
                    if new_content != content:
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Fixed: {filepath}")
                except Exception as e:
                    print(f"Error processing {filepath}: {e}")

if __name__ == '__main__':
    root = r'H:\maxp-platform\apps\backend\legacy-ai-agent'
    services = r'H:\maxp-platform\apps\backend\services'
    fix_all_relative_imports(root, services)
