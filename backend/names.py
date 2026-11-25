"""Shared name normalisation used by both training and the API."""

TEAM_ALIASES = {
    "Royal Challengers Bangalore": "Royal Challengers Bengaluru",
    "Kings XI Punjab": "Punjab Kings",
    "Delhi Daredevils": "Delhi Capitals",
    "Rising Pune Supergiants": "Rising Pune Supergiant",
}

VENUE_ALIASES = {
    "M.Chinnaswamy Stadium": "M Chinnaswamy Stadium",
    "Feroz Shah Kotla": "Arun Jaitley Stadium",
    "Punjab Cricket Association Stadium": "Punjab Cricket Association IS Bindra Stadium",
    "Sardar Patel Stadium": "Narendra Modi Stadium",
    "Sheikh Zayed Stadium": "Zayed Cricket Stadium",
}


def norm_team(name: str) -> str:
    name = str(name).strip()
    return TEAM_ALIASES.get(name, name)


def norm_venue(name: str) -> str:
    # "Wankhede Stadium, Mumbai" -> "Wankhede Stadium"
    name = str(name).split(",")[0].strip()
    return VENUE_ALIASES.get(name, name)
