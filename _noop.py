from pathlib import Path
p = Path('src/pages/TasksPage.tsx')
text = p.read_text()
p.write_text(text)
