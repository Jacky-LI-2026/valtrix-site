@echo off
chcp 65001 >nul
title 左文科技 - 商用授权码生成工具
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0license-gui.ps1"
