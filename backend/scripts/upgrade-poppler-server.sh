#!/bin/bash

# Poppler 升级脚本 - 服务器端
# 用于在服务器上从源码编译安装 Poppler 25.11.0

set -e

POPPLER_VERSION="25.11.0"
POPPLER_SOURCE_URL="https://poppler.freedesktop.org/poppler-${POPPLER_VERSION}.tar.xz"
INSTALL_PREFIX="${HOME}/.local/poppler"
BUILD_DIR="${HOME}/poppler-build"

echo "=========================================="
echo "Poppler 升级脚本 - 服务器端"
echo "=========================================="
echo "目标版本: ${POPPLER_VERSION}"
echo "安装路径: ${INSTALL_PREFIX}"
echo ""

# 检查当前版本
if command -v pdftoppm &> /dev/null; then
    CURRENT_VERSION=$(pdftoppm -v 2>&1 | head -1 | grep -oP '\d+\.\d+\.\d+' || echo "unknown")
    echo "当前版本: ${CURRENT_VERSION}"
    if [ "${CURRENT_VERSION}" = "${POPPLER_VERSION}" ]; then
        echo "✅ Poppler 已经是目标版本，无需升级"
        exit 0
    fi
fi

# 检查并安装编译依赖
echo "检查编译依赖..."
if ! command -v cmake &> /dev/null; then
    echo "安装 cmake..."
    sudo yum install -y cmake || sudo dnf install -y cmake || {
        echo "❌ 无法安装 cmake，请手动安装"
        exit 1
    }
fi

if ! command -v g++ &> /dev/null; then
    echo "安装 gcc-c++..."
    sudo yum install -y gcc-c++ make || sudo dnf install -y gcc-c++ make || {
        echo "❌ 无法安装 gcc-c++，请手动安装"
        exit 1
    }
fi

# 安装其他依赖
echo "安装其他依赖..."
sudo yum install -y pkgconfig libjpeg-devel openjpeg2-devel libtiff-devel libpng-devel freetype-devel fontconfig-devel libcurl-devel zlib-devel || \
sudo dnf install -y pkgconfig libjpeg-devel openjpeg2-devel libtiff-devel libpng-devel freetype-devel fontconfig-devel libcurl-devel zlib-devel || {
    echo "⚠️  部分依赖安装失败，继续尝试编译..."
}

echo "✅ 依赖检查完成"
echo ""

# 创建构建目录
mkdir -p "${BUILD_DIR}"
cd "${BUILD_DIR}"

# 下载 Poppler 源码
echo "下载 Poppler ${POPPLER_VERSION} 源码..."
if [ ! -f "poppler-${POPPLER_VERSION}.tar.xz" ]; then
    wget "${POPPLER_SOURCE_URL}" || {
        echo "❌ 下载失败，尝试使用 curl..."
        curl -L -o "poppler-${POPPLER_VERSION}.tar.xz" "${POPPLER_SOURCE_URL}" || {
            echo "❌ 下载失败"
            exit 1
        }
    }
fi

# 解压源码
echo "解压源码..."
if [ ! -d "poppler-${POPPLER_VERSION}" ]; then
    tar -xf "poppler-${POPPLER_VERSION}.tar.xz"
fi

cd "poppler-${POPPLER_VERSION}"

# 创建构建目录
mkdir -p build
cd build

# 配置构建
echo "配置构建..."
cmake .. \
    -DCMAKE_INSTALL_PREFIX="${INSTALL_PREFIX}" \
    -DCMAKE_BUILD_TYPE=Release \
    -DENABLE_LIBCURL=ON \
    -DENABLE_QT5=OFF \
    -DENABLE_QT6=OFF \
    -DENABLE_GTK_DOC=OFF \
    -DENABLE_CPP=ON \
    -DENABLE_NSS3=OFF \
    -DENABLE_GPGME=OFF \
    -DENABLE_CAIRO=OFF \
    -DENABLE_SPLASH=ON \
    -DENABLE_BOOST=OFF \
    -DENABLE_LCMS=OFF

if [ $? -ne 0 ]; then
    echo "❌ cmake 配置失败"
    exit 1
fi

# 编译
echo "开始编译（这可能需要较长时间）..."
make -j$(nproc)

if [ $? -ne 0 ]; then
    echo "❌ 编译失败"
    exit 1
fi

# 安装
echo "开始安装..."
make install

if [ $? -ne 0 ]; then
    echo "❌ 安装失败"
    exit 1
fi

# 添加到 PATH
echo ""
echo "配置 PATH..."
if ! grep -q "${INSTALL_PREFIX}/bin" ~/.bashrc 2>/dev/null; then
    echo "export PATH=\"${INSTALL_PREFIX}/bin:\$PATH\"" >> ~/.bashrc
    echo "✅ 已添加到 ~/.bashrc"
fi

if ! grep -q "${INSTALL_PREFIX}/bin" ~/.bash_profile 2>/dev/null; then
    echo "export PATH=\"${INSTALL_PREFIX}/bin:\$PATH\"" >> ~/.bash_profile
    echo "✅ 已添加到 ~/.bash_profile"
fi

# 验证安装
export PATH="${INSTALL_PREFIX}/bin:$PATH"
if command -v pdftoppm &> /dev/null; then
    NEW_VERSION=$(pdftoppm -v 2>&1 | head -1 | grep -oP '\d+\.\d+\.\d+' || echo "unknown")
    echo ""
    echo "=========================================="
    echo "✅ Poppler 升级成功！"
    echo "=========================================="
    echo "新版本: ${NEW_VERSION}"
    echo "安装路径: ${INSTALL_PREFIX}"
    echo ""
    echo "二进制文件位置:"
    echo "  - pdftoppm: ${INSTALL_PREFIX}/bin/pdftoppm"
    echo ""
    echo "⚠️  注意: 请重新登录或运行以下命令使 PATH 生效:"
    echo "  export PATH=\"${INSTALL_PREFIX}/bin:\$PATH\""
    echo ""
    echo "或者重启服务以使用新版本的 Poppler"
else
    echo "❌ 安装验证失败"
    exit 1
fi

# 清理构建文件（可选）
echo ""
read -p "是否清理构建文件？(y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "${BUILD_DIR}"
    echo "✅ 构建文件已清理"
fi

