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
    elif isinstance(data, list):
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
        
        if source_value is None:
            continue
        
        if target_value is None:
            missing_keys.append({
                'path': key_path,
                'source': source_value
            })
        elif isinstance(source_value, str) and isinstance(target_value, str):
            # 如果目标值与源值相同，可能是未翻译
            if target_value == source_value and source_value.strip():
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




