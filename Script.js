// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBmrxwZ4F7E3Xfa_gi0tfiS7JH3NqxgjXY",
  authDomain: "dragon-hunt-html.firebaseapp.com",
  databaseURL: "https://dragon-hunt-html-default-rtdb.firebaseio.com",
  projectId: "dragon-hunt-html",
  storageBucket: "dragon-hunt-html.firebasestorage.app",
  messagingSenderId: "724852876791",
  appId: "1:724852876791:web:ce453714f44472bad27af2",
  measurementId: "G-9ESB16Y3M0"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const database = firebase.database();

// --- DATA STRUCTURES ---
const ADJACENCY = {
    1: [2, 4, 5], 2: [1, 3, 4, 5, 6], 3: [2, 5, 6], 4: [1, 2, 5, 7, 8],
    5: [1, 2, 3, 4, 6, 7, 8, 9], 6: [2, 3, 5, 8, 9], 7: [4, 5, 8],
    8: [4, 5, 6, 7, 9], 9: [5, 6, 8], 0: [1, 2, 3, 4, 5, 6, 7, 8, 9] 
};

const RELIC_LOCATIONS = {
    'binoculars': [1], 'orangeAmulet': [2], 'sailboat': [2, 9], 'binocularsRocky': [3],
    'wizardstaff': [3, 7], 'greenDragonAmulet': [5], 'waterBucket': [6], 'hazmatSuit': [6, 7], 
    'greatSword': [6], 'dragonStaff': [6], 'weatherStaff': [6, 9], 'blueDragonAmulet': [7],
    'ancientStaff': [7], 'icePack': [8, 10], 'spyglass': [9], 'redDragonAmulet': [10]
};

// --- GLOBAL HELPER FUNCTION ---
function formatRelicName(relicKey) {
    const relicNameMap = {
        'binoculars': 'Binoculars (Snowy)', 'orangeAmulet': 'Orange Dragon Amulet',
        'sailboat': 'Sailboat', 'binocularsRocky': 'Binoculars (Rocky)',
        'greenDragonAmulet': 'Green Dragon Amulet', 'waterBucket': 'Water Bucket',
        'hazmatSuit': 'Hazmat Suit', 'greatSword': 'The Great Sword',
        'dragonStaff': 'Single-Use Dragon Staff', 'weatherStaff': 'Weather Staff',
        'blueDragonAmulet': 'Blue Dragon Amulet', 'ancientStaff': 'Ancient Staff',
        'icePack': 'Ice Pack', 'spyglass': 'Spyglass',
        'redDragonAmulet': 'Red Dragon Amulet', 'wizardstaff': "Wizard's Staff",
        'bluestar': 'Blue Star'
    };
    const defaultName = relicKey.replace(/([A-Z])/g, ' $1');
    const capitalizedName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
    return relicNameMap[relicKey] || capitalizedName;
}

// --- GLOBAL VARIABLES ---
let pastselectedisland = 0;
let isVolcanoErupted = false; 
let playerPermissions = {}; 
let myPlayerData = {}; 
let islandStatus = {}; 
let currentRound = 1;
let uninhabitableIslands = {}; 
let redDragonIsland = 0; 

// --- DISPLAY ISLAND INFO ---
function displayisleinfo(selected) {
    let isledecriptionboxjs = document.getElementById("isledescriptionbox"); 
    if (!isledecriptionboxjs) { return; }

    const urlParams = new URLSearchParams(window.location.search);
    const myColor = urlParams.get('player') || 'blue';

    let islandId = selected;
    let islandDescription = "";
    
    if (selected === redDragonIsland) {
        islandDescription = "DANGER: The Red Dragon is here! The island is scorched and temporarily uninhabitable.";
    } else if (uninhabitableIslands[selected]) {
        islandDescription = "WARNING: This island has been corrupted by the Black Dragon. It is uninhabitable.";
    } else if (selected === 8) {
        if (isVolcanoErupted) {
            islandId = 10; 
            islandDescription = "ERUPTED VOLCANO: The volcano has erupted! The island is now a barren wasteland of ash and magma.";
        } else {
            islandDescription = "A desolate wasteland ravaged by battles gone. Max stay: 1 turn.";
        }
    } else {
        const descriptions = {
            1: "Snowy Island. Low visibility. Max stay: 2 turns.",
            2: "Dragon Island. Northernmost island. Many dragons.",
            3: "Rocky Island. Many caves.",
            4: "Teensy Weensy Island. Small, but strategic.",
            5: "Traditional Island. Central hub.",
            6: "Treasure Island. Requires Star from the Heavens.",
            7: "Tornado Island. Uninhabitable. Requires Hazmat Suit.",
            9: "Swamp Island. Muddy and murky."
        };
        islandDescription = descriptions[selected] || "Unknown Island";
    }
    
    isledecriptionboxjs.innerHTML = islandDescription;

    if (pastselectedisland === selected) {
        if (!islandStatus[selected]) {
            alert("Game data is loading. Please wait...");
            return;
        }
        const status = islandStatus[selected];
        if (!status.allowed) {
            alert(status.reason || "You cannot travel here.");
            return;
        }

        if (confirm("Do you want to travel to the selected island?")) {
            const baseUrl = `https://glowing-acorn-jjw4r5jg6rr6394p-3000.app.github.dev/Dragon-Hunt-HTML/Island ${islandId}/Index.html`;
            if (islandId === 6) {
                 database.ref(`players/${myColor}/relics/starFromHeavens`).remove();
            }
            window.location.href = `${baseUrl}?player=${myColor}`;
        }
    } else {
        pastselectedisland = selected;
    }
}
window.displayisleinfo = displayisleinfo;

// --- PAGE LOAD LOGIC ---
document.addEventListener('DOMContentLoaded', () => { 
    const urlParams = new URLSearchParams(window.location.search);
    const playerParam = urlParams.get('player') || 'blue'; 

    database.ref('game_state/current_round').on('value', (snapshot) => {
        currentRound = parseInt(snapshot.val()) || 1;
        const pDisp = document.getElementById('player-round-display');
        const aDisp = document.getElementById('admin-round-display');
        if(pDisp) pDisp.innerText = `Round: ${currentRound}`;
        if(aDisp) aDisp.innerText = `Round: ${currentRound}`;
        if (myPlayerData && myPlayerData.relics) updateWeatherPanel(myPlayerData);
    });

    database.ref('game_state/uninhabitable_islands').on('value', (snapshot) => {
        uninhabitableIslands = snapshot.val() || {};
        if (myPlayerData.color) refreshIslandMap(myPlayerData.color);
    });
    
    database.ref('dragons/red/island').on('value', (snapshot) => {
        redDragonIsland = parseInt(snapshot.val()) || 0;
        if (myPlayerData.color) refreshIslandMap(myPlayerData.color);
    });

    if (playerParam === 'dragon') {
        document.title = "ADMIN DASHBOARD";
        document.getElementById('dragon-dashboard').style.display = 'block';
        runDragonDashboard();
    } else {
        document.getElementById('isle-selection-page').style.display = 'block';
        runIsleSelectionPage(playerParam);
    }
});

// ===================================================================
// --- ADMIN LOGGING SYSTEM (FIXED) ---
// ===================================================================
function enableHistoryLogging() {
    // Listens to every player's amulet selection and saves it to the log
    database.ref('players').once('value', snapshot => {
        if (!snapshot.exists()) return;
        
        Object.keys(snapshot.val()).forEach(colorId => {
            const selectionRef = database.ref(`players/${colorId}/amuletSelection`);
            
            selectionRef.on('value', snap => {
                const currentSelection = snap.val();
                if (!currentSelection) return;

                // FIX: Force Round Number if missing from the signal
                if (!currentSelection.round) {
                    currentSelection.round = currentRound;
                }

                const logRef = database.ref(`players/${colorId}/amuletLog`);
                
                // Deduplication: Only add if it's different from the last entry
                logRef.limitToLast(1).once('value', logSnap => {
                    let lastEntry = null;
                    logSnap.forEach(child => { lastEntry = child.val(); });

                    const isNew = !lastEntry || 
                                  lastEntry.round !== currentSelection.round ||
                                  lastEntry.island !== currentSelection.island ||
                                  lastEntry.dragon !== currentSelection.dragon;

                    if (isNew) {
                        logRef.push(currentSelection);
                    }
                });
            });
        });
    });
}

// ===================================================================
// --- NORMAL PLAYER LOGIC ---
// ===================================================================
function runIsleSelectionPage(myColor) {
    const playerColorDisplay = document.getElementById('player-color-display');
    if (playerColorDisplay) {
        playerColorDisplay.textContent = myColor;
        playerColorDisplay.style.color = myColor;
    }

    const myPlayerRef = database.ref(`players/${myColor}`);
    
    database.ref('game_state/volcano_erupted').on('value', (snapshot) => {
        isVolcanoErupted = snapshot.val() === true;
        refreshIslandMap(myColor); 
    });

    database.ref('permissions').on('value', (snapshot) => {
        playerPermissions = snapshot.val() || {};
        refreshIslandMap(myColor); 
    });

    myPlayerRef.on('value', (snapshot) => {
        myPlayerData = snapshot.val() || {};
        myPlayerData.color = myColor; 
        
        if (myPlayerData.island && myPlayerData.island !== 0) {
            updateHistoryAndResetLocation(myColor, myPlayerData.island, myPlayerData.history);
        } else {
            refreshIslandMap(myColor);
            updateRelicList(myPlayerData.relics); 
            updateWeatherPanel(myPlayerData); 
            updateAmuletAndBinoculars(myPlayerData, myColor); 
        }
    });
    
    database.ref(`players/${myColor}/health`).on('value', snapshot => {
        const disp = document.getElementById('player-health-display');
        if (disp) disp.innerText = `Health: ${snapshot.val() || 'Not set'}`;
    });
}

function updateAmuletAndBinoculars(data, myColor) {
    const relics = data.relics || {};
    const binocularDisplay = document.getElementById('binocular-display');
    const amuletBox = document.getElementById('amulet-control-box');
    const amuletTitle = document.getElementById('amulet-title'); 
    const amuletSubmitBtn = document.getElementById('amulet-submit-btn'); 
    const amuletSelect = document.getElementById('amulet-island-select'); 
    const amuletDragonSelect = document.getElementById('amulet-dragon-select'); 
    const dragonSelectContainer = document.getElementById('dragon-select-container');

    let hasVision = (relics.binoculars || relics.binocularsRocky || relics.spyglass);
    if (hasVision) {
        binocularDisplay.style.display = 'block';
        database.ref('players').once('value').then(snapshot => {
            const allPlayers = snapshot.val() || {};
            let trackerHTML = "<h4>Binocular View</h4>";
            for (const colorId in allPlayers) {
                if (colorId === myColor) continue;
                const p = allPlayers[colorId];
                const islandNum = p.island || "??";
                trackerHTML += `<div class="tracker-item"><span style="color:${colorId}; font-weight:bold;">${colorId}</span>: Isle ${islandNum}</div>`;
            }
            binocularDisplay.innerHTML = trackerHTML;
        });
    } else {
        binocularDisplay.style.display = 'none';
    }

    if (amuletBox) {
        const ownedItems = [];
        if (relics.greenDragonAmulet) ownedItems.push("Green");
        if (relics.redDragonAmulet) ownedItems.push("Red");
        if (relics.blueDragonAmulet) ownedItems.push("Blue");
        if (relics.orangeAmulet) ownedItems.push("Orange");
        if (relics.wizardstaff) ownedItems.push("Wizard's Staff");

        if (ownedItems.length > 0) {
            amuletBox.style.display = 'block';
            
            amuletDragonSelect.innerHTML = "";
            ownedItems.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item; 
                opt.textContent = item.includes("Staff") ? item : item + " Dragon";
                amuletDragonSelect.appendChild(opt);
            });

            if (ownedItems.length > 1) {
                amuletTitle.innerText = "Command Entity";
                dragonSelectContainer.style.display = 'block';
            } else {
                const singleItem = ownedItems[0];
                amuletTitle.innerText = singleItem.includes("Staff") ? singleItem : `${singleItem} Dragon`;
                dragonSelectContainer.style.display = 'none';
            }
            amuletSubmitBtn.setAttribute('data-entity', ownedItems[0]);
        } else {
            amuletBox.style.display = 'none';
        }
    }

    if (amuletDragonSelect) {
        amuletDragonSelect.onchange = () => {
             amuletSubmitBtn.setAttribute('data-entity', amuletDragonSelect.value);
        };
    }

    if (amuletSubmitBtn) {
        const newBtn = amuletSubmitBtn.cloneNode(true);
        amuletSubmitBtn.parentNode.replaceChild(newBtn, amuletSubmitBtn);
        
        newBtn.addEventListener('click', () => {
            const selectedIsland = parseInt(amuletSelect.value, 10);
            let activeEntity = newBtn.getAttribute('data-entity');
            
            if (!activeEntity && amuletDragonSelect.options.length > 0) {
                 activeEntity = amuletDragonSelect.value;
            }
            
            if (activeEntity) {
                // SAVE DIRECTLY, Logger will pick it up
                database.ref(`players/${myColor}/amuletSelection`).set({
                    dragon: activeEntity,
                    island: selectedIsland,
                    round: currentRound
                }).then(() => {
                    const label = activeEntity.includes("Staff") ? activeEntity : `${activeEntity} Dragon`;
                    alert(`${label} target set to Island ${selectedIsland}!`);
                });
            }
        });
    }
}

function updateWeatherPanel(data) {
    const panel = document.getElementById('weather-control-panel');
    const msg = document.getElementById('weather-cooldown-msg');
    const allowBtn = document.getElementById('weather-allow-btn');
    const forbidBtn = document.getElementById('weather-forbid-btn');
    const islandSelect = document.getElementById('weather-island-select');

    if (data.relics && data.relics.weatherStaff) {
        panel.style.display = 'block';
        
        const lastUsed = parseInt(data.weatherStaffLastUsedRound) || 0;
        const cur = parseInt(currentRound) || 1;
        const roundsDiff = cur - lastUsed;

        if (roundsDiff >= 5) {
            msg.innerHTML = `Ready to use! <br><span style='font-size:0.8rem; color:#888;'>(Current: ${cur}, Last: ${lastUsed})</span>`;
            msg.style.color = "lime";
            allowBtn.disabled = false;
            forbidBtn.disabled = false;
        } else {
            const remaining = 5 - roundsDiff;
            msg.innerHTML = `Cooling down... <strong>${remaining}</strong> turn(s) remaining. <br><span style='font-size:0.8rem; color:#888;'>(Current: ${cur}, Last: ${lastUsed})</span>`;
            msg.style.color = "orange";
            allowBtn.disabled = true;
            forbidBtn.disabled = true;
        }

        const newAllow = allowBtn.cloneNode(true);
        const newForbid = forbidBtn.cloneNode(true);
        allowBtn.parentNode.replaceChild(newAllow, allowBtn);
        forbidBtn.parentNode.replaceChild(newForbid, forbidBtn);

        const performWeatherAction = (isForbid) => {
            const islandId = islandSelect.value;
            const updates = {};
            updates[`players/${new URLSearchParams(window.location.search).get('player')}/weatherStaffLastUsedRound`] = currentRound;

            database.ref('players').once('value').then(snap => {
                if(snap.exists()) {
                    const players = snap.val();
                    Object.keys(players).forEach(pid => {
                        updates[`permissions/${pid}/${islandId}`] = isForbid ? false : true;
                    });
                    database.ref().update(updates).then(() => {
                        alert(isForbid ? `Storm summoned on Island ${islandId}!` : `Skies cleared on Island ${islandId}!`);
                    });
                }
            });
        };
        newAllow.addEventListener('click', () => performWeatherAction(false));
        newForbid.addEventListener('click', () => performWeatherAction(true));
    } else {
        panel.style.display = 'none';
    }
}

function updateHistoryAndResetLocation(color, cameFromIsland, oldHistory) {
    let newHistory = oldHistory || { lastIsland: 0, consecutiveTurns: 0 };
    if (newHistory.lastIsland === cameFromIsland) {
        newHistory.consecutiveTurns++;
    } else {
        newHistory.lastIsland = cameFromIsland;
        newHistory.consecutiveTurns = 1;
    }
    database.ref(`players/${color}`).update({ history: newHistory, island: 0 });
}

function checkIslandRules(targetIsland, data) {
    const relics = data.relics || {};
    const history = data.history || { lastIsland: 0, consecutiveTurns: 0 };
    const lastIsland = history.lastIsland || 0; 
    const consecutive = history.consecutiveTurns || 0;

    if (playerPermissions[data.color] && playerPermissions[data.color][targetIsland] === true) return { allowed: true };
    if (playerPermissions[data.color] && playerPermissions[data.color][targetIsland] === false) return { allowed: false, reason: "Admin has forbidden travel here." };
    
    if (uninhabitableIslands[targetIsland] && !relics.hazmatSuit) {
        return { allowed: false, reason: "This island has been corrupted by the Black Dragon. You need a Hazmat Suit." };
    }
    if (targetIsland === redDragonIsland && !relics.hazmatSuit) {
        return { allowed: false, reason: "The Red Dragon has scorched this island! It is currently uninhabitable." };
    }
    
    if (targetIsland === lastIsland && consecutive >= 3 && !relics.waterBucket) return { allowed: false, reason: "You cannot stay on an island for more than 3 turns without a Water Bucket." };
    if (targetIsland === 6 && !relics.starFromHeavens) return { allowed: false, reason: "You can't currently go to this island without some form of protection from the natural forces." };
    if (targetIsland === 8 && targetIsland === lastIsland && consecutive >= 1) return { allowed: false, reason: "Volcano Island is too dangerous to stay more than 1 turn." };
    if (targetIsland === 1 && targetIsland === lastIsland && consecutive >= 2) return { allowed: false, reason: "It is too cold to stay on Snowy Island for more than 2 turns." };
    
    if (lastIsland !== 0 && targetIsland !== lastIsland && !relics.sailboat) {
        const neighbors = ADJACENCY[lastIsland] || [];
        if (!neighbors.includes(targetIsland)) return { allowed: false, reason: `You can only travel to adjacent islands from Island ${lastIsland}. (Unless you have a Sailboat)` };
    }
    
    if (targetIsland === 7 && !relics.hazmatSuit) return { allowed: false, reason: "You can't currently go to this island without some form of protection from the natural forces." };
    if (targetIsland === 8 && isVolcanoErupted && !relics.hazmatSuit) return { allowed: false, reason: "You can't currently go to this island without some form of protection from the natural forces." };

    return { allowed: true };
}

function refreshIslandMap(myColor) {
    const container = document.getElementById('island-container');
    if (!container) return;
    const checkData = { ...myPlayerData, color: myColor || new URLSearchParams(window.location.search).get('player') };

    for (let i = 1; i <= 9; i++) {
        const btn = document.getElementById(`island${i}`);
        if (!btn) continue;
        const status = checkIslandRules(i, checkData);
        islandStatus[i] = status;
        btn.classList.remove('island-allowed', 'island-forbidden');
        if (status.allowed) btn.classList.add('island-allowed');
        else btn.classList.add('island-forbidden');
    }
}

function updateRelicList(relics) {
    const list = document.getElementById('relic-list');
    if (!list) return;
    list.innerHTML = '';
    let hasRelics = false;
    if (relics) {
        Object.keys(relics).forEach(k => {
            if (relics[k]) {
                hasRelics = true;
                const li = document.createElement('li');
                li.textContent = formatRelicName(k);
                list.appendChild(li);
            }
        });
    }
    if (!hasRelics) list.innerHTML = '<li class="no-relics">None yet</li>';
}

const dragonOdds = {
    green: { chance: 80, islands: { 2: 20, 3: 15, 4: 20, 5: 35, 9: 10 } },
    red: { chance: 60, islands: { 2: 10, 3: 15, 4: 20, 5: 20, 8: 45 } },
    blue: { chance: 35, islands: { 2: 10, 3: 10, 4: 10, 5: 20, 7: 30, 8: 5 } },
    black: { chance: 15, islands: { 1: 20, 2: 10, 3: 15, 4: 10, 5: 10, 7: 10, 8: 10, 9: 15 } },
    white: { chance: 30, islands: { 1: 45, 2: 15, 4: 15, 5: 15, 9: 15 } },
    yellow: { chance: 60, islands: { 2: 30, 3: 15, 4: 25, 5: 5, 8: 15, 9: 10 } },
    orange: { chance: 55, islands: { 2: 40, 3: 20, 4: 10, 7: 20, 8: 10 } }
};
const dragonList = Object.keys(dragonOdds);

function runDragonDashboard() {
    const playerContainer = document.getElementById('player-list-container');
    const dragonContainer = document.getElementById('dragon-list-container');
    const playerSelect = document.getElementById('perm-player-select');

    addPlayerDashboardEventListeners();
    addGlobalControlEventsListeners();
    
    // ENABLE HISTORY LOGGING
    enableHistoryLogging();

    database.ref('players').on('value', (snapshot) => {
        const allPlayersData = snapshot.val() || {};
        playerContainer.innerHTML = ''; 
        playerSelect.innerHTML = ''; 
        const sortedColors = Object.keys(allPlayersData).sort();
        sortedColors.forEach(color => {
            playerContainer.appendChild(createPlayerCard(color, allPlayersData[color]));
            const option = document.createElement('option');
            option.value = color;
            option.textContent = color.charAt(0).toUpperCase() + color.slice(1);
            playerSelect.appendChild(option);
        });
    });

    database.ref('dragons').on('value', (snapshot) => {
        const allDragonsData = snapshot.val() || {};
        dragonContainer.innerHTML = '';
        for (const color of dragonList) {
            dragonContainer.appendChild(createDragonCard(color, allDragonsData[color] || {}));
        }
    });
}

function createPlayerCard(color, data) {
    const card = document.createElement('div');
    card.className = 'player-card';

    let locationString = 'Offline';
    if (data.position && data.island) {
        const hidingStatus = data.position.isHiding === true ? " <span class='hiding-status'>(Hiding)</span>" : "";
        locationString = `Island ${data.island} (${data.position.x}, ${data.position.y})${hidingStatus}`;
    } else if (data.island) {
        locationString = `Offline (Last on Island ${data.island})`;
    } else if (data.relics || data.health) {
        locationString = 'On Isle Selection';
    }

    const health = data.health || 0;
    
    let amuletTarget = "None";
    if (data.amuletSelection) {
        if (typeof data.amuletSelection === 'object') {
            const dragonName = data.amuletSelection.dragon;
            const displayName = dragonName.includes("Staff") ? dragonName : `${dragonName} Dragon`;
            const styleColor = dragonName.includes("Staff") ? "black" : dragonName.toLowerCase();
            const roundInfo = data.amuletSelection.round ? `(Rnd ${data.amuletSelection.round})` : "";
            amuletTarget = `<strong style="color:${styleColor}">${displayName}</strong> -> Island ${data.amuletSelection.island} <span style="font-size:0.8em">${roundInfo}</span>`;
        } else {
            amuletTarget = `Island ${data.amuletSelection}`;
        }
    }

    // --- HISTORY LOG DISPLAY ---
    let logHTML = '<div class="amulet-log-container"><strong>History:</strong>';
    if (data.amuletLog) {
        Object.values(data.amuletLog).reverse().forEach(entry => {
            const r = entry.round || "?";
            const d = entry.dragon.includes("Staff") ? entry.dragon : `${entry.dragon}`;
            logHTML += `<div class="log-entry">[Rnd ${r}] <strong>${d}</strong> &rarr; Isle ${entry.island}</div>`;
        });
    } else {
        logHTML += '<div class="log-entry">No history.</div>';
    }
    logHTML += '</div>';

    let relicHTML = '';
    if (data.relics) {
        Object.keys(data.relics).forEach(relicKey => {
            if (data.relics[relicKey] === true) {
                relicHTML += `<li><span>${formatRelicName(relicKey)}</span><button class="revoke-btn" data-player="${color}" data-relic="${relicKey}">Revoke</button></li>`;
            }
        });
    }
    if (relicHTML === '') relicHTML = '<li class="no-relics" style="border:none; background:none;">None</li>';

    const headerColor = (color.toLowerCase() === 'white' || color.toLowerCase() === 'yellow' || color.toLowerCase() === 'aqua' || color.toLowerCase() === 'lime') ? '#333' : '#fff';

    card.innerHTML = `
        <div class="player-card-header" style="background-color: ${color}; color: ${headerColor};">
            <h3>${color}</h3>
        </div>
        <div class="player-card-body">
            <p><strong>Location:</strong> ${locationString}</p>
            <p><strong>Health:</strong> ${health}</p>
            <p><strong>Amulet Target:</strong> ${amuletTarget}</p>
            ${logHTML}
            <h4>Relics</h4>
            <ul class="relic-list">${relicHTML}</ul>
            <div class="admin-form">
                <div>
                    <input type="number" id="input-health-${color}" placeholder="Set Health" value="${health}">
                    <button class="health-btn" data-player="${color}">Set</button>
                </div>
                <div style="margin-top: 10px;">
                    <input type="text" id="input-relic-${color}" placeholder="relicName">
                    <button class="add-relic-btn" data-player="${color}">Add</button>
                </div>
            </div>
        </div>
    `;
    return card;
}

// --- SERVER-SIDE LOGGING FUNCTION ---
function enableHistoryLogging() {
    database.ref('players').once('value', snapshot => {
        if (!snapshot.exists()) return;
        
        Object.keys(snapshot.val()).forEach(colorId => {
            const selectionRef = database.ref(`players/${colorId}/amuletSelection`);
            
            selectionRef.on('value', snap => {
                const currentSelection = snap.val();
                if (!currentSelection) return;

                // FIX: Inject round if missing
                if (!currentSelection.round) currentSelection.round = currentRound;

                const logRef = database.ref(`players/${colorId}/amuletLog`);
                
                logRef.limitToLast(1).once('value', logSnap => {
                    let lastEntry = null;
                    logSnap.forEach(child => { lastEntry = child.val(); });

                    const isNew = !lastEntry || 
                                  lastEntry.round !== currentSelection.round ||
                                  lastEntry.island !== currentSelection.island ||
                                  lastEntry.dragon !== currentSelection.dragon;

                    if (isNew) {
                        logRef.push(currentSelection);
                    }
                });
            });
        });
    });
}

function createDragonCard(color, data) {
    const card = document.createElement('div');
    card.className = 'dragon-card';
    card.style.borderColor = color;
    const currentIsland = data.island || 0;
    const locationString = currentIsland === 0 ? "Not on map" : `Island ${currentIsland}`;
    card.innerHTML = `
        <h4 style="color: ${color};">${color} Dragon</h4>
        <p><strong>Current Location:</strong> <span class="dragon-location">${locationString}</span></p>
        <label for="input-island-${color}">Set New Target:</label>
        <input type="number" id="input-island-${color}" class="dragon-island-input" data-dragon="${color}" value="${currentIsland}" min="0">
    `;
    return card;
}

function addPlayerDashboardEventListeners() {
    const container = document.getElementById('player-list-container');
    container.addEventListener('click', function(event) {
        const target = event.target;
        const player = target.dataset.player;
        if (!player) return;

        if (target.classList.contains('health-btn')) {
            const healthInput = document.getElementById(`input-health-${player}`);
            const newHealth = parseInt(healthInput.value, 10);
            if (!isNaN(newHealth)) database.ref(`players/${player}/health`).set(newHealth);
        }
        if (target.classList.contains('add-relic-btn')) {
            const relicInput = document.getElementById(`input-relic-${player}`);
            const relicName = relicInput.value.trim().replace(/\s(.)/g, (m, g1) => g1.toUpperCase());
            if (relicName) {
                database.ref(`players/${player}/relics/${relicName}`).set(true);
                relicInput.value = '';
            }
        }
        if (target.classList.contains('revoke-btn')) {
            const relicName = target.dataset.relic;
            if (relicName && confirm(`Remove "${relicName}" from ${player}?`)) {
                database.ref(`players/${player}/relics/${relicName}`).remove();
                const islandIds = RELIC_LOCATIONS[relicName]; 
                if (islandIds) {
                    islandIds.forEach(id => {
                        database.ref(`islands/${id}/relics_taken/${relicName}`).remove();
                    });
                }
            }
        }
    });
}

function addGlobalControlEventsListeners() {
    const randomizeBtn = document.getElementById('randomize-dragons-btn');
    const commitBtn = document.getElementById('commit-dragons-btn');
    
    randomizeBtn.addEventListener('click', () => {
        dragonList.forEach(color => {
            const newIsland = calculateRandomIsland(color);
            const inputField = document.getElementById(`input-island-${color}`);
            if (inputField) inputField.value = newIsland;
        });
    });

    commitBtn.addEventListener('click', () => {
        if (!confirm("Commit all dragon locations to the database?")) return;
        const inputs = document.querySelectorAll('.dragon-island-input');
        const updates = {}; 
        let blackIsland = 0, whiteIsland = 0, redIsland = 0;
        
        inputs.forEach(input => {
            const val = parseInt(input.value, 10) || 0;
            const dragon = input.dataset.dragon;
            updates[`dragons/${dragon}/island`] = val;
            updates[`dragons/${dragon}/lastUpdated`] = Date.now();

            if (dragon === 'black') blackIsland = val;
            if (dragon === 'white') whiteIsland = val;
            if (dragon === 'red') redIsland = val;
        });
        
        if (blackIsland > 0) updates[`game_state/uninhabitable_islands/${blackIsland}`] = true;
        if (whiteIsland > 0) updates[`game_state/uninhabitable_islands/${whiteIsland}`] = null;
        
        database.ref().update(updates).then(() => alert("Dragon locations updated!"));
    });

    const teleportBtn = document.getElementById('force-teleport-btn');
    const teleportUrl = document.getElementById('force-teleport-url');
    const volcanoBtn = document.getElementById('toggle-volcano-btn');
    const volcanoStatus = document.getElementById('volcano-status-display');
    const volcanoRef = database.ref('game_state/volcano_erupted');
    const healIceBtn = document.getElementById('heal-icepack-btn'); 

    teleportBtn.addEventListener('click', () => {
        const url = teleportUrl.value.trim();
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            if (confirm(`Force ALL players to teleport to:\n${url}?\n\nNOTE: This increments the Round Number.`)) {
                
                database.ref('players').get().then((snapshot) => {
                    const updates = {};
                    updates['game_state/force_teleport_url'] = {
                        url: url,
                        timestamp: Date.now()
                    };
                    const nextRound = (currentRound || 1) + 1;
                    updates['game_state/current_round'] = nextRound;
                    updates['permissions'] = null;

                    if (snapshot.exists()) {
                        const allPlayers = snapshot.val();
                        for (const colorId in allPlayers) {
                            updates[`players/${colorId}/amuletSelection`] = null;
                        }
                    }
                    database.ref().update(updates)
                        .then(() => alert(`Teleport sent! Starting Round ${nextRound}.`))
                        .catch((err) => console.error(err));
                });
            }
        } else {
            alert("Please enter a valid, full URL (starting with http:// or https://)");
        }
    });

    volcanoBtn.addEventListener('click', () => {
        volcanoRef.set(!isVolcanoErupted);
    });

    volcanoRef.on('value', (snapshot) => {
        isVolcanoErupted = snapshot.val() === true;
        if (isVolcanoErupted) {
            volcanoBtn.textContent = "Set to NORMAL (Island 8)";
            volcanoStatus.textContent = "Current Status: ERUPTED (Island 10)";
            volcanoStatus.style.color = "red";
        } else {
            volcanoBtn.textContent = "Set to ERUPTED (Island 10)";
            volcanoStatus.textContent = "Current Status: NORMAL (Island 8)";
            volcanoStatus.style.color = "green";
        }
    });

    if(healIceBtn) {
        healIceBtn.addEventListener('click', () => {
            database.ref('players').get().then(snapshot => {
                if (!snapshot.exists()) return;
                const players = snapshot.val();
                const updates = {};
                let count = 0;
                for (const id in players) {
                    const p = players[id];
                    if (p.relics && p.relics.icePack === true) {
                        const currentHp = parseInt(p.health) || 0;
                        updates[`players/${id}/health`] = currentHp + 1;
                        count++;
                    }
                }
                if (count > 0) database.ref().update(updates).then(() => alert(`Healed ${count} players!`));
                else alert("No players with Ice Pack found.");
            });
        });
    }

    const allowBtn = document.getElementById('perm-allow-btn');
    const forbidBtn = document.getElementById('perm-forbid-btn');
    const resetBtn = document.getElementById('perm-reset-btn'); 
    const playerSelect = document.getElementById('perm-player-select');
    const islandSelect = document.getElementById('perm-island-select');

    allowBtn.addEventListener('click', () => {
        const player = playerSelect.value;
        const island = islandSelect.value;
        if (!player || !island) return;
        database.ref(`permissions/${player}/${island}`).remove()
            .then(() => alert(`${player} is now ALLOWED on Island ${island}`));
    });

    forbidBtn.addEventListener('click', () => {
        const player = playerSelect.value;
        const island = islandSelect.value;
        if (!player || !island) return;
        database.ref(`permissions/${player}/${island}`).set(false)
            .then(() => alert(`${player} is now FORBIDDEN from Island ${island}`));
    });

    resetBtn.addEventListener('click', () => {
        if (confirm("Reset ALL permissions?")) {
            database.ref('permissions').remove()
                .then(() => alert("Permissions reset."));
        }
    });
    
    const hardResetBtn = document.getElementById('hard-reset-btn');
    hardResetBtn.addEventListener('click', () => {
        const url = teleportUrl.value.trim();
        if (!url || !(url.startsWith('http://') || url.startsWith('https://'))) {
            alert("Enter a valid Teleport URL first.");
            return;
        }
        if (!confirm(`ARE YOU 100% SURE?\n\nThis will PERMANENTLY reset the game.`)) return;

        database.ref('players').get().then((snapshot) => {
            if (!snapshot.exists()) { alert("No players found."); return; }
            const allPlayersData = snapshot.val();
            const updates = {};

            for (const colorId in allPlayersData) {
                updates[`players/${colorId}/health`] = 10;
                updates[`players/${colorId}/relics`] = null;
                updates[`players/${colorId}/amuletSelection`] = null; 
                updates[`players/${colorId}/amuletLog`] = null; // CLEAR LOG
                updates[`players/${colorId}/history`] = { lastIsland: 0, consecutiveTurns: 0 }; 
                updates[`players/${colorId}/weatherStaffLastUsedRound`] = null; 
            }
            updates['game_state/force_teleport_url'] = { url: url, timestamp: Date.now() };
            updates['game_state/current_round'] = 1;
            updates['game_state/uninhabitable_islands'] = null; 
            updates['permissions'] = null;

            for (let i = 1; i <= 10; i++) {
                updates[`islands/${i}/relics_taken`] = null;
            }

            database.ref().update(updates)
                .then(() => alert("GAME HARD RESET SUCCESSFUL."))
                .catch((err) => console.error(err));
        });
    });
}

function calculateRandomIsland(color) {
    const odds = dragonOdds[color];
    if (!odds) return 0;
    const appears = (Math.random() * 100) <= odds.chance;
    if (!appears) return 0; 
    const weights = odds.islands;
    let totalWeight = 0;
    for (const islandId in weights) {
        totalWeight += weights[islandId];
    }
    let randomNum = Math.random() * totalWeight;
    for (const islandId in weights) {
        if (randomNum < weights[islandId]) {
            return parseInt(islandId, 10);
        }
        randomNum -= weights[islandId];
    }
    return 0; // Fallback
}