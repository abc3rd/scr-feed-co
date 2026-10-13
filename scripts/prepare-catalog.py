"""Prepare source identifiers for review without assigning live stock or stores."""
import argparse
import csv
import hashlib
import json
from collections import Counter, defaultdict
from decimal import Decimal, InvalidOperation
from pathlib import Path


def prepare(source):
    with source.open(newline='', encoding='utf-8-sig') as stream:
        reader = csv.reader(stream)
        headers = next(reader)
        rows = list(reader)
    required = ['Handle', 'Title', 'Variant SKU', 'Variant Barcode', 'Variant Price', 'Variant Inventory Qty', 'Product Category', 'Type']
    if any(field not in headers for field in required):
        raise ValueError('Source is missing required catalog columns.')
    indices = {field: headers.index(field) for field in required}
    records = []
    for ordinal, row in enumerate(rows, start=1):
        if len(row) < len(headers):
            raise ValueError(f'Source record {ordinal} has fewer values than its header.')
        get = lambda key: row[indices[key]].strip()
        raw_price = get('Variant Price')
        issues = ['confirm_store_location', 'confirm_current_quantity', 'confirm_current_price']
        if len(row) != len(headers):
            issues.append('source_column_count_mismatch')
        try:
            cents = Decimal(raw_price) * 100
            if not cents.is_finite() or cents < 0 or cents != cents.to_integral_value():
                raise ValueError
            cents = int(cents)
        except (InvalidOperation, ValueError):
            cents = None
            issues.append('invalid_source_price')
        raw_quantity = get('Variant Inventory Qty')
        try:
            quantity = Decimal(raw_quantity)
            if not quantity.is_finite() or quantity != quantity.to_integral_value():
                raise ValueError
            quantity = int(quantity)
        except (InvalidOperation, ValueError):
            quantity = None
            issues.append('invalid_source_quantity')
        if quantity is not None and quantity < 0:
            issues.append('negative_source_quantity')
        sku, barcode = get('Variant SKU'), get('Variant Barcode')
        if not sku:
            issues.append('missing_sku')
        if not sku and not barcode:
            issues.append('needs_product_identifier')
        records.append({
            'source_record': ordinal,
            'source_handle': get('Handle'),
            'name': get('Title'),
            'source_sku': sku,
            'source_barcode': barcode,
            'source_category': get('Product Category'),
            'source_type': get('Type'),
            'source_price': raw_price,
            'source_price_cents': cents,
            'source_quantity': raw_quantity,
            'source_quantity_integer': quantity,
            'location': None,
            'verified_price_cents': None,
            'verified_available': None,
            'is_active': False,
            'issues': issues,
        })
    for field, issue in [('source_sku', 'duplicate_sku'), ('source_barcode', 'duplicate_barcode')]:
        groups = defaultdict(list)
        for record in records:
            if record[field]:
                groups[record[field]].append(record)
        for group in groups.values():
            if len(group) > 1:
                for record in group:
                    record['issues'].append(issue)
    summary = {
        'source_filename': source.name,
        'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'source_records': len(records),
        'header_columns': len(headers),
        'record_column_counts': dict(Counter(map(len, rows))),
        'records_with_sku': sum(bool(r['source_sku']) for r in records),
        'records_with_barcode': sum(bool(r['source_barcode']) for r in records),
        'negative_quantity_records': sum('negative_source_quantity' in r['issues'] for r in records),
        'missing_identifier_records': sum('needs_product_identifier' in r['issues'] for r in records),
        'duplicate_sku_records': sum('duplicate_sku' in r['issues'] for r in records),
        'duplicate_barcode_records': sum('duplicate_barcode' in r['issues'] for r in records),
        'live_import_records': 0,
        'notes': [
            'Review file only. It does not assert current prices, stock, or store assignments.',
            'All original SKU/barcode strings are preserved, including leading zeros.',
            'Extra source columns are not mapped; catalog fields before the extra column retain their source positions.',
            'Resolve duplicate identifiers before enabling barcode matches.',
            'The prepared records are not directly importable into the live Product entity.',
        ],
    }
    return {'summary': summary, 'records': records}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    data = prepare(args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps(data['summary'], indent=2))
