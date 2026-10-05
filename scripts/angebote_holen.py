name: Wochenangebote holen

on:
  schedule:
    - cron: "17 3 * * 1"   # Montags 03:17 UTC (= 05:17 Sommerzeit / 04:17 Winterzeit)
    - cron: "17 3 * * 4"   # Donnerstags nochmal, damit der neue Kaufland-Prospekt drin ist
  workflow_dispatch:        # Manuell starten: Reiter "Actions" -> "Run workflow"

permissions:
  contents: write

jobs:
  angebote:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install requests
      - run: python scripts/angebote_holen.py
      - name: Commit, falls sich etwas geändert hat
        run: |
          git config user.name "angebote-bot"
          git config user.email "actions@users.noreply.github.com"
          git add data/angebote.json
          if git diff --cached --quiet; then
            echo "Keine Änderungen"
          else
            git commit -m "Angebote KW $(TZ=Europe/Berlin date +%V)"
            git push
          fi

