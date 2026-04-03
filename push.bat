@echo off
"C:\Program Files\Git\cmd\git.exe" -C "d:\Sudoku_GameOnl" add .
"C:\Program Files\Git\cmd\git.exe" -C "d:\Sudoku_GameOnl" commit -m "fix: remove bcrypt (keep bcryptjs), center main content, clean sidebar"
"C:\Program Files\Git\cmd\git.exe" -C "d:\Sudoku_GameOnl" push
echo Done!
pause
