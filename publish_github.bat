@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title GitHub FORCE Replace Publish Tool

REM ============================================================
REM  SAFE BAT VERSION
REM  Put this BAT file in your website project folder, then run it.
REM  It will commit ALL local changes and FORCE PUSH to GitHub main.
REM ============================================================

set "BRANCH=main"
set "DEFAULT_MSG=Codex update website"

cls
echo ========================================
echo   GitHub FORCE REPLACE Publish Tool
echo ========================================
echo.
echo Folder:
echo %CD%
echo.
echo WARNING:
echo This will use the current folder as the final version.
echo It will replace GitHub branch: %BRANCH%
echo.
echo Deleted local files will also be deleted on GitHub.
echo.
set /p "CONFIRM=Type YES then press Enter to continue: "
if /I not "%CONFIRM%"=="YES" goto cancelled

echo.
echo [1/6] Checking Git...
git --version
if errorlevel 1 goto no_git

echo.
echo [2/6] Checking repository...
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 goto init_repo
goto repo_ok

:init_repo
echo This folder is not a Git repository yet.
echo.
set /p "REPO_URL=Paste GitHub repo URL, for example https://github.com/USER/REPO.git : "
if "%REPO_URL%"=="" goto empty_url
echo.
echo Initializing Git repository...
git init
if errorlevel 1 goto git_error
git branch -M %BRANCH%
if errorlevel 1 goto git_error
git remote add origin "%REPO_URL%"
if errorlevel 1 goto git_error
goto repo_ok

:repo_ok
echo OK: Git repository ready.
git branch -M %BRANCH%
if errorlevel 1 goto git_error

echo.
echo [3/6] Checking remote origin...
git remote get-url origin >nul 2>nul
if errorlevel 1 goto ask_origin
goto show_remote

:ask_origin
echo Remote origin not found.
set /p "REPO_URL=Paste GitHub repo URL, for example https://github.com/USER/REPO.git : "
if "%REPO_URL%"=="" goto empty_url
git remote add origin "%REPO_URL%"
if errorlevel 1 goto git_error

:show_remote
echo Current remote:
git remote -v

echo.
echo [4/6] Stage all files including deletes...
git add -A -- .
if errorlevel 1 goto git_error

echo.
echo Current changes:
git status --short

echo.
echo [5/6] Commit changes...
set "COMMIT_MSG=%DEFAULT_MSG%"
set /p "USER_MSG=Commit message, or press Enter to use default: "
if not "%USER_MSG%"=="" set "COMMIT_MSG=%USER_MSG%"

git diff --cached --quiet
if errorlevel 1 goto do_commit
echo No new changes to commit. Will push current local branch.
goto do_push

:do_commit
git commit -m "%COMMIT_MSG%"
if errorlevel 1 goto git_error

:do_push
echo.
echo [6/6] FORCE pushing to GitHub...
echo Running: git push --force -u origin %BRANCH%
git push --force -u origin %BRANCH%
if errorlevel 1 goto push_error

echo.
echo ========================================
echo DONE. GitHub has been replaced by this local folder.
echo ========================================
echo.
echo GitHub Pages setting:
echo Settings ^> Pages ^> Deploy from a branch ^> %BRANCH% ^> root
echo.
pause
exit /b 0

:cancelled
echo.
echo Cancelled. Nothing was pushed.
pause
exit /b 0

:no_git
echo.
echo ERROR: Git was not found.
echo Please install Git for Windows first.
pause
exit /b 1

:empty_url
echo.
echo ERROR: Repository URL is empty.
pause
exit /b 1

:push_error
echo.
echo ERROR: Push failed.
echo Possible reasons:
echo 1. You are not logged in to GitHub.
echo 2. The repository URL is wrong.
echo 3. You do not have push permission.
echo 4. The branch is protected and does not allow force push.
echo.
pause
exit /b 1

:git_error
echo.
echo ERROR: A Git command failed.
echo Check the message above.
echo.
pause
exit /b 1
