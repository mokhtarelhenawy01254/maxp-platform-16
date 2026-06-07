import os
import re

def fix_ai_agent_imports(root_dir):
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
                        
                        # If it contains 'services/aiAgent' or similar
                        if 'services/aiAgent' in import_path or 'services\\aiAgent' in import_path:
                            # Replace only the part that refers to the AI agent folder
                            new_path = import_path.replace('services/aiAgent', 'legacy-ai-agent/aiAgent').replace('services\\aiAgent', 'legacy-ai-agent\\aiAgent')
                            return f"require('{new_path}')"
                        
                        return match.group(0)

                    new_content = re.sub(pattern, replace_func, content)
                    
                    if new_content != content:
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Fixed: {filepath}")
                except Exception as e:
                    print(f"Error processing {filepath}: {e}")

if __name__ == '__main__':
    root = r'H:\maxp-platform\apps\backend'
    fix_ai_agent_imports(root)
