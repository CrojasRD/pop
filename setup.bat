@echo off
cd /d "C:\Users\carli\OneDrive\Documentos\Escritorio\orocash-pop"

echo =====================================================
echo   SETUP - OroGest POP
echo =====================================================
echo.

echo === [1/4] Instalando dependencias ===
call npm install
call npm install pg
echo.

echo === [2/4] Ejecutando SQL en Supabase ===
node run-sql.js
if errorlevel 1 (echo ERROR en SQL && pause && exit /b 1)
echo.

echo === [3/4] Subiendo a GitHub ===
git init -b main
git remote add origin https://github.com/CrojasRD/pop.git 2>nul
git config user.email "carlitosecua2014@gmail.com"
git config user.name "CrojasRD"
git add .
git commit -m "Initial commit - Next.js 14 + Supabase POP dashboard"
git push -u origin main
echo.

echo === [4/4] Deploy Vercel ===
call npm install -g vercel
call vercel --prod
echo.

echo =====================================================
echo   LISTO
echo =====================================================
pause
