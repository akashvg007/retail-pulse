@echo off
echo ===================================
echo Building Next.js Standalone Package
echo ===================================

:: Step 1: Run Next.js build
call pnpm build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed! Exiting.
    pause
    exit /b %ERRORLEVEL%
)

:: Step 2: Prepare standalone package directory
echo.
echo Preparing production distribution folder...
if not exist dist mkdir dist

:: Step 3: Copy standalone contents to dist
echo Copying standalone build files...
xcopy /E /I /Y /R .next\standalone\.next dist\.next\

:: Step 4: Copy required public and static folders
echo Copying public static files...
xcopy /E /I /Y /R public dist\public\

echo Copying .next/static folder...
xcopy /E /I /Y /R .next\static dist\.next\static\

:: Step 5: Copy .env file if it exists
if exist .env.production (
    echo Copying .env.production...
    copy /Y .env.production dist\.env
) else if exist .env.local (
    echo Copying .env.local...
    copy /Y .env.local dist\.env
) else if exist .env (
    echo Copying .env...
    copy /Y .env dist\.env
)

echo.
echo ===================================
echo Build complete!
echo Production files are ready in: .\dist
echo.
echo To run your server:
echo   cd dist
echo   node server.js
echo ===================================
pause