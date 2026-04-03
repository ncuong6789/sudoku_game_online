@echo off
cd /d "d:\Sudoku_GameOnl"
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "fix: bcryptjs, CORS, sidebar, AuthModal show-password"
"C:\Program Files\Git\cmd\git.exe" push
echo Done!
