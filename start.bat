@echo off
chcp 65001
echo 已设置控制台编码为UTF-8
set NODE_ENV=production
set DEBUG=electron-builder
electron . 