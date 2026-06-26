@echo off
cd /d "%~dp0"
echo === MusicFloat 构建 ===
echo.
echo [1/2] 安装依赖...
call npm install
echo.
echo [2/2] 打包...
call npm run build
echo.
echo 构建完成！输出目录: dist\
echo 运行 create-shortcut.vbs 创建桌面快捷方式
pause
