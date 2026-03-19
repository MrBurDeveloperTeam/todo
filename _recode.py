from pathlib import Path
p = Path('src/pages/TasksPage.tsx')
data = p.read_bytes()
text = data.decode('utf-8', errors='replace')
p.write_text(text, encoding='utf-8')
print('re-encoded')
