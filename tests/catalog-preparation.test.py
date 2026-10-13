import csv
import importlib.util
import tempfile
import unittest
from pathlib import Path

module_path = Path(__file__).parents[1] / 'scripts' / 'prepare-catalog.py'
spec = importlib.util.spec_from_file_location('prepare_catalog', module_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
HEADERS = ['Handle','Title','Variant SKU','Variant Barcode','Variant Price','Variant Inventory Qty','Product Category','Type']

class CatalogPreparationTests(unittest.TestCase):
    def prepare(self, rows, headers=HEADERS):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'source.csv'
            with path.open('w', newline='') as stream:
                writer = csv.writer(stream); writer.writerow(headers); writer.writerows(rows)
            return module.prepare(path)

    def test_preserves_identifiers_and_does_not_activate_historical_stock(self):
        data = self.prepare([['handle','Product','0007','001234567890','12.34','-5','Feed','Grain']])
        item = data['records'][0]
        self.assertEqual(item['source_sku'], '0007')
        self.assertEqual(item['source_barcode'], '001234567890')
        self.assertEqual(item['source_price_cents'], 1234)
        self.assertEqual(item['source_quantity_integer'], -5)
        self.assertIn('negative_source_quantity', item['issues'])
        self.assertIsNone(item['verified_available'])
        self.assertIsNone(item['location'])
        self.assertFalse(item['is_active'])

    def test_duplicates_are_flagged_and_records_are_not_merged(self):
        row = ['handle','Product','SKU','00123','12.34','5','Feed','Grain']
        data = self.prepare([row,row])
        self.assertEqual(len(data['records']), 2)
        self.assertTrue(all('duplicate_sku' in item['issues'] for item in data['records']))
        self.assertTrue(all('duplicate_barcode' in item['issues'] for item in data['records']))

    def test_misaligned_columns_are_review_flags(self):
        row = ['handle','Product','SKU','00123','12.34','5','Feed','Grain','unexpected']
        data = self.prepare([row])
        self.assertIn('source_column_count_mismatch', data['records'][0]['issues'])

    def test_invalid_prices_and_quantities_do_not_become_zero(self):
        row = ['handle','Product','','','invalid','invalid','Feed','Grain']
        item = self.prepare([row])['records'][0]
        self.assertIsNone(item['source_price_cents'])
        self.assertIsNone(item['source_quantity_integer'])
        self.assertIn('needs_product_identifier', item['issues'])

if __name__ == '__main__':
    unittest.main()
