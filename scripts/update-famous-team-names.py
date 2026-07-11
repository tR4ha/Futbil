import csv
import unicodedata

INPUT = "data/processed/teams_import.csv"
OUTPUT = "data/processed/famous_team_names.csv"


def normalize(text: str) -> str:
    text = text.lower().strip()

    ascii_text = (
        unicodedata.normalize("NFKD", text)
        .encode("ascii", "ignore")
        .decode("ascii")
    )

    return " ".join(ascii_text.split())


# external_club_id: (display_name, aliases)
FAMOUS_TEAMS = {
    "114": ("Beşiktaş", ["besiktas", "bjk"]),
    "36": ("Fenerbahçe", ["fenerbahce", "fb"]),
    "141": ("Galatasaray", ["galatasaray", "gs"]),
    "6890": ("Başakşehir", ["basaksehir", "istanbul basaksehir"]),
    "10484": ("Kasımpaşa", ["kasimpasa"]),

    "131": ("Barcelona", ["barcelona", "barca", "fc barcelona"]),
    "418": ("Real Madrid", ["real madrid", "madrid"]),
    "621": ("Athletic Bilbao", ["athletic bilbao", "bilbao"]),
    "681": ("Real Sociedad", ["real sociedad"]),
    "368": ("Sevilla", ["sevilla"]),
    "150": ("Real Betis", ["real betis", "betis"]),
    "13": ("Atlético Madrid", ["atletico madrid", "atletico"]),

    "11": ("Arsenal", ["arsenal"]),
    "31": ("Liverpool", ["liverpool"]),
    "631": ("Chelsea", ["chelsea"]),
    "148": ("Tottenham", ["tottenham", "spurs"]),
    "281": ("Manchester City", ["manchester city", "man city", "city"]),
    "985": ("Manchester United", ["manchester united", "man united", "man utd"]),
    "762": ("Newcastle United", ["newcastle united", "newcastle"]),
    "931": ("Fulham", ["fulham"]),
    "1237": ("Brighton", ["brighton", "brighton hove albion"]),
    "873": ("Crystal Palace", ["crystal palace", "palace"]),
    "379": ("West Ham", ["west ham", "west ham united"]),
    "989": ("Bournemouth", ["bournemouth"]),
    "703": ("Nottingham Forest", ["nottingham forest", "forest"]),
    "1003": ("Leicester City", ["leicester city", "leicester"]),

    "46": ("Inter", ["inter", "inter milan", "internazionale"]),
    "5": ("AC Milan", ["ac milan", "milan"]),
    "506": ("Juventus", ["juventus", "juve"]),
    "6195": ("Napoli", ["napoli"]),
    "12": ("Roma", ["roma", "as roma"]),
    "398": ("Lazio", ["lazio"]),
    "800": ("Atalanta", ["atalanta"]),
    "430": ("Fiorentina", ["fiorentina"]),

    "27": ("Bayern Münih", ["bayern munich", "bayern munih", "bayern"]),
    "16": ("Borussia Dortmund", ["borussia dortmund", "dortmund", "bvb"]),
    "23826": ("RB Leipzig", ["rb leipzig", "leipzig"]),
    "15": ("Bayer Leverkusen", ["bayer leverkusen", "leverkusen"]),
    "82": ("Wolfsburg", ["wolfsburg"]),
    "79": ("Stuttgart", ["stuttgart"]),

    "583": ("PSG", ["psg", "paris saint germain", "paris"]),
    "244": ("Marseille", ["marseille", "olympique marseille"]),
    "1041": ("Lyon", ["lyon", "olympique lyon"]),
    "162": ("Monaco", ["monaco", "as monaco"]),
    "1082": ("Lille", ["lille"]),

    "336": (
        "Sporting CP",
        ["sporting cp", "sporting lisbon", "sporting lisboa", "sporting portugal"],
    ),
    "720": ("Porto", ["porto", "fc porto"]),
    "294": ("Benfica", ["benfica", "sl benfica", "lisbon benfica"]),
    "2420": ("Vitória Guimarães", ["vitoria guimaraes", "vitoria sc"]),
    "1075": ("Braga", ["braga", "sporting braga"]),

    "610": ("Ajax", ["ajax", "ajax amsterdam"]),
    "234": ("Feyenoord", ["feyenoord", "feyenoord rotterdam"]),
    "383": ("PSV", ["psv", "psv eindhoven"]),

    "496": ("Celtic", ["celtic", "celtic glasgow"]),
    "124": ("Rangers", ["rangers", "glasgow rangers"]),

    "419": ("Shakhtar Donetsk", ["shakhtar", "shakhtar donetsk"]),
    "338": ("Dynamo Kyiv", ["dynamo kyiv", "dynamo kiev"]),

    "343": ("Anderlecht", ["anderlecht"]),
    "58": ("Club Brugge", ["club brugge", "brugge"]),

    "1084": ("Dinamo Zagreb", ["dinamo zagreb"]),
    "212": ("Red Star Belgrade", ["red star belgrade", "crvena zvezda"]),
}


rows = []

with open(INPUT, encoding="utf-8", newline="") as file:
    reader = csv.DictReader(file)

    for row in reader:
        club_id = row["external_club_id"]

        if club_id not in FAMOUS_TEAMS:
            continue

        display_name, aliases = FAMOUS_TEAMS[club_id]

        original_search = row.get("search_name", "")
        all_search_terms = [
            original_search,
            row.get("name", ""),
            display_name,
            *aliases,
        ]

        search_name = normalize(" ".join(all_search_terms))

        rows.append({
            "external_club_id": club_id,
            "display_name": display_name,
            "search_name": search_name,
        })


with open(OUTPUT, "w", encoding="utf-8", newline="") as file:
    writer = csv.DictWriter(
        file,
        fieldnames=[
            "external_club_id",
            "display_name",
            "search_name",
        ],
    )

    writer.writeheader()
    writer.writerows(rows)


print(f"Generated: {OUTPUT}")
print(f"Updated famous teams: {len(rows)}")