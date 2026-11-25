const TEAMS = [
  { name: "Chennai Super Kings", short: "csk", tag: "CSK" },
  { name: "Mumbai Indians", short: "mi", tag: "MI" },
  { name: "Royal Challengers Bengaluru", short: "rcb", tag: "RCB" },
  { name: "Kolkata Knight Riders", short: "kkr", tag: "KKR" },
  { name: "Rajasthan Royals", short: "rr", tag: "RR" },
  { name: "Sunrisers Hyderabad", short: "srh", tag: "SRH" },
  { name: "Delhi Capitals", short: "dc", tag: "DC" },
  { name: "Punjab Kings", short: "pbks", tag: "PBKS" },
  { name: "Gujarat Titans", short: "gt", tag: "GT" },
  { name: "Lucknow Super Giants", short: "lsg", tag: "LSG" }
];

function logoPath(short) {
  return `assets/logos/${short}.png`;
}

function teamToShort(teamName) {
  const found = TEAMS.find(t => t.name === teamName);
  return found ? found.short : "csk";
}

function teamToTag(teamName) {
  const found = TEAMS.find(t => t.name === teamName);
  return found ? found.tag : teamName.split(" ").map(x => x[0]).join("").slice(0, 4);
}

/* -------------------------
   PRO SEARCHABLE DROPDOWN
-------------------------- */

function createTeamDropdown(containerId, defaultTeam = TEAMS[0].name) {
  const container = document.getElementById(containerId);

  container.innerHTML = `
    <div class="dd-selected">
      <img src="${logoPath(teamToShort(defaultTeam))}" />
      <span>${defaultTeam}</span>
    </div>

    <div class="dd-menu">
      <div class="dd-search">
        <input type="text" placeholder="Search team..." />
      </div>
      <div class="dd-items"></div>
    </div>
  `;

  const selected = container.querySelector(".dd-selected");
  const menu = container.querySelector(".dd-menu");
  const searchInput = container.querySelector(".dd-search input");
  const itemsBox = container.querySelector(".dd-items");

  function renderItems(filter = "") {
    itemsBox.innerHTML = "";
    const f = filter.trim().toLowerCase();

    TEAMS
      .filter(t => t.name.toLowerCase().includes(f) || t.tag.toLowerCase().includes(f))
      .forEach(team => {
        const item = document.createElement("div");
        item.className = "dd-item";
        item.innerHTML = `
          <img src="${logoPath(team.short)}" />
          <span>${team.name}</span>
        `;

        item.onclick = () => {
          selected.querySelector("img").src = logoPath(team.short);
          selected.querySelector("span").textContent = team.name;
          container.classList.remove("dd-open");
          searchInput.value = "";
          renderItems("");
          syncVsBanner();
        };

        itemsBox.appendChild(item);
      });
  }

  renderItems("");

  selected.onclick = () => {
    container.classList.toggle("dd-open");
    if (container.classList.contains("dd-open")) {
      setTimeout(() => searchInput.focus(), 50);
    }
  };

  searchInput.addEventListener("input", () => {
    renderItems(searchInput.value);
  });

  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) {
      container.classList.remove("dd-open");
    }
  });
}

function getSelectedTeam(containerId) {
  const container = document.getElementById(containerId);
  return container.querySelector(".dd-selected span").textContent;
}

/* -------------------------
   INIT
-------------------------- */

createTeamDropdown("team1Dropdown", "Chennai Super Kings");
createTeamDropdown("team2Dropdown", "Mumbai Indians");
createTeamDropdown("tossDropdown", "Chennai Super Kings");

syncVsBanner();

/* -------------------------
   VS BANNER SYNC
-------------------------- */

function syncVsBanner() {
  const team1 = getSelectedTeam("team1Dropdown");
  const team2 = getSelectedTeam("team2Dropdown");

  document.getElementById("leftName").textContent = team1;
  document.getElementById("rightName").textContent = team2;

  document.getElementById("leftLogo").src = logoPath(teamToShort(team1));
  document.getElementById("rightLogo").src = logoPath(teamToShort(team2));

  // probability logos too
  document.getElementById("probLeftLogo").src = logoPath(teamToShort(team1));
  document.getElementById("probRightLogo").src = logoPath(teamToShort(team2));

  document.getElementById("probLeftName").textContent = teamToTag(team1);
  document.getElementById("probRightName").textContent = teamToTag(team2);
}

function swapTeams() {
  const team1 = getSelectedTeam("team1Dropdown");
  const team2 = getSelectedTeam("team2Dropdown");

  setDropdownValue("team1Dropdown", team2);
  setDropdownValue("team2Dropdown", team1);

  syncVsBanner();
}

function setDropdownValue(containerId, teamName) {
  const container = document.getElementById(containerId);
  container.querySelector(".dd-selected span").textContent = teamName;
  container.querySelector(".dd-selected img").src = logoPath(teamToShort(teamName));
}

/* -------------------------
   PREDICTION
-------------------------- */

async function predictWinner() {
  const team1 = getSelectedTeam("team1Dropdown");
  const team2 = getSelectedTeam("team2Dropdown");
  const toss_winner = getSelectedTeam("tossDropdown");

  const venue = document.getElementById("venue").value;
  const toss_decision = document.getElementById("toss_decision").value;

  if (!venue) {
    alert("Please select a venue.");
    return;
  }

  if (team1 === team2) {
    alert("Both teams can't be the same.");
    return;
  }

  if (toss_winner !== team1 && toss_winner !== team2) {
    alert("Toss winner must be one of the two playing teams.");
    return;
  }

  syncVsBanner();

  const box = document.getElementById("predictionBox");
  const probBox = document.getElementById("probBox");

  box.innerHTML = `<p>Thinking... crunching numbers like a cricket scientist 🧪🏏</p>`;
  probBox.classList.add("hidden");

  try {
    const res = await fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team1, team2, venue, toss_winner, toss_decision })
    });

    const data = await res.json();

    if (!res.ok) {
      box.innerHTML = `<p>${data.error || "Prediction failed."}</p>`;
      return;
    }

    const winner = data.predicted_winner;
    const winnerShort = teamToShort(winner);
    const team1Prob = data.team1_prob;
    const team2Prob = data.team2_prob;

    box.innerHTML = `
      <div class="winnerRow">
        <img src="${logoPath(winnerShort)}" />
        <div>
          <h3>🏆 Predicted Winner: ${winner}</h3>
          <p>Confidence: <b>${data.confidence}%</b></p>
          <p style="opacity:0.72;margin-top:8px;">
            ML Model: XGBoost (trained on IPL historical matches)
          </p>
        </div>
      </div>
    `;

    document.getElementById("leftProb").textContent = `${team1Prob.toFixed(0)}%`;
    document.getElementById("rightProb").textContent = `${team2Prob.toFixed(0)}%`;
    document.getElementById("probFill").style.width = `${team1Prob}%`;
    probBox.classList.remove("hidden");

  } catch (err) {
    box.innerHTML = `<p>Prediction failed 😭 Could not reach the server. Try again.</p>`;
  }
}

/* -------------------------
   LIVE SCORE
-------------------------- */

async function loadLiveScore() {
  const liveBox = document.getElementById("liveScore");
  liveBox.innerHTML = "Fetching live matches... 🛰️";

  try {
    const res = await fetch("/api/live-score");
    const data = await res.json();

    if (data && data.error) {
      liveBox.innerHTML = data.error;
      return;
    }

    if (!data || !data.data) {
      liveBox.innerHTML = "No live matches found 😔";
      return;
    }

    const matches = data.data.slice(0, 6);

    liveBox.innerHTML = matches.map(m => `
      <div style="padding:12px;border-bottom:1px solid rgba(255,255,255,0.08)">
        <b style="font-size:1rem">${m.name || "Match"}</b><br/>
        <span style="opacity:0.85">Status:</span> ${m.status || "N/A"}<br/>
        ${m.venue ? `<span style="opacity:0.85">Venue:</span> ${m.venue}` : ""}
      </div>
    `).join("");

  } catch (err) {
    liveBox.innerHTML = "Live score failed 😭 Check backend + CricAPI key.";
  }
}

async function loadVenues() {
  const venueSelect = document.getElementById("venue");
  try {
    const res = await fetch("/api/venues");
    if (!res.ok) throw new Error("bad response");
    const data = await res.json();

    venueSelect.innerHTML = "";
    data.venues.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      venueSelect.appendChild(opt);
    });

    const preferred = data.venues.find(v => v === "Wankhede Stadium");
    if (preferred) venueSelect.value = preferred;
  } catch (err) {
    venueSelect.innerHTML = '<option value="">Could not load venues</option>';
  }
}

loadVenues();
