#!/usr/bin/env python3
"""
自动翻译缺失的内容
使用方法: python auto_translate.py --source en.json --target ar.json --lang ar
"""

import json
import argparse
import sys
import time
from pathlib import Path

# 导入翻译函数（需要先安装依赖）
try:
    from googletrans import Translator
    GOOGLETRANS_AVAILABLE = True
except ImportError:
    GOOGLETRANS_AVAILABLE = False

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

# 导入检查函数
from check_translations import check_missing_translations, get_nested_value

def set_nested_value(data, path, value):
    """设置嵌套值"""
    keys = path.split('.')
    current = data
    for key in keys[:-1]:
        if key not in current:
            current[key] = {}
        current = current[key]
    current[keys[-1]] = value

def should_skip_translation(value):
    """判断是否应该跳过翻译"""
    if not isinstance(value, str):
        return False
    
    # 跳过空字符串
    if not value.strip():
        return False
    
    # 跳过占位符和模板变量
    if value.startswith('{') or value.startswith('$') or '{{' in value:
        return True
    
    # 跳过 URL
    if value.startswith('http://') or value.startswith('https://'):
        return True
    
    # 跳过日期格式（如 "MMM DD, YYYY"）
    if any(x in value.upper() for x in ['MMM', 'DD', 'YYYY', 'MM', 'DD']):
        return True
    
    # 跳过货币代码（如 "USD", "CNY"）
    if value in ['USD', 'CNY', 'JPY', 'KRW', 'EUR']:
        return True
    
    return False

def translate_with_google(text, target_lang, source_lang='en'):
    """使用 Google Translate 翻译"""
    if not GOOGLETRANS_AVAILABLE:
        raise ImportError("googletrans 未安装，使用: pip install googletrans==4.0.0rc1")
    
    translator = Translator()
    try:
        result = translator.translate(text, src=source_lang, dest=target_lang)
        return result.text
    except Exception as e:
        print(f"翻译失败: {e}")
        return text

def translate_with_deepl(text, target_lang, api_key, source_lang='EN'):
    """使用 DeepL API 翻译"""
    if not REQUESTS_AVAILABLE:
        raise ImportError("requests 未安装，使用: pip install requests")
    
    # DeepL 语言代码映射
    deepl_lang_map = {
        'ar': 'AR',
        'vi': 'VI',
        'th': 'TH',
        'en': 'EN',
        'zh': 'ZH',
        'ja': 'JA',
        'ko': 'KO'
    }
    
    target_lang_code = deepl_lang_map.get(target_lang, target_lang.upper())
    source_lang_code = deepl_lang_map.get(source_lang, source_lang.upper())
    
    url = "https://api-free.deepl.com/v2/translate"
    
    params = {
        'auth_key': api_key,
        'text': text,
        'source_lang': source_lang_code,
        'target_lang': target_lang_code,
        'preserve_formatting': '1'
    }
    
    try:
        response = requests.post(url, data=params, timeout=10)
        if response.status_code == 200:
            return response.json()['translations'][0]['text']
        else:
            raise Exception(f"DeepL API 错误: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"DeepL 翻译失败: {e}")
        return text

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
    
    # 验证 API 可用性
    if args.api == 'deepl':
        if not args.api_key:
            print("错误: DeepL API 需要 --api-key 参数")
            return 1
        if not REQUESTS_AVAILABLE:
            print("错误: 需要安装 requests: pip install requests")
            return 1
    else:
        if not GOOGLETRANS_AVAILABLE:
            print("错误: 需要安装 googletrans: pip install googletrans==4.0.0rc1")
            return 1
    
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




