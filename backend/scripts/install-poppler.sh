#!/bin/bash

# Poppler 安装脚本
# 用于编译安装从 Downloads 下载的 poppler 源代码

POPPLER_SOURCE="/Users/liuzhijian/Downloads/poppler-25.11.0"
INSTALL_PREFIX="${HOME}/.local/poppler"

echo "=========================================="
echo "Poppler 安装脚本"
echo "=========================================="
echo "源代码路径: ${POPPLER_SOURCE}"
echo "安装路径: ${INSTALL_PREFIX}"
echo ""

# 检查源代码目录是否存在
if [ ! -d "${POPPLER_SOURCE}" ]; then
    echo "错误: 找不到 poppler 源代码目录: ${POPPLER_SOURCE}"
    echo "请确认路径是否正确"
    exit 1
fi

# 检查是否已安装 cmake
if ! command -v cmake &> /dev/null; then
    echo "错误: 未找到 cmake"
    echo ""
    echo "请先安装 cmake，可以使用以下方法之一："
    echo "1. 使用 Homebrew: brew install cmake"
    echo "2. 使用 MacPorts: sudo port install cmake"
    echo "3. 从官网下载: https://cmake.org/download/"
    exit 1
fi

# 检查是否已安装 make
if ! command -v make &> /dev/null; then
    echo "错误: 未找到 make"
    exit 1
fi

# 检查是否已安装 g++
if ! command -v g++ &> /dev/null; then
    echo "错误: 未找到 g++"
    exit 1
fi

echo "✓ 检查编译工具完成"
echo ""

# 创建构建目录
BUILD_DIR="${POPPLER_SOURCE}/build"
if [ -d "${BUILD_DIR}" ]; then
    echo "清理旧的构建目录..."
    rm -rf "${BUILD_DIR}"
fi

mkdir -p "${BUILD_DIR}"
cd "${BUILD_DIR}"

echo "开始配置构建..."
cmake .. \
    -DCMAKE_INSTALL_PREFIX="${INSTALL_PREFIX}" \
    -DCMAKE_BUILD_TYPE=Release \
    -DENABLE_LIBCURL=ON \
    -DENABLE_QT5=OFF \
    -DENABLE_QT6=OFF \
    -DENABLE_GTK_DOC=OFF

if [ $? -ne 0 ]; then
    echo "错误: cmake 配置失败"
    exit 1
fi

echo ""
echo "开始编译（这可能需要几分钟）..."
make -j$(sysctl -n hw.ncpu)

if [ $? -ne 0 ]; then
    echo "错误: 编译失败"
    exit 1
fi

echo ""
echo "开始安装..."
make install

if [ $? -ne 0 ]; then
    echo "错误: 安装失败"
    exit 1
fi

echo ""
echo "=========================================="
echo "✓ Poppler 安装成功！"
echo "=========================================="
echo ""
echo "安装路径: ${INSTALL_PREFIX}"
echo ""
echo "二进制文件位置:"
echo "  - pdftoppm: ${INSTALL_PREFIX}/bin/pdftoppm"
echo "  - pdftocairo: ${INSTALL_PREFIX}/bin/pdftocairo"
echo "  - pdftotext: ${INSTALL_PREFIX}/bin/pdftotext"
echo ""
echo "要将 poppler 添加到 PATH，请运行："
echo "  export PATH=\"${INSTALL_PREFIX}/bin:\$PATH\""
echo ""
echo "或者将以下行添加到 ~/.zshrc 或 ~/.bash_profile："
echo "  export PATH=\"${INSTALL_PREFIX}/bin:\$PATH\""
echo ""
echo "然后运行: source ~/.zshrc"
echo ""




