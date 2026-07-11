import csv
import json
import re
import time
import unicodedata
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

PROCESSED = Path("data/processed")
RAW = Path("data/raw")
EXTENDED = Path("data/extended")

PLAYERS_FILE = PROCESSED / "players_import.csv"
TEAMS_FILE = PROCESSED / "teams_import.csv"
RELATIONS_FILE = PROCESSED / "player_teams_import.csv"

WDQS_ENDPOINT = "https://query.wikidata.org/sparql"

USER_AGENT = (
    "FutBilDataImporter/1.0 "
    "(football-link-game; contact: github.com/tR4ha/Futbil)"
)

PAGE_SIZE = 5000


def normalize(value: str | None) -> str:
    if not value:
        return ""

    value = value.strip().lower()
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"\([^)]*\)", " ", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)

    return " ".join(value.split())


def canonical_team_name(value: str | None) -> str:
    normalized = normalize(value)

    ignored_words = {
        "football",
        "futbol",
        "club",
        "clube",
        "kulubu",
        "kulup",
        "jimnastik",
        "sport",
        "sports",
        "sporting",
        "association",
        "societa",
        "calcio",
        "fc",
        "fk",
        "sk",
        "jk",
        "cf",
        "afc",
    }

    words = [
        word
        for word in normalized.split()
        if word not in ignored_words
    ]

    return " ".join(words)


def extract_qid(uri: str) -> str:
    return uri.rsplit("/", 1)[-1]


def qid_to_negative_id(qid: str) -> str:
    number = int(qid.removeprefix("Q"))
    return str(-number)


def extract_year(value: str | None) -> int | None:
    if not value:
        return None

    match = re.match(r"^(-?\d{1,4})", value)

    if not match:
        return None

    year = int(match.group(1))

    if year <= 0:
        return None

    return year


def fetch_sparql(query: str) -> dict:
    params = urlencode({
        "query": query,
        "format": "json",
    })

    request = Request(
        f"{WDQS_ENDPOINT}?{params}",
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/sparql-results+json",
        },
    )

    for attempt in range(1, 6):
        try:
            with urlopen(request, timeout=120) as response:
                return json.loads(response.read().decode("utf-8"))

        except (HTTPError, URLError, TimeoutError) as error:
            if attempt == 5:
                raise RuntimeError(
                    f"Wikidata sorgusu başarısız: {error}"
                ) from error

            wait_seconds = attempt * 10
            print(
                f"Wikidata geçici hata verdi. "
                f"{wait_seconds} saniye bekleniyor..."
            )
            time.sleep(wait_seconds)

    raise RuntimeError("Wikidata sorgusu tamamlanamadı.")


def read_rows(path: Path) -> list[dict]:
    with path.open(
        encoding="utf-8",
        newline="",
    ) as file:
        return list(csv.DictReader(file))


def write_rows(
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


print("Mevcut oyuncular yükleniyor...")

players_rows = read_rows(PLAYERS_FILE)

players_by_id: dict[str, dict] = {}
players_by_name: dict[str, list[str]] = defaultdict(list)
players_by_name_birth: dict[tuple[str, str], str] = {}

for row in players_rows:
    player_id = row["external_player_id"].strip()
    player_name = normalize(row["name"])

    players_by_id[player_id] = row
    players_by_name[player_name].append(player_id)


# İlk datasetten doğum tarihlerini al.
raw_players_path = RAW / "players.csv"

if raw_players_path.exists():
    for row in read_rows(raw_players_path):
        player_id = row.get("player_id", "").strip()
        name = normalize(row.get("name"))
        birth_date = (
            row.get("date_of_birth", "")
            .strip()[:10]
        )

        if player_id and name and birth_date:
            players_by_name_birth[
                (name, birth_date)
            ] = player_id


# Extended datasetten doğum tarihlerini de al.
extended_profiles_path = (
    EXTENDED
    / "player_profiles"
    / "player_profiles.csv"
)

if extended_profiles_path.exists():
    for row in read_rows(extended_profiles_path):
        player_id = row.get("player_id", "").strip()

        raw_name = row.get("player_name", "")
        raw_name = re.sub(
            r"\s*\(\d+\)\s*$",
            "",
            raw_name,
        )

        name = normalize(raw_name)
        birth_date = (
            row.get("date_of_birth", "")
            .strip()[:10]
        )

        if (
            player_id in players_by_id
            and name
            and birth_date
        ):
            players_by_name_birth[
                (name, birth_date)
            ] = player_id


print("Mevcut takımlar yükleniyor...")

teams_rows = read_rows(TEAMS_FILE)

teams_by_id: dict[str, dict] = {}
teams_by_exact_name: dict[str, list[str]] = defaultdict(list)
teams_by_canonical_name: dict[str, list[str]] = defaultdict(list)

for row in teams_rows:
    team_id = row["external_club_id"].strip()
    team_name = row["name"]

    teams_by_id[team_id] = row
    teams_by_exact_name[normalize(team_name)].append(team_id)

    canonical = canonical_team_name(team_name)

    if canonical:
        teams_by_canonical_name[canonical].append(team_id)


print("Mevcut oyuncu-takım ilişkileri yükleniyor...")

relation_years: dict[
    tuple[str, str],
    dict[str, int | None],
] = defaultdict(
    lambda: {
        "from_year": None,
        "to_year": None,
    }
)


def add_relation(
    player_id: str,
    team_id: str,
    from_year: int | None,
    to_year: int | None,
):
    if not player_id or not team_id:
        return

    values = [
        year
        for year in (from_year, to_year)
        if year is not None
    ]

    relation = relation_years[(player_id, team_id)]

    if not values:
        return

    earliest = min(values)
    latest = max(values)

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


for row in read_rows(RELATIONS_FILE):
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


initial_players = len(players_by_id)
initial_teams = len(teams_by_id)
initial_relations = len(relation_years)

print("Wikidata Türk futbolcuları çekiliyor...")


def find_existing_player_id(
    player_name: str,
    birth_date: str,
) -> str | None:
    normalized_name = normalize(player_name)

    if birth_date:
        matched = players_by_name_birth.get(
            (normalized_name, birth_date)
        )

        if matched:
            return matched

    name_matches = players_by_name.get(
        normalized_name,
        [],
    )

    if len(name_matches) == 1:
        return name_matches[0]

    return None


def find_existing_team_id(team_name: str) -> str | None:
    exact_matches = teams_by_exact_name.get(
        normalize(team_name),
        [],
    )

    if len(exact_matches) == 1:
        return exact_matches[0]

    canonical = canonical_team_name(team_name)

    canonical_matches = teams_by_canonical_name.get(
        canonical,
        [],
    )

    if len(canonical_matches) == 1:
        return canonical_matches[0]

    return None


offset = 0
wikidata_rows = 0

while True:
    query = f"""
SELECT
  ?player
  ?playerLabel
  ?birthDate
  ?team
  ?teamLabel
  ?start
  ?end
WHERE {{
  ?player wdt:P31 wd:Q5 ;
          wdt:P27 wd:Q43 ;
          wdt:P106 wd:Q937857 ;
          p:P54 ?membership .

  ?membership ps:P54 ?team .

  OPTIONAL {{
    ?player wdt:P569 ?birthDate .
  }}

  OPTIONAL {{
    ?membership pq:P580 ?start .
  }}

  OPTIONAL {{
    ?membership pq:P582 ?end .
  }}

  SERVICE wikibase:label {{
    bd:serviceParam wikibase:language "tr,en" .
  }}
}}
LIMIT {PAGE_SIZE}
OFFSET {offset}
"""

    result = fetch_sparql(query)
    bindings = result["results"]["bindings"]

    if not bindings:
        break

    print(
        f"{offset:,} - "
        f"{offset + len(bindings):,} Wikidata satırı işlendi..."
    )

    for binding in bindings:
        player_uri = binding["player"]["value"]
        team_uri = binding["team"]["value"]

        player_qid = extract_qid(player_uri)
        team_qid = extract_qid(team_uri)

        player_name = (
            binding.get("playerLabel", {})
            .get("value", player_qid)
            .strip()
        )

        team_name = (
            binding.get("teamLabel", {})
            .get("value", team_qid)
            .strip()
        )

        birth_date = (
            binding.get("birthDate", {})
            .get("value", "")[:10]
        )

        start_year = extract_year(
            binding.get("start", {}).get("value")
        )

        end_year = extract_year(
            binding.get("end", {}).get("value")
        )

        player_id = find_existing_player_id(
            player_name,
            birth_date,
        )

        if not player_id:
            player_id = qid_to_negative_id(player_qid)

            if player_id not in players_by_id:
                player_row = {
                    "external_player_id": player_id,
                    "name": player_name,
                    "search_name": normalize(player_name),
                    "country": "Türkiye",
                    "is_active": "false",
                }

                players_rows.append(player_row)
                players_by_id[player_id] = player_row

                normalized_name = normalize(player_name)
                players_by_name[
                    normalized_name
                ].append(player_id)

                if birth_date:
                    players_by_name_birth[
                        (normalized_name, birth_date)
                    ] = player_id

        team_id = find_existing_team_id(team_name)

        if not team_id:
            team_id = qid_to_negative_id(team_qid)

            if team_id not in teams_by_id:
                team_row = {
                    "external_club_id": team_id,
                    "name": team_name,
                    "search_name": normalize(team_name),
                    "country": "",
                }

                teams_rows.append(team_row)
                teams_by_id[team_id] = team_row

                teams_by_exact_name[
                    normalize(team_name)
                ].append(team_id)

                canonical = canonical_team_name(team_name)

                if canonical:
                    teams_by_canonical_name[
                        canonical
                    ].append(team_id)

        add_relation(
            player_id,
            team_id,
            start_year,
            end_year,
        )

        wikidata_rows += 1

    offset += PAGE_SIZE
    time.sleep(2)


print("CSV dosyaları yazılıyor...")

players_rows.sort(
    key=lambda row: int(row["external_player_id"])
)

teams_rows.sort(
    key=lambda row: int(row["external_club_id"])
)

write_rows(
    PLAYERS_FILE,
    [
        "external_player_id",
        "name",
        "search_name",
        "country",
        "is_active",
    ],
    players_rows,
)

write_rows(
    TEAMS_FILE,
    [
        "external_club_id",
        "name",
        "search_name",
        "country",
    ],
    teams_rows,
)

relation_rows = []

for (
    player_id,
    team_id,
), years in relation_years.items():
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

write_rows(
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
print("Wikidata import tamamlandı.")
print(f"Wikidata satırı: {wikidata_rows:,}")
print(
    f"Yeni oyuncu: "
    f"{len(players_by_id) - initial_players:,}"
)
print(
    f"Yeni takım: "
    f"{len(teams_by_id) - initial_teams:,}"
)
print(
    f"Yeni ilişki: "
    f"{len(relation_years) - initial_relations:,}"
)
print("")
print("Toplam:")
print(f"Oyuncular: {len(players_by_id):,}")
print(f"Takımlar: {len(teams_by_id):,}")
print(f"İlişkiler: {len(relation_years):,}")