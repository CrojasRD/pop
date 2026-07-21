@echo off
cd /d "C:\Users\carli\OneDrive\Documentos\Escritorio\orocash-pop"

echo === Inicializando repositorio git ===
git init -b main
git remote add origin https://github.com/CrojasRD/pop.git

echo.
echo === Configurando usuario ===
git config user.email "carlitosecua2014@gmail.com"
git config user.name "CrojasRD"

echo.
echo === Agregando archivos ===
git add .

echo.
echo === Commit inicial ===
git commit -m "Initial commit — Next.js + Supabase POP dashboard"

echo.
echo === Subiendo a GitHub ===
git push -u origin main

echo.
echo === LISTO — ahora conecta el repo en Vercel ===
pause
