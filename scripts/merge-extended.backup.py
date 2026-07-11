import csv
from collections import defaultdict
from datetime import datetime

PROCESSED = "data/processed"
EXTENDED = "data/extended"

PLAYER_TEAMS_PATH = f"{PROCESSED}/player_teams_import.csv"
TRANSFER_HISTORY_PATH = (
    f"{EXTENDED}/transfer_history/transfer_history.csv"
)


def parse_year(value: str | None) -> int | None:
    if not value:
        return None

    value = value.strip()

    try:
        return datetime.strptime(value[:10], "%Y-%m-%d").year
    except ValueError:
        return None


# Yalnızca mevcut players/teams tablolarında bulunan ID'leri kabul et.
valid_player_ids: set[str] = set()
valid_team_ids: set[str] = set()

print("Oyuncular yükleniyor...")

with open(
    f"{PROCESSED}/players_import.csv",
    encoding="utf-8",
    newline="",
) as file:
    for row in csv.DictReader(file):
        player_id = row["external_player_id"].strip()

        if player_id:
            valid_player_ids.add(player_id)

print("Takımlar yükleniyor...")

with open(
    f"{PROCESSED}/teams_import.csv",
    encoding="utf-8",
    newline="",
) as file:
    for row in csv.DictReader(file):
        club_id = row["external_club_id"].strip()

        if club_id:
            valid_team_ids.add(club_id)


# Her (player_id, club_id) çifti için tek kayıt.
relations = defaultdict(
    lambda: {
        "from_year": None,
        "to_year": None,
    }
)


def add_relation(
    player_id: str | None,
    club_id: str | None,
    from_year: int | None,
    to_year: int | None = None,
):
    if not player_id or not club_id:
        return

    player_id = str(player_id).strip()
    club_id = str(club_id).strip()

    if (
        player_id not in valid_player_ids
        or club_id not in valid_team_ids
    ):
        return

    years = [
        year
        for year in (from_year, to_year)
        if year is not None
    ]

    if not years:
        return

    relation = relations[(player_id, club_id)]
    earliest = min(years)
    latest = max(years)

    if (
        relation["from_year"] is None
        or earliest < relation["from_year"]
    ):
        relation["from_year"] = earliest

    if (
        relation["to_year"] is None
        or latest > relation["to_year"]
    ):
        relation["to_year"] = latest


print("Mevcut ilişkiler yükleniyor...")

with open(
    PLAYER_TEAMS_PATH,
    encoding="utf-8",
    newline="",
) as file:
    for row in csv.DictReader(file):
        from_year = (
            int(row["from_year"])
            if row["from_year"].isdigit()
            else None
        )
        to_year = (
            int(row["to_year"])
            if row["to_year"].isdigit()
            else None
        )

        add_relation(
            row["external_player_id"],
            row["external_club_id"],
            from_year,
            to_year,
        )

initial_count = len(relations)
print(f"Mevcut benzersiz ilişki: {initial_count:,}")

print("Extended transfer geçmişi okunuyor...")

processed = 0

with open(
    TRANSFER_HISTORY_PATH,
    encoding="utf-8",
    newline="",
) as file:
    for row in csv.DictReader(file):
        player_id = row.get("player_id")
        year = parse_year(row.get("transfer_date"))

        add_relation(
            player_id,
            row.get("from_team_id"),
            year,
        )

        add_relation(
            player_id,
            row.get("to_team_id"),
            year,
        )

        processed += 1

        if processed % 100_000 == 0:
            print(f"{processed:,} transfer işlendi...")

final_count = len(relations)

print(f"Yeni eklenen benzersiz ilişki: {final_count - initial_count:,}")
print(f"Toplam benzersiz ilişki: {final_count:,}")
print("Dosya yazılıyor...")

with open(
    PLAYER_TEAMS_PATH,
    "w",
    encoding="utf-8",
    newline="",
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
        relations.items(),
        key=lambda item: (
            int(item[0][0]),
            int(item[0][1]),
        ),
    ):
        writer.writerow({
            "external_player_id": player_id,
            "external_club_id": club_id,
            "from_year": years["from_year"] or "",
            "to_year": years["to_year"] or "",
        })

print("Tamamlandı.")