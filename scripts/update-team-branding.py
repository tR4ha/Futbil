import csv

EXTENDED_TEAMS = "data/extended/team_details/team_details.csv"
OUTPUT = "data/processed/team_branding.csv"

seen = set()

with open(
    EXTENDED_TEAMS,
    encoding="utf-8",
    newline="",
) as source, open(
    OUTPUT,
    "w",
    encoding="utf-8",
    newline="",
) as target:
    reader = csv.DictReader(source)

    writer = csv.DictWriter(
        target,
        fieldnames=[
            "external_club_id",
            "logo_url",
        ],
    )

    writer.writeheader()

    for row in reader:
        club_id = (row.get("club_id") or "").strip()
        logo_url = (row.get("logo_url") or "").strip()

        if not club_id or not logo_url:
            continue

        if club_id in seen:
            continue

        seen.add(club_id)

        writer.writerow({
            "external_club_id": club_id,
            "logo_url": logo_url,
        })

print(f"Generated {OUTPUT}")
print(f"Rows: {len(seen)}")