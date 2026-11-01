"""Back up SQLite plus its referenced private works; never overwrite a backup."""
import argparse,shutil,sqlite3
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--database',required=True);p.add_argument('--to',required=True);a=p.parse_args()
source=Path(a.database).resolve();target=Path(a.to).resolve()
assets=source.with_name(source.name+'.assets')/'private-works';target_assets=target.with_name(target.name+'.assets')
if not source.is_file():raise SystemExit('Database does not exist')
if target.exists() or target_assets.exists():raise SystemExit('Refusing to overwrite existing backup')
target.parent.mkdir(parents=True,exist_ok=True)
try:
 with sqlite3.connect(f'file:{source}?mode=ro',uri=True) as src,sqlite3.connect(target) as dest:
  src.backup(dest)
  if dest.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise ValueError('Backup integrity check failed')
  rows=dest.execute('SELECT id FROM family_works').fetchall() if dest.execute("SELECT 1 FROM sqlite_master WHERE name='family_works'").fetchone() else []
  if rows:
   (target_assets/'private-works').mkdir(parents=True)
   for identifier, in rows:shutil.copy2(assets/(identifier+'.image'),target_assets/'private-works'/(identifier+'.image'))
except Exception:
 target.unlink(missing_ok=True);shutil.rmtree(target_assets,ignore_errors=True);raise
print('Backup verified:',target,'; private works:',len(rows))
