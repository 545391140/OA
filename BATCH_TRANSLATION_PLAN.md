# 批量翻译方案文档

## 概述
本文档提供了使用翻译 API 或专业工具批量处理多语言翻译文件的方案，无需修改代码。

## 当前翻译文件状态

### 已存在的语言文件
- `en.json` - 英文（完整，作为源文件）
- `zh.json` - 中文（完整）
- `ja.json` - 日文（完整）
- `ko.json` - 韩文（完整）
- `ar.json` - 阿拉伯文（部分翻译）
- `vi.json` - 越南文（部分翻译）
- `th.json` - 泰文（部分翻译）

### 需要翻译的模块
根据之前的 TODO 列表，以下模块需要完善翻译：
- invoice（发票夹）
- approval（审批流程）
- travelStandard（差旅标准）
- expenseItems（费用项目）
- location（地理位置）
- i18nMonitor（国际化监控）
- role（角色管理）
- position（岗位管理）
- user（用户管理）
- approvalWorkflows（审批流程管理）

---

## 方案一：使用 Google Translate API（推荐）

### 优点
- 翻译质量较高
- 支持批量翻译
- API 调用简单
- 成本相对较低

### 实施步骤

#### 1. 准备工作
```bash
# 安装 Google Cloud SDK（如果还没有）
# macOS
brew install --cask google-cloud-sdk

# 或使用 pip 安装翻译库
pip install googletrans==4.0.0rc1
# 或
pip install google-cloud-translate
```

#### 2. 获取 API Key
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Cloud Translation API
4. 创建 API 密钥
5. 设置配额限制（避免超支）

#### 3. 使用 Python 脚本批量翻译

创建 `translate_files.py`：

```python
#!/usr/bin/env python3
"""
批量翻译 JSON 文件脚本
使用方法: python translate_files.py --source en.json --target ar.json --lang ar
"""

import json
import argparse
from googletrans import Translator
import time

def translate_json_file(source_file, target_file, target_lang, source_lang='en'):
    """
    翻译 JSON 文件
    """
    translator = Translator()
    
    # 读取源文件
    with open(source_file, 'r', encoding='utf-8') as f:
        source_data = json.load(f)
    
    # 读取目标文件（如果存在）
    try:
        with open(target_file, 'r', encoding='utf-8') as f:
            target_data = json.load(f)
    except FileNotFoundError:
        target_data = {}
    
    def translate_value(value, path=""):
        """递归翻译值"""
        if isinstance(value, dict):
            result = {}
            for key, val in value.items():
                current_path = f"{path}.{key}" if path else key
                result[key] = translate_value(val, current_path)
            return result
        elif isinstance(value, list):
            return [translate_value(item, path) for item in value]
        elif isinstance(value, str) and value.strip():
            # 检查是否已经翻译过（如果目标文件存在该键）
            if path and path in get_nested_value(target_data, path):
                existing = get_nested_value(target_data, path)
                if existing and existing != value:
                    print(f"保留现有翻译: {path} = {existing}")
                    return existing
            
            # 跳过占位符和格式字符串
            if value.startswith('{') or value.startswith('$') or '{{' in value:
                return value
            
            try:
                # 翻译文本
                translated = translator.translate(value, src=source_lang, dest=target_lang)
                print(f"翻译: {path} = {value} -> {translated.text}")
                time.sleep(0.1)  # 避免 API 限制
                return translated.text
            except Exception as e:
                print(f"翻译失败 {path}: {e}")
                return value
        else:
            return value
    
    def get_nested_value(data, path):
        """获取嵌套值"""
        keys = path.split('.')
        value = data
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return None
        return value
    
    # 翻译数据
    translated_data = translate_value(source_data)
    
    # 保存翻译结果
    with open(target_file, 'w', encoding='utf-8') as f:
        json.dump(translated_data, f, ensure_ascii=False, indent=2)
    
    print(f"翻译完成！已保存到 {target_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='批量翻译 JSON 文件')
    parser.add_argument('--source', required=True, help='源文件路径')
    parser.add_argument('--target', required=True, help='目标文件路径')
    parser.add_argument('--lang', required=True, help='目标语言代码 (ar, vi, th)')
    parser.add_argument('--source-lang', default='en', help='源语言代码 (默认: en)')
    
    args = parser.parse_args()
    
    translate_json_file(args.source, args.target, args.lang, args.source_lang)
```

#### 4. 执行翻译
```bash
# 翻译阿拉伯文
python translate_files.py --source frontend/src/i18n/locales/en.json --target frontend/src/i18n/locales/ar.json --lang ar

# 翻译越南文
python translate_files.py --source frontend/src/i18n/locales/en.json --target frontend/src/i18n/locales/vi.json --lang vi

# 翻译泰文
python translate_files.py --source frontend/src/i18n/locales/en.json --target frontend/src/i18n/locales/th.json --lang th
```

---

## 方案二：使用 DeepL API（高质量翻译）

### 优点
- 翻译质量最高
- 支持上下文理解
- API 稳定

### 缺点
- 成本较高
- 免费额度有限

### 实施步骤

#### 1. 获取 API Key
1. 访问 [DeepL API](https://www.deepl.com/pro-api)
2. 注册账号并获取 API 密钥
3. 查看免费额度（每月 500,000 字符）

#### 2. 使用 Python 脚本

```python
#!/usr/bin/env python3
import json
import requests
import argparse
import time

def translate_with_deepl(text, target_lang, api_key, source_lang='EN'):
    """使用 DeepL API 翻译"""
    url = "https://api-free.deepl.com/v2/translate"
    
    params = {
        'auth_key': api_key,
        'text': text,
        'source_lang': source_lang,
        'target_lang': target_lang,
        'preserve_formatting': '1'
    }
    
    response = requests.post(url, data=params)
    if response.status_code == 200:
        return response.json()['translations'][0]['text']
    else:
        raise Exception(f"DeepL API 错误: {response.status_code} - {response.text}")

# 语言代码映射
DEEPL_LANG_MAP = {
    'ar': 'AR',
    'vi': 'VI',
    'th': 'TH'
}

# 使用方式类似方案一，只需替换翻译函数
```

---

## 方案三：使用专业翻译管理平台

### 推荐平台

#### 1. POEditor（推荐）
- **网址**: https://poeditor.com/
- **优点**: 
  - 界面友好
  - 支持 JSON 格式
  - 有免费计划（1000 字符串）
  - 支持机器翻译 + 人工审核
- **使用步骤**:
  1. 注册账号
  2. 创建项目
  3. 上传 `en.json` 作为源文件
  4. 添加目标语言（ar, vi, th）
  5. 使用内置机器翻译功能
  6. 导出翻译后的 JSON 文件

#### 2. Crowdin
- **网址**: https://crowdin.com/
- **优点**: 
  - 功能强大
  - 支持多种格式
  - 有免费计划
- **缺点**: 
  - 学习曲线较陡

#### 3. Lokalise
- **网址**: https://lokalise.com/
- **优点**: 
  - 专业级工具
  - 支持 API 自动化
- **缺点**: 
  - 免费计划限制较多

### POEditor 使用步骤（详细）

1. **注册并登录** POEditor
2. **创建新项目**
   - 项目名称: OA System Translations
   - 项目类型: Software
3. **上传源文件**
   - 点击 "Upload" → 选择 `en.json`
   - 设置语言: English
4. **添加目标语言**
   - 点击 "Languages" → "Add Language"
   - 添加: Arabic (ar), Vietnamese (vi), Thai (th)
5. **使用机器翻译**
   - 选择目标语言
   - 点击 "Auto-translate" → 选择 "Machine Translation"
   - 选择翻译引擎（Google Translate 或 DeepL）
   - 执行自动翻译
6. **导出翻译文件**
   - 点击 "Download" → 选择 JSON 格式
   - 选择语言并下载
   - 替换项目中的对应文件

---

## 方案四：使用在线 JSON 翻译工具

### 推荐工具

#### 1. Translate JSON Files Online
- **网址**: https://www.translatejson.com/
- **使用**: 上传 JSON 文件，选择目标语言，下载翻译结果

#### 2. JSON Translator
- **网址**: https://json-translator.com/
- **使用**: 类似上述工具

### 注意事项
- 这些工具可能不保留 JSON 结构
- 需要手动检查和调整
- 适合小文件或快速测试

---

## 方案五：使用 ChatGPT/Claude 等 AI 工具

### 优点
- 免费或低成本
- 翻译质量好
- 可以理解上下文

### 实施步骤

1. **准备 JSON 文件**
   - 将 `en.json` 按模块拆分（如 `common.json`, `expense.json` 等）
   - 或直接使用完整文件

2. **使用 ChatGPT**
   - 提示词示例：
   ```
   请将以下 JSON 文件翻译成阿拉伯文，保持 JSON 结构不变，只翻译值（value），不要翻译键（key）：
   
   [粘贴 JSON 内容]
   ```

3. **使用 Claude**
   - 类似 ChatGPT，但可以处理更大的文件

4. **处理结果**
   - 复制翻译结果
   - 保存为对应的语言文件
   - 检查 JSON 格式是否正确

---

## 推荐工作流程

### 步骤 1: 选择方案
- **快速测试**: 方案五（ChatGPT/Claude）
- **批量处理**: 方案一（Google Translate API）
- **高质量翻译**: 方案二（DeepL API）
- **专业管理**: 方案三（POEditor）

### 步骤 2: 准备文件
```bash
# 确保英文文件是最新的
cd frontend/src/i18n/locales
cp en.json en_backup.json  # 备份
```

### 步骤 3: 执行翻译
根据选择的方案执行翻译

### 步骤 4: 验证和调整
1. **检查 JSON 格式**
   ```bash
   # 使用 jq 验证 JSON 格式
   jq . ar.json > /dev/null && echo "JSON 格式正确" || echo "JSON 格式错误"
   ```

2. **对比键的数量**
   ```bash
   # 检查键的数量是否一致
   jq 'paths(scalars) | join(".")' en.json | wc -l
   jq 'paths(scalars) | join(".")' ar.json | wc -l
   ```

3. **手动检查关键翻译**
   - 检查专业术语
   - 检查 UI 文本长度（避免溢出）
   - 检查占位符和变量（如 `{count}`, `{{date}}`）

### 步骤 5: 测试
1. 启动开发服务器
2. 切换语言测试
3. 检查 UI 显示是否正常
4. 修复发现的问题

---

## 注意事项

### 1. 保留占位符
确保以下内容不被翻译：
- `{count}`, `{name}`, `{date}` 等占位符
- `{{variable}}` 模板变量
- HTML 标签：`<strong>`, `<br/>` 等
- 特殊格式：日期格式、货币符号等

### 2. 保持 JSON 结构
- 不要改变键（key）的名称
- 保持嵌套结构一致
- 保持数组和对象的格式

### 3. 处理特殊字符
- 阿拉伯文是 RTL（从右到左）语言
- 确保 JSON 文件使用 UTF-8 编码
- 注意引号转义

### 4. 成本控制
- Google Translate API: $20/百万字符
- DeepL API: 免费 500K 字符/月
- 建议先估算文件大小

---

## 文件大小估算

```bash
# 检查文件大小
wc -c frontend/src/i18n/locales/en.json
# 估算字符数（大约）
```

根据经验，`en.json` 大约有 2000+ 个翻译键，每个键平均 10-20 个字符，总计约 20,000-40,000 字符。

---

## 快速开始（推荐：Google Translate API）

### 1. 安装依赖
```bash
pip install googletrans==4.0.0rc1
```

### 2. 创建翻译脚本
使用上面提供的 `translate_files.py` 脚本

### 3. 执行翻译
```bash
# 翻译阿拉伯文
python translate_files.py \
  --source frontend/src/i18n/locales/en.json \
  --target frontend/src/i18n/locales/ar.json \
  --lang ar

# 翻译越南文
python translate_files.py \
  --source frontend/src/i18n/locales/en.json \
  --target frontend/src/i18n/locales/vi.json \
  --lang vi

# 翻译泰文
python translate_files.py \
  --source frontend/src/i18n/locales/en.json \
  --target frontend/src/i18n/locales/th.json \
  --lang th
```

### 4. 验证结果
```bash
# 检查 JSON 格式
python -m json.tool frontend/src/i18n/locales/ar.json > /dev/null && echo "✓ ar.json 格式正确"
python -m json.tool frontend/src/i18n/locales/vi.json > /dev/null && echo "✓ vi.json 格式正确"
python -m json.tool frontend/src/i18n/locales/th.json > /dev/null && echo "✓ th.json 格式正确"
```

---

## 总结

**推荐方案**: 
1. **快速测试**: 使用 ChatGPT/Claude 翻译小模块
2. **批量处理**: 使用 Google Translate API + Python 脚本
3. **长期管理**: 使用 POEditor 平台

**预计时间**:
- 方案一（Google Translate API）: 1-2 小时
- 方案二（DeepL API）: 1-2 小时
- 方案三（POEditor）: 2-3 小时（包括学习时间）
- 方案五（ChatGPT）: 3-4 小时（手动操作）

**预计成本**:
- Google Translate API: $1-2（20K-40K 字符）
- DeepL API: 免费（在免费额度内）
- POEditor: 免费（1000 字符串）或 $9/月（10000 字符串）
- ChatGPT: 免费或 $20/月




