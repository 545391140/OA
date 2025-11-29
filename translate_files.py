#!/usr/bin/env python3
"""
批量翻译 JSON 文件脚本
支持 Google Translate API 和 DeepL API

使用方法:
    # Google Translate (免费，无需 API Key)
    python translate_files.py --source frontend/src/i18n/locales/en.json --target frontend/src/i18n/locales/ar.json --lang ar

    # DeepL API (需要 API Key)
    python translate_files.py --source frontend/src/i18n/locales/en.json --target frontend/src/i18n/locales/ar.json --lang ar --api deepl --api-key YOUR_API_KEY
"""

import json
import argparse
import time
import sys
import os
from pathlib import Path

try:
    from googletrans import Translator
    GOOGLETRANS_AVAILABLE = True
except ImportError:
    GOOGLETRANS_AVAILABLE = False
    print("警告: googletrans 未安装，使用: pip install googletrans==4.0.0rc1")

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    print("警告: requests 未安装，使用: pip install requests")


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
        raise ImportError("googletrans 未安装")
    
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
        raise ImportError("requests 未安装")
    
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


def translate_value(value, path, target_data, target_lang, source_lang, api_type, api_key=None):
    """递归翻译值"""
    if isinstance(value, dict):
        result = {}
        for key, val in value.items():
            current_path = f"{path}.{key}" if path else key
            result[key] = translate_value(val, current_path, target_data, target_lang, source_lang, api_type, api_key)
        return result
    elif isinstance(value, list):
        return [translate_value(item, path, target_data, target_lang, source_lang, api_type, api_key) for item in value]
    elif isinstance(value, str):
        # 检查是否应该跳过翻译
        if should_skip_translation(value):
            return value
        
        # 检查是否已经翻译过（如果目标文件存在该键）
        if path:
            existing = get_nested_value(target_data, path)
            if existing and existing != value and existing.strip():
                print(f"保留现有翻译: {path}")
                return existing
        
        # 执行翻译
        try:
            if api_type == 'deepl' and api_key:
                translated = translate_with_deepl(value, target_lang, api_key, source_lang)
            else:
                translated = translate_with_google(value, target_lang, source_lang)
            
            if translated != value:
                print(f"翻译: {path[:50]}... = {value[:30]}... -> {translated[:30]}...")
            else:
                print(f"跳过（未变化）: {path[:50]}...")
            
            # 避免 API 限制
            time.sleep(0.1)
            return translated
        except Exception as e:
            print(f"翻译失败 {path}: {e}")
            return value
    else:
        return value


def translate_json_file(source_file, target_file, target_lang, source_lang='en', api_type='google', api_key=None):
    """
    翻译 JSON 文件
    """
    # 检查源文件是否存在
    if not os.path.exists(source_file):
        print(f"错误: 源文件不存在: {source_file}")
        return False
    
    # 读取源文件
    try:
        with open(source_file, 'r', encoding='utf-8') as f:
            source_data = json.load(f)
    except Exception as e:
        print(f"错误: 无法读取源文件: {e}")
        return False
    
    # 读取目标文件（如果存在）
    target_data = {}
    if os.path.exists(target_file):
        try:
            with open(target_file, 'r', encoding='utf-8') as f:
                target_data = json.load(f)
            print(f"已加载现有目标文件: {target_file}")
        except Exception as e:
            print(f"警告: 无法读取目标文件，将创建新文件: {e}")
    
    # 翻译数据
    print(f"开始翻译 {source_file} -> {target_file}")
    print(f"源语言: {source_lang}, 目标语言: {target_lang}, API: {api_type}")
    print("-" * 60)
    
    translated_data = translate_value(source_data, "", target_data, target_lang, source_lang, api_type, api_key)
    
    # 确保目标目录存在
    target_path = Path(target_file)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    
    # 保存翻译结果
    try:
        with open(target_file, 'w', encoding='utf-8') as f:
            json.dump(translated_data, f, ensure_ascii=False, indent=2)
        print("-" * 60)
        print(f"✓ 翻译完成！已保存到 {target_file}")
        return True
    except Exception as e:
        print(f"错误: 无法保存文件: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description='批量翻译 JSON 文件',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 使用 Google Translate（免费）
  python translate_files.py --source frontend/src/i18n/locales/en.json --target frontend/src/i18n/locales/ar.json --lang ar

  # 使用 DeepL API
  python translate_files.py --source frontend/src/i18n/locales/en.json --target frontend/src/i18n/locales/ar.json --lang ar --api deepl --api-key YOUR_API_KEY

  # 批量翻译多个语言
  for lang in ar vi th; do
    python translate_files.py --source frontend/src/i18n/locales/en.json --target frontend/src/i18n/locales/$lang.json --lang $lang
  done
        """
    )
    
    parser.add_argument('--source', required=True, help='源文件路径（通常是 en.json）')
    parser.add_argument('--target', required=True, help='目标文件路径')
    parser.add_argument('--lang', required=True, help='目标语言代码 (ar, vi, th, zh, ja, ko)')
    parser.add_argument('--source-lang', default='en', help='源语言代码 (默认: en)')
    parser.add_argument('--api', choices=['google', 'deepl'], default='google', help='使用的翻译 API (默认: google)')
    parser.add_argument('--api-key', help='API 密钥（DeepL 需要）')
    
    args = parser.parse_args()
    
    # 验证 API 可用性
    if args.api == 'deepl':
        if not args.api_key:
            print("错误: DeepL API 需要 --api-key 参数")
            sys.exit(1)
        if not REQUESTS_AVAILABLE:
            print("错误: 需要安装 requests: pip install requests")
            sys.exit(1)
    else:
        if not GOOGLETRANS_AVAILABLE:
            print("错误: 需要安装 googletrans: pip install googletrans==4.0.0rc1")
            sys.exit(1)
    
    # 执行翻译
    success = translate_json_file(
        args.source,
        args.target,
        args.lang,
        args.source_lang,
        args.api,
        args.api_key
    )
    
    if success:
        # 验证 JSON 格式
        try:
            with open(args.target, 'r', encoding='utf-8') as f:
                json.load(f)
            print("✓ JSON 格式验证通过")
        except json.JSONDecodeError as e:
            print(f"警告: JSON 格式可能有问题: {e}")
            print("请手动检查文件")
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()




