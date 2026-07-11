import csv
import os
import unicodedata
from collections import defaultdict

RAW = "data/raw"
OUT = "data/processed"

os.makedirs(OUT, exist_ok=True)


def normalize(text: str) -> str:
    if not text:
        return ""

    original = text.lower().strip()
    ascii_text = (
        unicodedata.normalize("NFKD", original)
        .encode("ascii", "ignore")
        .decode("ascii")
    )

    return original if ascii_text == original else f"{original} {ascii_text}"


def load_csv(path: str):
    with open(path, newline="", encoding="utf-8") as file:
        return list(csv.DictReader(file))


def parse_year(value: str | None):
    if not value:
        return None

    value = value.strip()

    if len(value) >= 4 and value[:4].isdigit():
        return int(value[:4])

    return None


players_raw = load_csv(f"{RAW}/players.csv")
clubs_raw = load_csv(f"{RAW}/clubs.csv")
competitions_raw = load_csv(f"{RAW}/competitions.csv")
transfers_raw = load_csv(f"{RAW}/transfers.csv")

competition_country = {}

for row in competitions_raw:
    competition_id = row.get("competition_id", "").strip()
    country = (
        row.get("country_name")
        or row.get("country")
        or ""
    ).strip()

    if competition_id:
        competition_country[competition_id] = country

seasons = [
    int(row["last_season"])
    for row in players_raw
    if row.get("last_season", "").isdigit()
]

max_season = max(seasons) if seasons else 0


# --------------------------------------------------
# PLAYERS
# --------------------------------------------------

with open(
    f"{OUT}/players_import.csv",
    "w",
    newline="",
    encoding="utf-8",
) as file:
    writer = csv.DictWriter(
        file,
        fieldnames=[
            "external_player_id",
            "name",
            "search_name",
            "country",
            "is_active",
            "image_url",
        ],
    )

    writer.writeheader()

    for row in players_raw:
        player_id = row.get("player_id", "").strip()
        name = row.get("name", "").strip()

        if not player_id or not name:
            continue

        last_season = row.get("last_season", "")
        last_season_number = (
            int(last_season)
            if last_season.isdigit()
            else 0
        )

        writer.writerow({
            "external_player_id": player_id,
            "name": name,
            "search_name": normalize(name),
            "country": (
                row.get("country_of_citizenship")
                or ""
            ).strip(),
            "is_active": (
                "true"
                if max_season and last_season_number == max_season
                else "false"
            ),
            "image_url": (row.get("image_url") or "").strip(),
        })


# --------------------------------------------------
# TEAMS
# --------------------------------------------------

with open(
    f"{OUT}/teams_import.csv",
    "w",
    newline="",
    encoding="utf-8",
) as file:
    writer = csv.DictWriter(
        file,
        fieldnames=[
            "external_club_id",
            "name",
            "search_name",
            "country",
        ],
    )

    writer.writeheader()

    for row in clubs_raw:
        club_id = row.get("club_id", "").strip()
        name = row.get("name", "").strip()

        if not club_id or not name:
            continue

        competition_id = row.get(
            "domestic_competition_id",
            "",
        ).strip()

        writer.writerow({
            "external_club_id": club_id,
            "name": name,
            "search_name": normalize(name),
            "country": competition_country.get(
                competition_id,
                "",
            ),
        })


# --------------------------------------------------
# PLAYER - TEAM RELATIONS
# --------------------------------------------------

relations = defaultdict(
    lambda: {
        "from_year": None,
        "to_year": None,
    }
)


def add_relation(
    player_id: str | None,
    club_id: str | None,
    year: int | None,
):
    if not player_id or not club_id or year is None:
        return

    player_id = str(player_id).strip()
    club_id = str(club_id).strip()

    if not player_id or not club_id:
        return

    key = (player_id, club_id)
    relation = relations[key]

    if (
        relation["from_year"] is None
        or year < relation["from_year"]
    ):
        relation["from_year"] = year

    if (
        relation["to_year"] is None
        or year > relation["to_year"]
    ):
        relation["to_year"] = year


# 1) Appearances - stream olarak oku
print("Appearances okunuyor...")

appearance_count = 0

with open(
    f"{RAW}/appearances.csv",
    newline="",
    encoding="utf-8",
) as file:
    reader = csv.DictReader(file)

    for row in reader:
        add_relation(
            row.get("player_id"),
            row.get("player_club_id"),
            parse_year(row.get("date")),
        )

        appearance_count += 1

        if appearance_count % 500_000 == 0:
            print(f"{appearance_count:,} appearance işlendi...")


# 2) Transfers
print("Transfers okunuyor...")

for row in transfers_raw:
    player_id = row.get("player_id")
    year = parse_year(row.get("transfer_date"))

    add_relation(
        player_id,
        row.get("from_club_id"),
        year,
    )

    add_relation(
        player_id,
        row.get("to_club_id"),
        year,
    )


# 3) Current club
print("Current club ilişkileri ekleniyor...")

for row in players_raw:
    last_season = row.get("last_season", "")

    if not last_season.isdigit():
        continue

    add_relation(
        row.get("player_id"),
        row.get("current_club_id"),
        int(last_season),
    )


# --------------------------------------------------
# EXPORT PLAYER_TEAMS
# --------------------------------------------------

with open(
    f"{OUT}/player_teams_import.csv",
    "w",
    newline="",
    encoding="utf-8",
) as file:
    writer = csv.DictWriter(
        file,
        fieldnames=[
            "external_player_id",
            "external_club_id",
            "from_year",
            "to_year",
        ],
    )

    writer.writeheader()

    for (player_id, club_id), years in sorted(
        relations.items()
    ):
        writer.writerow({
            "external_player_id": player_id,
            "external_club_id": club_id,
            "from_year": years["from_year"] or "",
            "to_year": years["to_year"] or "",
        })


print("")
print("Tamamlandı.")
print(f"Appearance sayısı: {appearance_count:,}")
print(f"Player-team ilişkisi: {len(relations):,}")
print("")
print("Oluşturulan dosyalar:")
print("data/processed/players_import.csv")
print("data/processed/teams_import.csv")
print("data/processed/player_teams_import.csv")