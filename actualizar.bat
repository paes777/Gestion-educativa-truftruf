@echo off
echo ==================================================
echo   SISTEMA DE NOTAS TRUF-TRUF - ACTUALIZADOR
echo ==================================================
echo.

cd app
copy "..\logo.png" "public\logo.png" /Y
echo [1/3] Compilando la version mas reciente de la plataforma...
call npm run build

echo.
echo [2/3] Subiendo los cambios a Internet (Firebase)...
call npx firebase deploy --only hosting,firestore:rules

cd ..
echo.
echo [3/3] Guardando copia de seguridad en GitHub...
git add .
git commit -m "Actualizacion automatica de la plataforma"
git push

echo.
echo ==================================================
echo   ¡PROCESO COMPLETADO CON EXITO!
echo   Los cambios ya estan reflejados en todos lados.
echo ==================================================
pause
