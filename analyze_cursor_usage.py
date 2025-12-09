#!/usr/bin/env python3
"""
Analyse der Cursor-Nutzungsstatistiken und Berechnung der täglichen Kosten
"""

import re
from collections import defaultdict
from datetime import datetime

def parse_cost(cost_str):
    """Parse Kosten-String zu Float"""
    if not cost_str or cost_str == '-':
        return 0.0
    if '<$0.01' in cost_str:
        return 0.005  # Schätzung für sehr kleine Beträge
    # Entferne US$ und konvertiere
    cost_str = cost_str.replace('US$', '').replace('Included', '').strip()
    try:
        return float(cost_str)
    except:
        return 0.0

def parse_date(date_str):
    """Parse Datum-String"""
    # Format: "Dec 2, 03:57 PM" oder "Nov 30, 07:28 PM"
    try:
        # Füge Jahr hinzu (2024)
        date_str_with_year = f"{date_str}, 2024"
        return datetime.strptime(date_str_with_year, "%b %d, %I:%M %p, %Y")
    except Exception as e:
        return None

def parse_usage_line(line):
    """Parse eine Zeile der Nutzungsdaten"""
    # Split by tabs or multiple spaces
    parts = re.split(r'\t+|\s{2,}', line.strip())
    if len(parts) < 4:
        return None
    
    date_str = parts[0] + ", " + parts[1] + ", " + parts[2]  # "Dec 2, 03:57 PM"
    status = parts[3]
    model = parts[4] if len(parts) > 4 else ""
    tokens = parts[5] if len(parts) > 5 else "0"
    cost_str = parts[6] if len(parts) > 6 else "0"
    
    return {
        'date': parse_date(date_str),
        'status': status,
        'model': model,
        'tokens': tokens,
        'cost': parse_cost(cost_str)
    }

# Manuelle Eingabe der wichtigsten Daten für schnelle Analyse
# Aus den bereitgestellten Daten extrahiert:

usage_entries = [
    # Dec 2, 2024
    ("Dec 2, 03:57 PM", "On-Demand", "composer-1", "23.9K", "US$0.02"),
    ("Dec 2, 03:37 PM", "On-Demand", "composer-1", "692K", "US$0.24"),
    ("Dec 2, 03:30 PM", "On-Demand", "composer-1", "1.2M", "US$0.39"),
    ("Dec 2, 03:18 PM", "On-Demand", "composer-1", "167.9K", "US$0.07"),
    ("Dec 2, 03:16 PM", "On-Demand", "composer-1", "1.1M", "US$0.36"),
]

daily_costs = defaultdict(float)
daily_on_demand = defaultdict(float)
daily_included = defaultdict(float)
daily_requests = defaultdict(int)
daily_errored = defaultdict(int)
model_usage = defaultdict(lambda: {'count': 0, 'cost': 0.0})

# Parse alle Einträge
for date_str, status, model, tokens, cost_str in usage_entries:
    date_obj = parse_date(date_str)
    if date_obj:
        date_key = date_obj.strftime('%Y-%m-%d')
        cost = parse_cost(cost_str)
        
        daily_requests[date_key] += 1
        model_usage[model]['count'] += 1
        model_usage[model]['cost'] += cost
        
        if status == 'On-Demand':
            daily_on_demand[date_key] += cost
            daily_costs[date_key] += cost
        elif status == 'Included':
            daily_included[date_key] += cost
        elif 'Errored' in status:
            daily_errored[date_key] += 1

# Manuelle Berechnung basierend auf den sichtbaren Daten
# Dec 2: 5 On-Demand Requests = $0.02 + $0.24 + $0.39 + $0.07 + $0.36 = $1.08

print("=" * 60)
print("CURSOR NUTZUNGSANALYSE - TÄGLICHE KOSTEN")
print("=" * 60)
print()

# Analyse der sichtbaren Daten
print("📊 ANALYSE DER SICHTBAREN DATEN (Dec 2, 2024):")
print("-" * 60)
print(f"On-Demand Requests: 5")
print(f"On-Demand Kosten: US$1.08")
print(f"Included Requests: ~13 (im Abo enthalten)")
print()

# Schätzung basierend auf dem Muster
print("💡 WICHTIGE ERKENNTNISSE:")
print("-" * 60)
print("1. Die meisten Requests sind 'Included' (im Abo enthalten)")
print("2. Nur 'On-Demand' Requests verursachen zusätzliche Kosten")
print("3. Dec 2 zeigt: 5 On-Demand Requests = US$1.08")
print()

print("📈 GESCHÄTZTE TÄGLICHE KOSTEN:")
print("-" * 60)
print("Basierend auf Dec 2, 2024:")
print(f"  • Tägliche On-Demand Kosten: ~US$1.08")
print(f"  • Monatliche On-Demand Kosten (30 Tage): ~US$32.40")
print()

print("⚠️  HINWEIS:")
print("-" * 60)
print("Für eine vollständige Analyse benötige ich:")
print("  • Alle Datenpunkte (Sie haben 613 Einträge erwähnt)")
print("  • Ihren Abo-Plan (Pro/Pro Plus/Ultra)")
print("  • Den Zeitraum der Nutzung")
print()

print("💼 ABO-KOSTEN (monatlich):")
print("-" * 60)
print("  • Pro Plan: US$20/Monat")
print("  • Pro Plus Plan: US$60/Monat")
print("  • Ultra Plan: US$200/Monat")
print()

print("📋 GESAMTKOSTEN PRO TAG (geschätzt):")
print("-" * 60)
print("  Abo-Kosten/Tag + On-Demand-Kosten/Tag")
print("  Beispiel (Pro Plan):")
print(f"    • Abo: US$20/30 = US$0.67/Tag")
print(f"    • On-Demand: ~US$1.08/Tag")
print(f"    • GESAMT: ~US$1.75/Tag")
print()
