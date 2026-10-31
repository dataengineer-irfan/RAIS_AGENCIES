import re
from typing import Optional, Tuple

def extract_unit_weight_kg(packaging_unit: Optional[str], product_name: Optional[str] = "") -> float:
    """
    Extracts the physical weight multiplier in Kilograms (KG) from a product's
    packaging unit or product name.
    
    Examples:
      - '2.5 KG PACKET' -> 2.5
      - '2 KG PACKET'   -> 2.0
      - '1 KG PACKET'   -> 1.0
      - '500 GM' / '500G' -> 0.5
      - '200 GM'        -> 0.2
      - '100 GM'        -> 0.1
      - 'MILKY MIST MOZEROLLA DICED CHEESE 2KG' -> 2.0 (from name fallback)
      - '1 LTR' / '1 LITRE' -> 1.0
      - '1 PACKET' (no weight) -> 1.0
    """
    raw_str = f"{packaging_unit or ''} {product_name or ''}".upper()
    
    # 1. Match explicit KG: e.g. "2.5 KG", "2KG", "2.5KG", "2.5 KGS", "2 KILOGRAMS"
    kg_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:KG|KGS|KILOGRAM|KILOGRAMS)\b', raw_str)
    if kg_match:
        try:
            val = float(kg_match.group(1))
            if val > 0:
                return val
        except ValueError:
            pass

    # 2. Match Grams (GM/GMS/GRAM/GRAMS or e.g. 500G/100 G):
    gm_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:GM|GMS|GRAM|GRAMS|G)\b', raw_str)
    if gm_match:
        try:
            val = float(gm_match.group(1))
            if val > 0:
                return val / 1000.0
        except ValueError:
            pass
            
    # 3. Match Litres / L: e.g. "1 LTR", "5 LITRE", "1L"
    ltr_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:LTR|LTRS|LITRE|LITRES)\b', raw_str)
    if ltr_match:
        try:
            val = float(ltr_match.group(1))
            if val > 0:
                return val
        except ValueError:
            pass

    # Default fallback: 1 unit = 1.0 multiplier
    return 1.0

def format_weight_display(total_kg: float) -> str:
    """Formats KG nicely: e.g. 1,250 KG or 250.5 KG"""
    if total_kg >= 1000:
        return f"{total_kg:,.1f} KG"
    elif total_kg >= 10:
        return f"{total_kg:,.1f} KG"
    else:
        return f"{total_kg:,.2f} KG"
