const firebaseConfig = { apiKey: "AIzaSyBmrxwZ4F7E3Xfa_gi0tfiS7JH3NqxgjXY", authDomain: "dragon-hunt-html.firebaseapp.com", databaseURL: "https://dragon-hunt-html-default-rtdb.firebaseio.com", projectId: "dragon-hunt-html", storageBucket: "dragon-hunt-html.firebasestorage.app", messagingSenderId: "724852876791", appId: "1:724852876791:web:ce453714f44472bad27af2", measurementId: "G-9ESB16Y3M0" };
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const analytics = firebase.analytics();

const myIslandId = 2; 
const myDefaultColor = 'white';
const SIGHT_HOLE_X = 2000; 
const SIGHT_HOLE_Y = 1255;  
const MAP_HEIGHT = 800;    
const DRAGON_FLY_TIME = 4000;

const urlParams = new URLSearchParams(window.location.search);
const myColor = urlParams.get('player') || myDefaultColor;
const myPlayerDiv = document.getElementById(myColor);
const MOVEMENT_SPEED = 1; 
const keysPressed = { w: false, a: false, s: false, d: false };
let amIHiding = false; 
let playerCountOnMyIsland = 1; 

function triggerFlyover() {
    let dragonImg = document.getElementById('flying-dragon');
    if (!dragonImg) { dragonImg = document.createElement('img'); dragonImg.id = 'flying-dragon'; dragonImg.src = 'dragon.png'; document.body.appendChild(dragonImg); }
    dragonImg.classList.remove('fly-animation'); void dragonImg.offsetWidth; dragonImg.classList.add('fly-animation');
}

let pendingDamage = 0;
let pendingMessages = [];
let eventBatchTimer = null;

function queueDragonEvent(damage, message) {
    pendingDamage += damage; pendingMessages.push(message); triggerFlyover();
    if (eventBatchTimer) clearTimeout(eventBatchTimer);
    eventBatchTimer = setTimeout(executeDragonBatch, DRAGON_FLY_TIME);
}

function executeDragonBatch() {
    if (pendingMessages.length === 0) return;
    const fullMessage = "--- DRAGON ACTIVITY REPORT ---\n\n" + pendingMessages.join("\n\n");
    const finalDmg = parseInt(pendingDamage) || 0;
    if (finalDmg !== 0) {
        database.ref(`players/${myColor}/health`).once('value').then(snap => {
            let currentHealth = parseInt(snap.val()) || 0;
            let newHealth = currentHealth - finalDmg;
            database.ref(`players/${myColor}/health`).set(newHealth);
            let damageText = finalDmg > 0 ? `\n\nDAMAGE TAKEN: -${finalDmg} HP` : `\n\nHEALING: +${Math.abs(finalDmg)} HP`;
            alert(fullMessage + damageText + `\n(Health: ${newHealth})`);
        });
    } else { alert(fullMessage); }
    pendingDamage = 0; pendingMessages = [];
}

function calculateDragonDamage(color) {
    let effectiveHiding = amIHiding;
    let dmg = 0; let msg = `${color.toUpperCase()} Dragon arrived!`;
    if (color === 'green') dmg = 1;
    else if (color === 'red') { dmg = 3; msg += " Island Scorched!"; }
    else if (color === 'orange') dmg = 3;
    else if (color === 'black') { dmg = 5; msg += " Corruption spreading!"; }
    else if (color === 'yellow') { if (playerCountOnMyIsland > 1) { dmg = 1; msg += " (Group defense!)"; } else dmg = 3; }
    if (effectiveHiding) { if (color === 'black') { dmg = 3; msg += " (Hiding reduced to 3)"; } else { dmg = 1; msg += " (Hiding reduced to 1)"; } }
    return { dmg, msg };
}

function giveRandomLoot() {
    const roll = Math.random();
    let item = "", key = "";
    if (roll < 0.25) { item = "Ice Pack"; key = "icePack"; } else if (roll < 0.50) { item = "Great Sword"; key = "greatSword"; } else if (roll < 0.75) { item = "Star from the Heavens"; key = "starFromHeavens"; } else { item = "Magic's Bane"; key = "magicsBane"; }
    database.ref(`players/${myColor}/relics/${key}`).once('value').then(snap => {
        if (!snap.exists()) {
             triggerFlyover();
             setTimeout(() => { database.ref(`players/${myColor}/relics/${key}`).set(true); alert(`THE BLUE DRAGON HAS ARRIVED!\n\nYou obtained the: ${item}!`); }, DRAGON_FLY_TIME);
        }
    });
}

const dragons = ['green', 'red', 'yellow', 'black', 'orange', 'white', 'blue'];
const dragonLoaded = {}; 
dragons.forEach(color => {
    dragonLoaded[color] = false;
    database.ref(`dragons/${color}`).on('value', (snap) => {
        if (!dragonLoaded[color]) { dragonLoaded[color] = true; return; }
        const data = snap.val() || {};
        if (data.island == myIslandId) {
            if (color === 'blue') { giveRandomLoot(); return; }
            if (color === 'white') { queueDragonEvent(-10, "WHITE Dragon cleansed corruption and healed you!"); return; }
            const result = calculateDragonDamage(color);
            queueDragonEvent(result.dmg, result.msg);
        }
    });
});

let hasIslandLoaded = false;
const globalTeleportRef = database.ref('game_state/force_teleport_url');
globalTeleportRef.on('value', (snapshot) => {
    if (!hasIslandLoaded) { hasIslandLoaded = true; return; }
    const data = snapshot.val();
    if (data && data.url) {
        database.ref('dragons/blue/island').once('value').then(dragonSnap => {
            if (dragonSnap.val() == myIslandId) giveRandomLoot();
            setTimeout(() => { alert("The Admin has summoned all players!"); let newUrl = data.url; if (newUrl.includes('?')) newUrl += `&player=${myColor}`; else newUrl += `?player=${myColor}`; window.location.href = newUrl; }, DRAGON_FLY_TIME + 500);
        });
    }
});

const myPlayerRef = database.ref(`players/${myColor}`);
const myPositionRef = myPlayerRef.child('position');
const myIslandRef = myPlayerRef.child('island');
const islandRelicsRef = database.ref(`islands/${myIslandId}/relics_taken`);
myIslandRef.set(myIslandId);
myPositionRef.onDisconnect().remove();
document.title = `Island ${myIslandId} - ${myColor.charAt(0).toUpperCase() + myColor.slice(1)} Player`;

const localXdispP = document.getElementById('localxdisp');
const localYdispP = document.getElementById('localydisp'); 
const sightLimitEl = document.getElementById('sightlimit');
const hideSpots = document.querySelectorAll('.hidespots');
const obstacles = document.querySelectorAll('.obstacles'); 
const relic = document.getElementById('orangeamulet'); 
const sailboat = document.getElementById('sailboat'); 
const binocularDisplay = document.getElementById('binocular-display'); 
const amuletBox = document.getElementById('amulet-control-box'); 
const amuletTitle = document.getElementById('amulet-title'); 
const amuletSubmitBtn = document.getElementById('amulet-submit-btn'); 
const amuletSelect = document.getElementById('amulet-island-select'); 
const amuletDragonSelect = document.getElementById('amulet-dragon-select'); 
const dragonSelectContainer = document.getElementById('dragon-select-container');

function areRectsOverlapping(r1, r2) { return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom); }

islandRelicsRef.on('value', (snapshot) => {
    const takenData = snapshot.val() || {};
    if (relic) relic.style.display = takenData.orangeAmulet ? 'none' : 'block';
    if (sailboat) sailboat.style.display = takenData.sailboat ? 'none' : 'block';
});

myPlayerRef.child('relics').on('value', (snapshot) => {
    const myRelics = snapshot.val() || {};
    if (sightLimitEl) {
        if (myRelics.torch === true) sightLimitEl.style.backgroundImage = "url('torchlimit.png')";
        else sightLimitEl.style.backgroundImage = "url('sightlimit.png')";
    }
    if (amuletBox) {
        const ownedItems = [];
        if (myRelics.greenDragonAmulet) ownedItems.push("Green");
        if (myRelics.redDragonAmulet) ownedItems.push("Red");
        if (myRelics.blueDragonAmulet) ownedItems.push("Blue");
        if (myRelics.orangeAmulet) ownedItems.push("Orange");
        if (myRelics.wizardstaff) ownedItems.push("Wizard's Staff");
        if (ownedItems.length > 0) {
            amuletBox.style.display = 'block';
            amuletDragonSelect.innerHTML = "";
            ownedItems.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item; opt.textContent = item.includes("Staff") ? item : item + " Dragon";
                amuletDragonSelect.appendChild(opt);
            });
            if (ownedItems.length > 1) { amuletTitle.innerText = "Command Entity"; dragonSelectContainer.style.display = 'block'; } 
            else { const s = ownedItems[0]; amuletTitle.innerText = s.includes("Staff") ? s : `${s} Dragon`; dragonSelectContainer.style.display = 'none'; }
            amuletSubmitBtn.setAttribute('data-entity', ownedItems[0]);
        } else { amuletBox.style.display = 'none'; }
    }
});

if (amuletDragonSelect) { amuletDragonSelect.addEventListener('change', () => { amuletSubmitBtn.setAttribute('data-entity', amuletDragonSelect.value); }); }
if (amuletSubmitBtn) {
    amuletSubmitBtn.addEventListener('click', () => {
        const selectedIsland = parseInt(amuletSelect.value, 10);
        let activeEntity = amuletSubmitBtn.getAttribute('data-entity');
        if (!activeEntity && amuletDragonSelect.options.length > 0) activeEntity = amuletDragonSelect.value;
        if (activeEntity) {
            myPlayerRef.child('amuletSelection').set({ dragon: activeEntity, island: selectedIsland }).then(() => {
                const label = activeEntity.includes("Staff") ? activeEntity : `${activeEntity} Dragon`;
                alert(`${label} target set to Island ${selectedIsland}!`);
            });
        }
    });
}

function logPosition(currentX, currentY) {
    if (localXdispP) localXdispP.textContent = currentX + "px";
    if (localYdispP) localYdispP.textContent = currentY + "px"; 
    if (sightLimitEl) {
        const playerLeft = currentX + 7.5; 
        const playerBottom = currentY + 7.5;
        const playerTop = MAP_HEIGHT - playerBottom; 
        const bgPosX = playerLeft - SIGHT_HOLE_X;
        const bgPosY = playerTop - SIGHT_HOLE_Y;
        sightLimitEl.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;
    }
    const playerRect = myPlayerDiv.getBoundingClientRect();
    let isHiding = false;
    for (const spot of hideSpots) {
        if (areRectsOverlapping(playerRect, spot.getBoundingClientRect())) { isHiding = true; break; }
    }
    amIHiding = isHiding;
    database.ref('players').once('value').then(snap => {
        const allPlayersData = snap.val() || {};
        let countOnThisIsland = 0;
        for (const pid in allPlayersData) { if (allPlayersData[pid].island === myIslandId) countOnThisIsland++; }
        playerCountOnMyIsland = countOnThisIsland;
    });
    myPositionRef.update({ x: currentX + "px", y: currentY + "px", isHiding: isHiding });
}

function checkRelics(playerRect) {
    if (relic && relic.style.display !== 'none' && areRectsOverlapping(playerRect, relic.getBoundingClientRect())) {
         alert("You found the orange dragon amulet");
         myPlayerRef.child('relics/orangeAmulet').set(true);
         islandRelicsRef.child('orangeAmulet').set(true);
    }
    if (sailboat && sailboat.style.display !== 'none' && areRectsOverlapping(playerRect, sailboat.getBoundingClientRect())) {
         alert("you have found the sailboat");
         myPlayerRef.child('relics/sailboat').set(true);
         islandRelicsRef.child('sailboat').set(true);
    }
}

document.addEventListener('keydown', (e) => { const k = e.key.toLowerCase(); if (keysPressed.hasOwnProperty(k)) keysPressed[k] = true; });
document.addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); if (keysPressed.hasOwnProperty(k)) keysPressed[k] = false; });

function gameLoop() {
    if (!myPlayerDiv) { requestAnimationFrame(gameLoop); return; }
    const style = window.getComputedStyle(myPlayerDiv);
    let currentX = parseInt(style.getPropertyValue('left'), 10);
    let currentY = parseInt(style.getPropertyValue('bottom'), 10);
    const playerRect = myPlayerDiv.getBoundingClientRect();
    let hasMoved = false;
    if (keysPressed['d']) {
        const futureRect = { top: playerRect.top, bottom: playerRect.bottom, left: playerRect.left + MOVEMENT_SPEED, right: playerRect.right + MOVEMENT_SPEED };
        let canMove = true; for (const obstacle of obstacles) { if (areRectsOverlapping(futureRect, obstacle.getBoundingClientRect())) { canMove = false; break; } }
        if (currentX + MOVEMENT_SPEED <= 1290 && canMove) { currentX += MOVEMENT_SPEED; hasMoved = true; }
    }
    if (keysPressed['a']) {
        const futureRect = { top: playerRect.top, bottom: playerRect.bottom, left: playerRect.left - MOVEMENT_SPEED, right: playerRect.right - MOVEMENT_SPEED };
        let canMove = true; for (const obstacle of obstacles) { if (areRectsOverlapping(futureRect, obstacle.getBoundingClientRect())) { canMove = false; break; } }
        if (currentX - MOVEMENT_SPEED > 0 && canMove) { currentX -= MOVEMENT_SPEED; hasMoved = true; }
    }
    if (keysPressed['s']) {
        const futureRect = { top: playerRect.top + MOVEMENT_SPEED, bottom: playerRect.bottom + MOVEMENT_SPEED, left: playerRect.left, right: playerRect.right };
        let canMove = true; for (const obstacle of obstacles) { if (areRectsOverlapping(futureRect, obstacle.getBoundingClientRect())) { canMove = false; break; } }
        if (currentY - MOVEMENT_SPEED >= 0 && canMove) { currentY -= MOVEMENT_SPEED; hasMoved = true; }
    }
    if (keysPressed['w']) {
        const futureRect = { top: playerRect.top - MOVEMENT_SPEED, bottom: playerRect.bottom - MOVEMENT_SPEED, left: playerRect.left, right: playerRect.right };
        let canMove = true; for (const obstacle of obstacles) { if (areRectsOverlapping(futureRect, obstacle.getBoundingClientRect())) { canMove = false; break; } }
        if (currentY + MOVEMENT_SPEED <= 790 && canMove) { currentY += MOVEMENT_SPEED; hasMoved = true; }
    }
    if (hasMoved) {
        myPlayerDiv.style.left = currentX + 'px';
        myPlayerDiv.style.bottom = currentY + 'px';
        checkRelics(myPlayerDiv.getBoundingClientRect());
        logPosition(currentX, currentY);
    }
    requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
if (myPlayerDiv) { const startStyle = window.getComputedStyle(myPlayerDiv); logPosition(parseInt(startStyle.left, 10), parseInt(startStyle.bottom, 10)); }
const allPlayersRef = database.ref('players');
allPlayersRef.on('value', (snapshot) => {
    const allPlayersData = snapshot.val() || {};
    const myData = allPlayersData[myColor];
    let hasVision = false;
    if (myData && myData.relics) { if (myData.relics.binoculars || myData.relics.binocularsRocky || myData.relics.spyglass) hasVision = true; }
    let trackerHTML = "<h4>Binocular View</h4>";
    for (const colorId in allPlayersData) {
        const playerData = allPlayersData[colorId];
        const playerDiv = document.getElementById(colorId);
        if (!playerDiv) continue; 
        if (colorId === myColor) { playerDiv.style.display = 'block'; continue; }
        if (playerData.island === myIslandId && playerData.position) {
            playerDiv.style.display = 'block';
            if (playerData.position.x) playerDiv.style.left = playerData.position.x;
            if (playerData.position.y) playerDiv.style.bottom = playerData.position.y;
            if (playerData.position.isHiding) playerDiv.style.opacity = "0.3"; else playerDiv.style.opacity = "1";
        } else { playerDiv.style.display = 'none'; }
        if (hasVision) { const islandNum = playerData.island || "??"; trackerHTML += `<div class="tracker-item"><span style="color:${colorId}; font-weight:bold;">${colorId}</span>: Isle ${islandNum}</div>`; }
    }
    if (binocularDisplay) { if (hasVision) { binocularDisplay.innerHTML = trackerHTML; binocularDisplay.style.display = 'block'; } else { binocularDisplay.style.display = 'none'; } }
});
window.addEventListener('load', () => { setTimeout(() => { const loader = document.getElementById('loading-screen'); if (loader) { loader.style.opacity = '0'; setTimeout(() => { loader.style.display = 'none'; }, 1000); } }, 3000); });