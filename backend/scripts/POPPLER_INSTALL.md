# Poppler 安装指南

## 概述

Poppler 是一个 PDF 处理工具集，用于将 PDF 文件转换为图片。本项目使用 poppler 来处理 PDF 格式的发票。

## 安装方法

### 方法 1: 使用安装脚本（推荐）

如果您已经下载了 poppler 源代码到 `/Users/liuzhijian/Downloads/poppler-25.11.0`，可以使用提供的安装脚本：

```bash
cd backend/scripts
./install-poppler.sh
```

安装脚本会：
1. 检查编译工具（cmake, make, g++）
2. 编译 poppler 源代码
3. 安装到 `~/.local/poppler` 目录

**注意**: 如果系统没有安装 cmake，请先安装：
- macOS: `brew install cmake`（需要先安装 Homebrew）
- 或从官网下载: https://cmake.org/download/

### 方法 2: 使用 Homebrew（最简单）

如果您有 Homebrew，可以直接安装：

```bash
brew install poppler
```

### 方法 3: 手动编译安装

如果您想手动编译安装：

```bash
cd /Users/liuzhijian/Downloads/poppler-25.11.0
mkdir build
cd build
cmake .. -DCMAKE_INSTALL_PREFIX=~/.local/poppler -DCMAKE_BUILD_TYPE=Release
make -j$(sysctl -n hw.ncpu)
make install
```

### 方法 4: Python 绑定（可选，仅用于 Python 项目）

**注意**: 本项目使用 Node.js，不需要 Python 绑定。以下信息仅供参考。

如果您需要在 Python 项目中使用 Poppler，可以安装 Python 绑定：

```bash
# 使用 pip3 安装（需要先安装系统级 poppler）
pip3 install python-poppler

# 或者使用旧版本的 qt4 绑定（不推荐，已过时）
pip3 install python-poppler-qt4
```

**重要提示**:
- 必须先安装系统级的 Poppler 工具（使用方法 1、2 或 3）
- Python 绑定只是提供 Python API，仍然依赖系统级的 Poppler 库
- `python-poppler-qt4` 已过时，建议使用 `python-poppler`

## 配置 PATH

安装完成后，需要将 poppler 的 bin 目录添加到 PATH：

```bash
# 临时添加（当前终端会话）
export PATH="$HOME/.local/poppler/bin:$PATH"

# 永久添加（添加到 ~/.zshrc 或 ~/.bash_profile）
echo 'export PATH="$HOME/.local/poppler/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## 验证安装

运行以下命令验证安装：

```bash
pdftoppm -v
pdftocairo -v
pdftotext -v
```

## 代码自动检测

代码会自动检测以下位置的 poppler：

1. 系统 PATH 中的 poppler
2. `POPPLER_PATH` 环境变量指定的路径
3. `~/.local/poppler/bin`
4. `/usr/local/bin`
5. `/opt/homebrew/bin`（Apple Silicon Mac）
6. `/usr/bin`

## 环境变量配置

您也可以通过环境变量指定 poppler 路径：

```bash
export POPPLER_PATH="$HOME/.local/poppler"
```

## 故障排除

### 问题：找不到 pdftoppm

**解决方案**:
1. 确认 poppler 已正确安装
2. 检查 PATH 环境变量是否包含 poppler 的 bin 目录
3. 运行 `which pdftoppm` 查看是否在 PATH 中

### 问题：编译失败

**可能原因**:
- 缺少编译工具（cmake, make, g++）
- 缺少依赖库

**解决方案**:
- macOS: `brew install cmake pkg-config`
- 确保安装了必要的开发工具

### 问题：pdf-poppler 包报错

`pdf-poppler` npm 包依赖于系统安装的 poppler 工具。确保：
1. poppler 已正确安装
2. poppler 工具在 PATH 中
3. 或者设置了 `POPPLER_PATH` 环境变量

