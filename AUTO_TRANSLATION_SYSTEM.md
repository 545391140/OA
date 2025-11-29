# 自动翻译系统方案

## 概述
本方案实现了一个自动翻译系统，能够：
1. 自动发现未翻译的内容
2. 自动调用翻译 API 进行翻译
3. 自动更新翻译文件
4. 支持 CI/CD 集成

---

## 系统架构

```
源文件 (en.json)
    ↓
检测脚本 (check_translations.py)
    ↓
发现缺失的翻译键
    ↓
翻译脚本 (auto_translate.py)
    ↓
调用翻译 API
    ↓
更新目标语言文件
```

---

## 方案一：Python 脚本自动化（推荐）

### 1. 检测未翻译内容的脚本

创建 `check_translations.py`：

```python
#!/usr/bin/env python3
"""
检测未翻译的内容
使用方法: python check_translations.py --source en.json --target ar.json
"""

import json
import argparse
from pathlib import Path

def get_all_keys(data, prefix=""):
    """递归获取所有键的路径"""
    keys = []
    if isinstance(data, dict):
        for key, value in data.items():
            current_path = f"{prefix}.{key}" if prefix else key
            if isinstance(value, (dict, list)):
                keys.extend(get_all_keys(value, current_path))
            else:
                keys.append(current_path)
    elif isinstance(value, list):
        for i, item in enumerate(data):
            current_path = f"{prefix}[{i}]"
            if isinstance(item, (dict, list)):
                keys.extend(get_all_keys(item, current_path))
            else:
                keys.append(current_path)
    return keys

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

def check_missing_translations(source_file, target_file):
    """检查缺失的翻译"""
    # 读取源文件
    with open(source_file, 'r', encoding='utf-8') as f:
        source_data = json.load(f)
    
    # 读取目标文件
    target_data = {}
    if Path(target_file).exists():
        with open(target_file, 'r', encoding='utf-8') as f:
            target_data = json.load(f)
    
    # 获取所有键
    source_keys = get_all_keys(source_data)
    
    missing_keys = []
    untranslated_keys = []
    
    for key_path in source_keys:
        source_value = get_nested_value(source_data, key_path)
        target_value = get_nested_value(target_data, key_path)
        
        if target_value is None:
            missing_keys.append({
                'path': key_path,
                'source': source_value
            })
        elif target_value == source_value:
            # 如果目标值与源值相同，可能是未翻译
            untranslated_keys.append({
                'path': key_path,
                'source': source_value,
                'target': target_value
            })
    
    return missing_keys, untranslated_keys

def main():
    parser = argparse.ArgumentParser(description='检测未翻译的内容')
    parser.add_argument('--source', required=True, help='源文件路径')
    parser.add_argument('--target', required=True, help='目标文件路径')
    parser.add_argument('--output', help='输出报告文件（JSON格式）')
    
    args = parser.parse_args()
    
    missing, untranslated = check_missing_translations(args.source, args.target)
    
    print(f"检查结果: {args.target}")
    print(f"缺失的键: {len(missing)}")
    print(f"可能未翻译的键: {len(untranslated)}")
    print()
    
    if missing:
        print("缺失的键:")
        for item in missing[:10]:  # 只显示前10个
            print(f"  - {item['path']}: {item['source'][:50]}...")
        if len(missing) > 10:
            print(f"  ... 还有 {len(missing) - 10} 个")
        print()
    
    if untranslated:
        print("可能未翻译的键（值与源文件相同）:")
        for item in untranslated[:10]:
            print(f"  - {item['path']}: {item['source'][:50]}...")
        if len(untranslated) > 10:
            print(f"  ... 还有 {len(untranslated) - 10} 个")
        print()
    
    # 保存报告
    if args.output:
        report = {
            'source_file': args.source,
            'target_file': args.target,
            'missing_keys': missing,
            'untranslated_keys': untranslated,
            'summary': {
                'missing_count': len(missing),
                'untranslated_count': len(untranslated),
                'total_missing': len(missing) + len(untranslated)
            }
        }
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f"报告已保存到: {args.output}")
    
    return len(missing) + len(untranslated)

if __name__ == "__main__":
    import sys
    sys.exit(main())
```

### 2. 自动翻译脚本

创建 `auto_translate.py`：

```python
#!/usr/bin/env python3
"""
自动翻译缺失的内容
使用方法: python auto_translate.py --source en.json --target ar.json --lang ar
"""

import json
import argparse
import sys
from pathlib import Path
from check_translations import check_missing_translations, get_nested_value, set_nested_value
from translate_files import translate_with_google, translate_with_deepl, should_skip_translation
import time

def auto_translate_missing(source_file, target_file, target_lang, source_lang='en', api_type='google', api_key=None):
    """自动翻译缺失的内容"""
    # 检查缺失的翻译
    print("检查缺失的翻译...")
    missing, untranslated = check_missing_translations(source_file, target_file)
    
    total_missing = len(missing) + len(untranslated)
    if total_missing == 0:
        print("✓ 没有缺失的翻译！")
        return True
    
    print(f"发现 {total_missing} 个缺失或未翻译的键")
    print(f"  - 缺失的键: {len(missing)}")
    print(f"  - 未翻译的键: {len(untranslated)}")
    print()
    
    # 读取目标文件
    target_data = {}
    if Path(target_file).exists():
        with open(target_file, 'r', encoding='utf-8') as f:
            target_data = json.load(f)
    
    # 读取源文件
    with open(source_file, 'r', encoding='utf-8') as f:
        source_data = json.load(f)
    
    # 翻译缺失的键
    translated_count = 0
    skipped_count = 0
    
    all_missing = missing + untranslated
    
    for i, item in enumerate(all_missing, 1):
        key_path = item['path']
        source_value = item['source']
        
        print(f"[{i}/{total_missing}] 翻译: {key_path[:60]}...")
        
        # 检查是否应该跳过
        if should_skip_translation(source_value):
            print(f"  跳过（特殊格式）: {source_value[:50]}...")
            skipped_count += 1
            # 即使跳过，也要设置值（保持一致性）
            set_nested_value(target_data, key_path, source_value)
            continue
        
        # 执行翻译
        try:
            if api_type == 'deepl' and api_key:
                translated = translate_with_deepl(source_value, target_lang, api_key, source_lang)
            else:
                translated = translate_with_google(source_value, target_lang, source_lang)
            
            set_nested_value(target_data, key_path, translated)
            translated_count += 1
            print(f"  ✓ {translated[:50]}...")
            
            # 避免 API 限制
            time.sleep(0.1)
        except Exception as e:
            print(f"  ✗ 翻译失败: {e}")
            # 失败时使用源值（避免丢失数据）
            set_nested_value(target_data, key_path, source_value)
    
    # 保存更新后的文件
    print()
    print(f"翻译完成！")
    print(f"  - 已翻译: {translated_count}")
    print(f"  - 已跳过: {skipped_count}")
    print(f"  - 总计: {total_missing}")
    
    # 确保目录存在
    target_path = Path(target_file)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    
    # 保存文件
    with open(target_file, 'w', encoding='utf-8') as f:
        json.dump(target_data, f, ensure_ascii=False, indent=2)
    
    print(f"✓ 已保存到: {target_file}")
    return True

def main():
    parser = argparse.ArgumentParser(description='自动翻译缺失的内容')
    parser.add_argument('--source', required=True, help='源文件路径')
    parser.add_argument('--target', required=True, help='目标文件路径')
    parser.add_argument('--lang', required=True, help='目标语言代码')
    parser.add_argument('--source-lang', default='en', help='源语言代码')
    parser.add_argument('--api', choices=['google', 'deepl'], default='google', help='使用的翻译 API')
    parser.add_argument('--api-key', help='API 密钥（DeepL 需要）')
    parser.add_argument('--dry-run', action='store_true', help='仅检查，不翻译')
    
    args = parser.parse_args()
    
    if args.dry_run:
        # 仅检查
        missing, untranslated = check_missing_translations(args.source, args.target)
        total = len(missing) + len(untranslated)
        print(f"发现 {total} 个缺失或未翻译的键")
        return 0 if total == 0 else 1
    
    # 执行自动翻译
    success = auto_translate_missing(
        args.source,
        args.target,
        args.lang,
        args.source_lang,
        args.api,
        args.api_key
    )
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
```

### 3. 批量检查和翻译脚本

创建 `sync_translations.py`：

```python
#!/usr/bin/env python3
"""
同步所有语言的翻译
自动检查并翻译所有目标语言文件
"""

import json
import subprocess
import sys
from pathlib import Path

# 配置
SOURCE_FILE = "frontend/src/i18n/locales/en.json"
TARGET_LANGUAGES = {
    'ar': 'Arabic',
    'vi': 'Vietnamese',
    'th': 'Thai',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean'
}

def sync_all_translations(api_type='google', api_key=None, dry_run=False):
    """同步所有语言的翻译"""
    results = {}
    
    for lang_code, lang_name in TARGET_LANGUAGES.items():
        if lang_code == 'en':
            continue
        
        target_file = f"frontend/src/i18n/locales/{lang_code}.json"
        
        print(f"\n{'='*60}")
        print(f"处理语言: {lang_name} ({lang_code})")
        print(f"{'='*60}")
        
        # 检查缺失的翻译
        cmd = [
            'python', 'check_translations.py',
            '--source', SOURCE_FILE,
            '--target', target_file
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        print(result.stdout)
        
        if result.returncode != 0:
            print(f"错误: {result.stderr}")
            results[lang_code] = {'status': 'error', 'error': result.stderr}
            continue
        
        # 解析输出，获取缺失数量
        missing_count = 0
        for line in result.stdout.split('\n'):
            if '缺失的键:' in line or '可能未翻译的键:' in line:
                try:
                    count = int(line.split(':')[1].strip())
                    missing_count += count
                except:
                    pass
        
        if missing_count == 0:
            print(f"✓ {lang_name} 翻译完整")
            results[lang_code] = {'status': 'complete', 'missing': 0}
            continue
        
        if dry_run:
            print(f"发现 {missing_count} 个缺失的翻译（仅检查模式）")
            results[lang_code] = {'status': 'needs_translation', 'missing': missing_count}
            continue
        
        # 执行自动翻译
        print(f"\n开始自动翻译 {missing_count} 个缺失的键...")
        cmd = [
            'python', 'auto_translate.py',
            '--source', SOURCE_FILE,
            '--target', target_file,
            '--lang', lang_code,
            '--api', api_type
        ]
        
        if api_key:
            cmd.extend(['--api-key', api_key])
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        print(result.stdout)
        
        if result.returncode == 0:
            results[lang_code] = {'status': 'translated', 'missing': missing_count}
        else:
            print(f"错误: {result.stderr}")
            results[lang_code] = {'status': 'error', 'error': result.stderr}
    
    # 打印总结
    print(f"\n{'='*60}")
    print("总结")
    print(f"{'='*60}")
    
    for lang_code, result in results.items():
        status = result['status']
        if status == 'complete':
            print(f"✓ {TARGET_LANGUAGES[lang_code]}: 翻译完整")
        elif status == 'translated':
            print(f"✓ {TARGET_LANGUAGES[lang_code]}: 已翻译 {result['missing']} 个键")
        elif status == 'needs_translation':
            print(f"⚠ {TARGET_LANGUAGES[lang_code]}: 需要翻译 {result['missing']} 个键")
        else:
            print(f"✗ {TARGET_LANGUAGES[lang_code]}: 错误 - {result.get('error', 'Unknown error')}")
    
    return results

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='同步所有语言的翻译')
    parser.add_argument('--api', choices=['google', 'deepl'], default='google', help='使用的翻译 API')
    parser.add_argument('--api-key', help='API 密钥（DeepL 需要）')
    parser.add_argument('--dry-run', action='store_true', help='仅检查，不翻译')
    
    args = parser.parse_args()
    
    results = sync_all_translations(args.api, args.api_key, args.dry_run)
    
    # 如果有错误，返回非零退出码
    has_errors = any(r['status'] == 'error' for r in results.values())
    sys.exit(1 if has_errors else 0)
```

---

## 方案二：集成到构建流程

### 1. 创建 npm 脚本

在 `package.json` 中添加：

```json
{
  "scripts": {
    "i18n:check": "python check_translations.py --source frontend/src/i18n/locales/en.json --target frontend/src/i18n/locales/ar.json",
    "i18n:translate": "python auto_translate.py --source frontend/src/i18n/locales/en.json --target frontend/src/i18n/locales/ar.json --lang ar",
    "i18n:sync": "python sync_translations.py",
    "i18n:sync:check": "python sync_translations.py --dry-run"
  }
}
```

### 2. 创建 Git Hook（可选）

创建 `.git/hooks/pre-commit`：

```bash
#!/bin/bash
# 在提交前检查翻译完整性

echo "检查翻译完整性..."

python sync_translations.py --dry-run

if [ $? -ne 0 ]; then
    echo "警告: 发现未翻译的内容"
    read -p "是否继续提交? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
```

---

## 方案三：CI/CD 集成

### GitHub Actions 示例

创建 `.github/workflows/i18n-check.yml`：

```yaml
name: Check Translations

on:
  pull_request:
    paths:
      - 'frontend/src/i18n/locales/*.json'
  push:
    branches:
      - main

jobs:
  check-translations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      
      - name: Install dependencies
        run: |
          pip install googletrans==4.0.0rc1
      
      - name: Check translations
        run: |
          python sync_translations.py --dry-run
      
      - name: Auto-translate missing (optional)
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        env:
          DEEPL_API_KEY: ${{ secrets.DEEPL_API_KEY }}
        run: |
          python sync_translations.py --api deepl --api-key $DEEPL_API_KEY
```

---

## 方案四：实时监控和自动翻译

### 创建监控脚本 `watch_translations.py`：

```python
#!/usr/bin/env python3
"""
监控翻译文件变化，自动翻译新增内容
使用方法: python watch_translations.py
"""

import time
import json
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from auto_translate import auto_translate_missing

class TranslationWatcher(FileSystemEventHandler):
    def __init__(self, source_file, target_languages, api_type='google', api_key=None):
        self.source_file = source_file
        self.target_languages = target_languages
        self.api_type = api_type
        self.api_key = api_key
        self.last_modified = {}
    
    def on_modified(self, event):
        if event.src_path == self.source_file:
            print(f"检测到源文件变化: {self.source_file}")
            self.auto_translate_all()
    
    def auto_translate_all(self):
        """自动翻译所有目标语言"""
        for lang_code in self.target_languages:
            target_file = f"frontend/src/i18n/locales/{lang_code}.json"
            print(f"\n自动翻译 {lang_code}...")
            auto_translate_missing(
                self.source_file,
                target_file,
                lang_code,
                'en',
                self.api_type,
                self.api_key
            )

def main():
    source_file = "frontend/src/i18n/locales/en.json"
    target_languages = ['ar', 'vi', 'th']
    
    event_handler = TranslationWatcher(source_file, target_languages)
    observer = Observer()
    observer.schedule(event_handler, path=Path(source_file).parent, recursive=False)
    observer.start()
    
    print(f"监控翻译文件: {source_file}")
    print("按 Ctrl+C 停止")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

if __name__ == "__main__":
    main()
```

---

## 使用示例

### 1. 检查缺失的翻译

```bash
# 检查单个语言
python check_translations.py \
  --source frontend/src/i18n/locales/en.json \
  --target frontend/src/i18n/locales/ar.json \
  --output translation_report.json

# 检查所有语言
python sync_translations.py --dry-run
```

### 2. 自动翻译缺失的内容

```bash
# 翻译单个语言
python auto_translate.py \
  --source frontend/src/i18n/locales/en.json \
  --target frontend/src/i18n/locales/ar.json \
  --lang ar

# 同步所有语言
python sync_translations.py
```

### 3. 实时监控（开发时）

```bash
# 启动监控（需要安装 watchdog: pip install watchdog）
python watch_translations.py
```

---

## 完整的工作流程

### 日常开发流程

1. **开发新功能时**：
   ```bash
   # 1. 添加英文翻译到 en.json
   # 2. 运行检查
   npm run i18n:sync:check
   
   # 3. 自动翻译
   npm run i18n:sync
   ```

2. **提交代码前**：
   ```bash
   # Git hook 会自动检查翻译完整性
   git commit -m "Add new feature"
   ```

3. **CI/CD 自动检查**：
   - GitHub Actions 自动检查 PR 中的翻译
   - 如果有缺失，自动翻译并提交

---

## 高级功能

### 1. 翻译质量检查

可以添加翻译质量检查：
- 检查翻译长度（避免 UI 溢出）
- 检查专业术语一致性
- 检查占位符是否正确保留

### 2. 翻译缓存

避免重复翻译相同内容：
```python
# 使用 MD5 哈希缓存翻译结果
import hashlib

def get_translation_cache_key(text, target_lang):
    return hashlib.md5(f"{text}:{target_lang}".encode()).hexdigest()
```

### 3. 批量翻译优化

- 合并相似文本批量翻译
- 使用翻译记忆库（TM）
- 支持术语表（Glossary）

---

## 总结

这个自动翻译系统提供了：
1. ✅ **自动发现**未翻译的内容
2. ✅ **自动翻译**缺失的键
3. ✅ **批量处理**所有语言
4. ✅ **CI/CD 集成**支持
5. ✅ **实时监控**文件变化

**推荐使用流程**：
1. 开发时：使用 `watch_translations.py` 实时监控
2. 提交前：使用 `sync_translations.py --dry-run` 检查
3. CI/CD：自动检查和翻译




