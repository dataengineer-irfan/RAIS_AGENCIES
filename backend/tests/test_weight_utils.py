from app.core.weight_utils import extract_unit_weight_kg, format_weight_display

def test_extract_unit_weight_kg():
    # 1. Standard KG in packaging_unit
    assert extract_unit_weight_kg("2.5 KG PACKET") == 2.5
    assert extract_unit_weight_kg("2 KG PACKET") == 2.0
    assert extract_unit_weight_kg("1 KG PACKET") == 1.0
    assert extract_unit_weight_kg("5 KG BOX") == 5.0
    
    # 2. Grams conversion
    assert extract_unit_weight_kg("500 GM") == 0.5
    assert extract_unit_weight_kg("200 GM") == 0.2
    assert extract_unit_weight_kg("100 G") == 0.1
    
    # 3. Fallback to product name
    assert extract_unit_weight_kg("1 PACKET", "MILKY MIST MOZEROLLA DICED CHEESE 2KG") == 2.0
    assert extract_unit_weight_kg(None, "FRENCH FRIES 2.5KG") == 2.5
    
    # 4. Pure units / no weight
    assert extract_unit_weight_kg("1 PACKET", "CHICKEN MOMOS") == 1.0
    assert extract_unit_weight_kg("100 NOS", "BURGER BUNS") == 1.0

def test_format_weight_display():
    assert format_weight_display(250.5) == "250.5 KG"
    assert format_weight_display(1250.0) == "1,250.0 KG"
    assert format_weight_display(5.25) == "5.25 KG"
