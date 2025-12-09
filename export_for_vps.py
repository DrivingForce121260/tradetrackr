import os
import subprocess
from pathlib import Path
import shutil

EXPORT_DIR_NAME = "export_vps"  # output folder name

def run_git_ls_files():
    """Return a list of all files tracked by git."""
    result = subprocess.run(
        ["git", "ls-files"],
        capture_output=True,
        text=True,
        check=True
    )
    files = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    return files

def copy_tracked_files_to_export(export_dir: Path):
    project_root = Path.cwd()
    export_dir = export_dir.resolve()

    if export_dir.exists():
        print(f"[INFO] Removing existing export dir: {export_dir}")
        shutil.rmtree(export_dir)

    print(f"[INFO] Creating export dir: {export_dir}")
    export_dir.mkdir(parents=True, exist_ok=True)

    tracked_files = run_git_ls_files()
    print(f"[INFO] Number of tracked files: {len(tracked_files)}")

    for rel_path in tracked_files:
        src = project_root / rel_path
        dst = export_dir / rel_path

        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)

    print("[INFO] Export complete.")
    print(f"[INFO] Exported project root: {export_dir}")

def main():
    export_dir = Path(EXPORT_DIR_NAME)
    copy_tracked_files_to_export(export_dir)

if __name__ == "__main__":
    main()
