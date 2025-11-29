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
            sys.executable, 'check_translations.py',
            '--source', SOURCE_FILE,
            '--target', target_file
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            print(result.stdout)
            
            if result.returncode != 0:
                print(f"错误: {result.stderr}")
                results[lang_code] = {'status': 'error', 'error': result.stderr}
                continue
            
            # 解析输出，获取缺失数量
            missing_count = 0
            untranslated_count = 0
            for line in result.stdout.split('\n'):
                if '缺失的键:' in line:
                    try:
                        missing_count = int(line.split(':')[1].strip())
                    except:
                        pass
                elif '可能未翻译的键:' in line:
                    try:
                        untranslated_count = int(line.split(':')[1].strip())
                    except:
                        pass
            
            total_missing = missing_count + untranslated_count
            
            if total_missing == 0:
                print(f"✓ {lang_name} 翻译完整")
                results[lang_code] = {'status': 'complete', 'missing': 0}
                continue
            
            if dry_run:
                print(f"发现 {total_missing} 个缺失的翻译（仅检查模式）")
                results[lang_code] = {'status': 'needs_translation', 'missing': total_missing}
                continue
            
            # 执行自动翻译
            print(f"\n开始自动翻译 {total_missing} 个缺失的键...")
            cmd = [
                sys.executable, 'auto_translate.py',
                '--source', SOURCE_FILE,
                '--target', target_file,
                '--lang', lang_code,
                '--api', api_type
            ]
            
            if api_key:
                cmd.extend(['--api-key', api_key])
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            print(result.stdout)
            
            if result.returncode == 0:
                results[lang_code] = {'status': 'translated', 'missing': total_missing}
            else:
                print(f"错误: {result.stderr}")
                results[lang_code] = {'status': 'error', 'error': result.stderr}
        except subprocess.TimeoutExpired:
            print(f"超时: {lang_name}")
            results[lang_code] = {'status': 'timeout'}
        except Exception as e:
            print(f"异常: {e}")
            results[lang_code] = {'status': 'error', 'error': str(e)}
    
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
        elif status == 'timeout':
            print(f"⏱ {TARGET_LANGUAGES[lang_code]}: 超时")
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




