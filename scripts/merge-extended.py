import csv
import re
import unicodedata
from collections import defaultdict
from datetime import datetime
from pathlib import Path

PROCESSED = Path("data/processed")
EXTENDED = Path("data/extended")

PLAYERS_FILE = PROCESSED / "players_import.csv"
TEAMS_FILE = PROCESSED / "teams_import.csv"
RELATIONS_FILE = PROCESSED / "player_teams_import.csv"

PROFILES_FILE = (
    EXTENDED
    / "player_profiles"
    / "player_profiles.csv"
)

TEAM_DETAILS_FILE = (
    EXTENDED
    / "team_details"
    / "team_details.csv"
)

TRANSFER_HISTORY_FILE = (
    EXTENDED
    / "transfer_history"
    / "transfer_history.csv"
)

INVALID_TEAM_NAMES = {
    "retired",
    "without club",
    "unknown",
    "career break",
    "suspended",
    "end of career",
    "no team",
}


def normalize(value: str | None) -> str:
    if not value:
        return ""

    value = value.strip().lower()

    value = (
        unicodedata.normalize("NFKD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
    )

    value = re.sub(r"[^a-z0-9]+", " ", value)

    return " ".join(value.split())


def clean_player_name(value: str | None) -> str:
    if not value:
        return ""

    # "Hakan Şükür (3363)" -> "Hakan Şükür"
    return re.sub(r"\s*\(\d+\)\s*$", "", value).strip()


def parse_year(value: str | None) -> int | None:
    if not value:
        return None

    value = value.strip()

    try:
        return datetime.strptime(value[:10], "%Y-%m-%d").year
    except ValueError:
        return None


def read_csv(path: Path):
    with path.open(
        encoding="utf-8",
        newline="",
    ) as file:
        yield from csv.DictReader(file)


def write_csv(
    path: Path,
    fieldnames: list[str],
    rows: list[dict],
):
    with path.open(
        "w",
        encoding="utf-8",
        newline="",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames,
        )

        writer.writeheader()
        writer.writerows(rows)


# --------------------------------------------------
# EXISTING PLAYERS
# --------------------------------------------------

print("Mevcut oyuncular yükleniyor...")

players_by_id: dict[str, dict] = {}

for row in read_csv(PLAYERS_FILE):
    player_id = row["external_player_id"].strip()

    if player_id:
        players_by_id[player_id] = row

initial_player_count = len(players_by_id)


# --------------------------------------------------
# EXTENDED PLAYERS
# --------------------------------------------------

print("Extended oyuncular ekleniyor...")

for row in read_csv(PROFILES_FILE):
    player_id = row.get("player_id", "").strip()
    name = clean_player_name(row.get("player_name"))

    if not player_id or not name:
        continue

    if player_id in players_by_id:
        continue

    current_club = (
        row.get("current_club_name")
        or ""
    ).strip()

    is_active = (
        normalize(current_club)
        not in INVALID_TEAM_NAMES
    )

    country = (
        row.get("citizenship")
        or row.get("country_of_birth")
        or ""
    ).strip()

    players_by_id[player_id] = {
        "external_player_id": player_id,
        "name": name,
        "search_name": normalize(name),
        "country": country,
        "is_active": (
            "true" if is_active else "false"
        ),
    }

print(
    "Yeni oyuncu:",
    f"{len(players_by_id) - initial_player_count:,}",
)


# --------------------------------------------------
# EXISTING TEAMS
# --------------------------------------------------

print("Mevcut takımlar yükleniyor...")

teams_by_id: dict[str, dict] = {}

for row in read_csv(TEAMS_FILE):
    team_id = row["external_club_id"].strip()

    if team_id:
        teams_by_id[team_id] = row

initial_team_count = len(teams_by_id)


# --------------------------------------------------
# EXTENDED TEAMS
# --------------------------------------------------

print("Extended takımlar ekleniyor...")

for row in read_csv(TEAM_DETAILS_FILE):
    club_id = row.get("club_id", "").strip()
    club_name = (
        row.get("club_name")
        or ""
    ).strip()

    if not club_id or not club_name:
        continue

    if normalize(club_name) in INVALID_TEAM_NAMES:
        continue

    if club_id in teams_by_id:
        continue

    teams_by_id[club_id] = {
        "external_club_id": club_id,
        "name": club_name,
        "search_name": normalize(club_name),
        "country": (
            row.get("country_name")
            or ""
        ).strip(),
    }

print(
    "Yeni takım:",
    f"{len(teams_by_id) - initial_team_count:,}",
)


# --------------------------------------------------
# PLAYER-TEAM RELATIONS
# --------------------------------------------------

relations = defaultdict(
    lambda: {
        "from_year": None,
        "to_year": None,
    }
)


def add_relation(
    player_id: str | None,
    team_id: str | None,
    from_year: int | None,
    to_year: int | None = None,
):
    if not player_id or not team_id:
        return

    player_id = str(player_id).strip()
    team_id = str(team_id).strip()

    if player_id not in players_by_id:
        return

    if team_id not in teams_by_id:
        return

    years = [
        year
        for year in (from_year, to_year)
        if year is not None
    ]

    if not years:
        return

    relation = relations[(player_id, team_id)]

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

for row in read_csv(RELATIONS_FILE):
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

initial_relation_count = len(relations)


# --------------------------------------------------
# EXTENDED TRANSFER HISTORY
# --------------------------------------------------

print("Extended transfer geçmişi okunuyor...")

processed = 0

for row in read_csv(TRANSFER_HISTORY_FILE):
    player_id = row.get("player_id")
    year = parse_year(row.get("transfer_date"))

    from_team_name = normalize(
        row.get("from_team_name")
    )

    to_team_name = normalize(
        row.get("to_team_name")
    )

    if from_team_name not in INVALID_TEAM_NAMES:
        add_relation(
            player_id,
            row.get("from_team_id"),
            year,
        )

    if to_team_name not in INVALID_TEAM_NAMES:
        add_relation(
            player_id,
            row.get("to_team_id"),
            year,
        )

    processed += 1

    if processed % 100_000 == 0:
        print(
            f"{processed:,} transfer işlendi..."
        )


# --------------------------------------------------
# EXTENDED CURRENT CLUBS
# --------------------------------------------------

print("Extended güncel kulüpler ekleniyor...")

for row in read_csv(PROFILES_FILE):
    player_id = row.get("player_id")
    team_id = row.get("current_club_id")
    team_name = normalize(
        row.get("current_club_name")
    )

    if team_name in INVALID_TEAM_NAMES:
        continue

    joined_year = parse_year(row.get("joined"))

    if joined_year:
        add_relation(
            player_id,
            team_id,
            joined_year,
            joined_year,
        )


# --------------------------------------------------
# EXPORT
# --------------------------------------------------

print("CSV dosyaları yazılıyor...")

player_rows = sorted(
    players_by_id.values(),
    key=lambda row: int(row["external_player_id"]),
)

team_rows = sorted(
    teams_by_id.values(),
    key=lambda row: int(row["external_club_id"]),
)

relation_rows = []

for (
    player_id,
    team_id,
), years in relations.items():
    relation_rows.append({
        "external_player_id": player_id,
        "external_club_id": team_id,
        "from_year": years["from_year"] or "",
        "to_year": years["to_year"] or "",
    })

relation_rows.sort(
    key=lambda row: (
        int(row["external_player_id"]),
        int(row["external_club_id"]),
    )
)

write_csv(
    PLAYERS_FILE,
    [
        "external_player_id",
        "name",
        "search_name",
        "country",
        "is_active",
    ],
    player_rows,
)

write_csv(
    TEAMS_FILE,
    [
        "external_club_id",
        "name",
        "search_name",
        "country",
    ],
    team_rows,
)

write_csv(
    RELATIONS_FILE,
    [
        "external_player_id",
        "external_club_id",
        "from_year",
        "to_year",
    ],
    relation_rows,
)

print("")
print("Tamamlandı.")
print(f"Toplam oyuncu: {len(player_rows):,}")
print(f"Toplam takım: {len(team_rows):,}")
print(f"Toplam ilişki: {len(relation_rows):,}")
print(
    f"Eklenen oyuncu: "
    f"{len(player_rows) - initial_player_count:,}"
)
print(
    f"Eklenen takım: "
    f"{len(team_rows) - initial_team_count:,}"
)
print(
    f"Eklenen ilişki: "
    f"{len(relation_rows) - initial_relation_count:,}"
)