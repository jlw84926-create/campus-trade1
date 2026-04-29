import zipfile
import os

exclude_files = {'app-simple.js', 'package-simple.json', 'Dockerfile-simple', '.env'}

with zipfile.ZipFile('../backend.zip', 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d != 'node_modules']
        for file in files:
            if file in exclude_files or file.endswith('.log'):
                continue
            filepath = os.path.join(root, file)
            arcname = filepath.replace(os.sep, '/')
            if arcname.startswith('./'):
                arcname = arcname[2:]
            zf.write(filepath, arcname)
            print(f'  {arcname}')

print('done')
