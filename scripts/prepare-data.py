import csv
import os
import unicodedata
from collections import defaultdict

RAW = "data/raw"
OUT = "data/processed"

os.makedirs(OUT, exist_ok=True)

def normalize(text):
    if not text:
        return ""
    text = text.lower().strip()
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    return f"{text} {ascii_text}".strip()

def read_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

players_raw = read_csv(f"{RAW}/players.csv")
clubs_raw = read_csv(f"{RAW}/clubs.csv")
competitions_raw = read_csv(f"{RAW}/competitions.csv")
transfers_raw = read_csv(f"{RAW}/transfers.csv")

competition_country = {}
for row in competitions_raw:
    competition_id = row.get("competition_id")
    country = row.get("country_name") or row.get("country") or ""
    if competition_id:
        competition_country[competition_id] = country

max_season = max(
    int(row["last_season"])
    for row in players_raw
    if row.get("last_season", "").isdigit()
)

# players
with open(f"{OUT}/players_import.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(
        f,
        fieldnames=[
            "external_player_id",
            "name",
            "search_name",
            "country",
            "is_active",
        ],
    )
    writer.writeheader()

    for row in players_raw:
        if not row.get("player_id") or not row.get("name"):
            continue

        last_season = int(row["last_season"]) if row.get("last_season", "").isdigit() else 0

        writer.writerow({
            "external_player_id": row["player_id"],
            "name": row["name"],
            "search_name": normalize(row["name"]),
            "country": row.get("country_of_citizenship") or "",
            "is_active": "true" if last_season == max_season else "false",
        })

# teams
with open(f"{OUT}/teams_import.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(
        f,
        fieldnames=[
            "external_club_id",
            "name",
            "search_name",
            "country",
        ],
    )
    writer.writeheader()

    for row in clubs_raw:
        if not row.get("club_id") or not row.get("name"):
            continue

        competition_id = row.get("domestic_competition_id")

        writer.writerow({
            "external_club_id": row["club_id"],
            "name": row["name"],
            "search_name": normalize(row["name"]),
            "country": competition_country.get(competition_id, ""),
        })

# player-team relations
relations = defaultdict(lambda: {"from_year": None, "to_year": None})

def add_relation(player_id, club_id, year):
    if not player_id or not club_id or not year:
        return

    key = (player_id, club_id)
    current = relations[key]

    if current["from_year"] is None or year < current["from_year"]:
        current["from_year"] = year

    if current["to_year"] is None or year > current["to_year"]:
        current["to_year"] = year

for row in transfers_raw:
    player_id = row.get("player_id")
    transfer_date = row.get("transfer_date", "")
    year = None

    if len(transfer_date) >= 4 and transfer_date[:4].isdigit():
        year = int(transfer_date[:4])

    add_relation(player_id, row.get("from_club_id"), year)
    add_relation(player_id, row.get("to_club_id"), year)

# current clubs
for row in players_raw:
    player_id = row.get("player_id")
    club_id = row.get("current_club_id")
    last_season = row.get("last_season")

    if last_season and last_season.isdigit():
        add_relation(player_id, club_id, int(last_season))

with open(f"{OUT}/player_teams_import.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(
        f,
        fieldnames=[
            "external_player_id",
            "external_club_id",
            "from_year",
            "to_year",
        ],
    )
    writer.writeheader()

    for (player_id, club_id), years in relations.items():
        writer.writerow({
            "external_player_id": player_id,
            "external_club_id": club_id,
            "from_year": years["from_year"] or "",
            "to_year": years["to_year"] or "",
        })

print("Done.")
print("Generated:")
print("data/processed/players_import.csv")
print("data/processed/teams_import.csv")
print("data/processed/player_teams_import.csv")