@echo off
chcp 65001 >nul
title Monkey Fast
cd /d "%~dp0"

echo.
echo   =============================================
echo      MONKEY FAST - iniciando o jogo...
echo   =============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado.
  echo Instale a versao LTS em https://nodejs.org e rode este arquivo de novo.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Instalando dependencias pela primeira vez. Isso pode levar alguns minutos...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao instalar as dependencias.
    pause
    exit /b 1
  )
)

echo O navegador vai abrir sozinho com o jogo.
echo Para jogar no celular (mesma rede Wi-Fi), use o endereco "Network" mostrado abaixo.
echo Para FECHAR o jogo, feche esta janela (ou pressione Ctrl+C).
echo.

call npm run dev -- --open

echo.
pause
