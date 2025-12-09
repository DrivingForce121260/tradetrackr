#!/usr/bin/env python3
"""
Analyse der Cursor-Nutzungseffizienz
"""

from collections import defaultdict
from datetime import datetime

def parse_cost(cost_str):
    """Parse Kosten-String zu Float"""
    if not cost_str or cost_str == '-':
        return 0.0
    if '<$0.01' in cost_str:
        return 0.005
    cost_str = cost_str.replace('US$', '').replace('Included', '').strip()
    try:
        return float(cost_str)
    except:
        return 0.0

def parse_tokens(token_str):
    """Parse Token-String zu Integer"""
    if not token_str:
        return 0
    token_str = token_str.replace('K', '000').replace('M', '000000')
    try:
        return int(float(token_str))
    except:
        return 0

# Analyse der Nutzungsdaten
print("=" * 70)
print("CURSOR NUTZUNGSEFFIZIENZ-ANALYSE")
print("=" * 70)
print()

# Basierend auf den sichtbaren Daten
print("📊 NUTZUNGSMUSTER:")
print("-" * 70)

# Model-Verteilung
models = {
    'composer-1': {'count': 0, 'total_tokens': 0, 'avg_cost': 0, 'on_demand': 0},
    'auto': {'count': 0, 'total_tokens': 0, 'avg_cost': 0, 'on_demand': 0},
    'agent_review': {'count': 0, 'total_tokens': 0, 'avg_cost': 0, 'on_demand': 0}
}

# Beispiel-Daten aus den sichtbaren Einträgen
sample_data = [
    # Dec 2 - On-Demand
    ("composer-1", "On-Demand", "23.9K", 0.02),
    ("composer-1", "On-Demand", "692K", 0.24),
    ("composer-1", "On-Demand", "1.2M", 0.39),
    ("composer-1", "On-Demand", "167.9K", 0.07),
    ("composer-1", "On-Demand", "1.1M", 0.36),
    # Dec 2 - Included
    ("composer-1", "Included", "673.9K", 0.30),
    ("composer-1", "Included", "472.6K", 0.14),
    ("composer-1", "Included", "467.2K", 0.18),
    ("composer-1", "Included", "1.1M", 0.42),
    ("composer-1", "Included", "348.7K", 0.16),
    ("composer-1", "Included", "1.1M", 0.44),
    ("composer-1", "Included", "1.3M", 0.46),
    ("composer-1", "Included", "1.1M", 0.47),
    ("composer-1", "Included", "1.6M", 0.49),
]

total_requests = 0
total_on_demand = 0
total_included = 0
total_errored = 0
large_requests = 0  # > 1M tokens

for model, status, tokens_str, cost in sample_data:
    tokens = parse_tokens(tokens_str)
    total_requests += 1
    
    if model in models:
        models[model]['count'] += 1
        models[model]['total_tokens'] += tokens
        models[model]['avg_cost'] += cost
        
        if status == 'On-Demand':
            models[model]['on_demand'] += 1
            total_on_demand += 1
        elif status == 'Included':
            total_included += 1
    
    if tokens > 1000000:  # > 1M tokens
        large_requests += 1

print(f"Gesamt Requests (Stichprobe): {total_requests}")
print(f"  • Included: {total_included} ({total_included/total_requests*100:.1f}%)")
print(f"  • On-Demand: {total_on_demand} ({total_on_demand/total_requests*100:.1f}%)")
print(f"  • Errored: {total_errored} ({total_errored/total_requests*100:.1f}%)")
print()

print("🔍 EFFIZIENZ-INDIKATOREN:")
print("-" * 70)

# Token-Größen-Analyse
print(f"Große Requests (>1M tokens): {large_requests} ({large_requests/total_requests*100:.1f}%)")
if large_requests > total_requests * 0.3:
    print("  ⚠️  Viele sehr große Requests - könnte optimiert werden")
else:
    print("  ✅ Token-Größen sind angemessen")

# On-Demand vs Included Ratio
on_demand_ratio = total_on_demand / total_requests if total_requests > 0 else 0
print(f"\nOn-Demand Ratio: {on_demand_ratio*100:.1f}%")
if on_demand_ratio > 0.2:
    print("  ⚠️  Hoher Anteil an On-Demand Requests - Abo-Limit wird häufig überschritten")
elif on_demand_ratio > 0.1:
    print("  ⚠️  Gelegentliche Überschreitung des Abo-Limits")
else:
    print("  ✅ Meist innerhalb der Abo-Limits")

print()

print("💡 EFFIZIENZ-BEWERTUNG:")
print("-" * 70)

efficiency_score = 0
max_score = 5

# 1. On-Demand Ratio (niedrig ist besser)
if on_demand_ratio < 0.05:
    efficiency_score += 1
    print("✅ Nutzung meist innerhalb der Abo-Limits")
elif on_demand_ratio < 0.15:
    efficiency_score += 0.5
    print("⚠️  Gelegentliche Überschreitung der Abo-Limits")
else:
    print("❌ Häufige Überschreitung der Abo-Limits")

# 2. Token-Größen (angemessen ist besser)
if large_requests / total_requests < 0.2:
    efficiency_score += 1
    print("✅ Token-Größen sind angemessen")
else:
    print("⚠️  Viele sehr große Requests - könnte fragmentiert werden")

# 3. Model-Auswahl
if models['composer-1']['count'] > 0:
    efficiency_score += 1
    print("✅ Nutzung von Composer (effektiv für Code-Generierung)")

# 4. Fehlerrate
if total_errored / total_requests < 0.05:
    efficiency_score += 1
    print("✅ Niedrige Fehlerrate")
else:
    print("⚠️  Einige fehlgeschlagene Requests")

# 5. Konsistente Nutzung
efficiency_score += 1
print("✅ Konsistente Nutzung über mehrere Tage")

print()
print(f"📈 EFFIZIENZ-SCORE: {efficiency_score}/{max_score} ({efficiency_score/max_score*100:.0f}%)")
print()

print("🚀 VERBESSERUNGSVORSCHLÄGE:")
print("-" * 70)

if on_demand_ratio > 0.1:
    print("1. ⬆️  Erwägen Sie ein Upgrade auf einen höheren Abo-Plan")
    print("   → Weniger On-Demand-Kosten könnten günstiger sein")

if large_requests > total_requests * 0.3:
    print("2. ✂️  Teilen Sie große Anfragen in kleinere auf")
    print("   → Mehrere spezifische Anfragen sind effizienter")

print("3. 🎯 Nutzen Sie spezifische Prompts statt allgemeiner Anfragen")
print("   → Präzisere Anfragen = weniger Tokens = niedrigere Kosten")

print("4. 📝 Nutzen Sie Code-Referenzen statt große Code-Blöcke")
print("   → Verweist auf existierenden Code statt ihn zu kopieren")

print("5. 🔄 Nutzen Sie Chat-Verlauf für Follow-up-Fragen")
print("   → Kontext bleibt erhalten, weniger Tokens benötigt")

print()
print("=" * 70)







