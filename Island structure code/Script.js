// This is a helper function to check if two rectangle objects are overlapping
// We put it outside the event listener so it's only defined once.
function areRectsOverlapping(r1, r2) {
  return !(
    r1.right < r2.left ||
    r1.left > r2.right ||
    r1.bottom < r2.top ||
    r1.top > r2.bottom
  );
}

document.addEventListener('keydown', function(event) {
  
  const key = event.key.toLowerCase();
  const yourperson = document.getElementById('you');
  
  // Get all elements with the class 'obstacles'
  // This returns a NodeList (like an array)
  const obstacles = document.querySelectorAll('.obstacles'); 

  const logPosition = function() {
    const style = window.getComputedStyle(yourperson);
    const yourxposition = style.getPropertyValue('left');
    const youryposition = style.getPropertyValue('bottom');
    console.log(yourxposition + youryposition);
  };

  // --- Get player's current position BEFORE any checks ---
  const playerRect = yourperson.getBoundingClientRect();
  
  // --- Get relic positions ---
  const relic1 = document.getElementById('relic1');
  const relic1Rect = relic1 ? relic1.getBoundingClientRect() : null;

  const relic2 = document.getElementById('relic2');
  const relic2Rect = relic2 ? relic2.getBoundingClientRect() : null;

  const relic3 = document.getElementById('relic3');
  const relic3Rect = relic3 ? relic3.getBoundingClientRect() : null;

  // --- Define the collision handler function ---
  // This function checks against all relics.
  const handleRelicCollision = (futureRect) => {
      if (relic1Rect && areRectsOverlapping(futureRect, relic1Rect)) {
          alert("You found Relic 1");
          console.log("Touching Relic 1!");
          // Put relic 1 found in the cloud vars for this person
      }
      
      if (relic2Rect && areRectsOverlapping(futureRect, relic2Rect)) {
          alert("You found Relic 2");
          console.log("Touching Relic 2!");
          // Put relic 2 found in the cloud vars for this person
      }
      
      if (relic3Rect && areRectsOverlapping(futureRect, relic3Rect)) {
          alert("You found Relic 3");
          console.log("Touching Relic 3!");
          // Put relic 3 found in the cloud vars for this person
      }
  };


  if (key === 'd') {
    console.log('The "d" key was pressed!');
    
    // 1. Define the player's future position
    const futureRect = {
      top: playerRect.top,
      bottom: playerRect.bottom,
      left: playerRect.left + 2,
      right: playerRect.right + 2
    };

    // 2. Check if the future position hits any obstacle
    let canMove = true;
    for (const obstacle of obstacles) {
      const obstacleRect = obstacle.getBoundingClientRect();
      if (areRectsOverlapping(futureRect, obstacleRect)) {
        canMove = false;
        break; // Found a collision, no need to check others
      }
    }
    
    // --- Check for relic collision (does NOT block movement) ---
    handleRelicCollision(futureRect);

    // 3. Check boundaries (like you had before)
    const style = window.getComputedStyle(yourperson);
    const currentX = parseInt(style.getPropertyValue('left'), 10);
    
    // 4. Only move if boundary is OK AND we can move
    if (currentX + 2 <= 1290 && canMove) {
      $('#you').animate({
          left: '+=2px' 
      }, 0, logPosition);
    }

  } else if (key === 'a') {
    console.log('The "a" key was pressed!');
    
    const futureRect = {
      top: playerRect.top,
      bottom: playerRect.bottom,
      left: playerRect.left - 2,
      right: playerRect.right - 2
    };

    let canMove = true;
    for (const obstacle of obstacles) {
      const obstacleRect = obstacle.getBoundingClientRect();
      if (areRectsOverlapping(futureRect, obstacleRect)) {
        canMove = false;
        break;
      }
    }
    
    // --- Check for relic collision (does NOT block movement) ---
    handleRelicCollision(futureRect);
    
    const style = window.getComputedStyle(yourperson);
    const currentX = parseInt(style.getPropertyValue('left'), 10);

    if (currentX - 2 > 0 && canMove) {
      $('#you').animate({
          left: '-=2px'
      }, 0, logPosition);
    }
  } else if (key === 's') {
    console.log('The "s" key was pressed!');
    
    // Moving "down" on screen increases the 'top' value
    const futureRect = {
      top: playerRect.top + 2,
      bottom: playerRect.bottom + 2,
      left: playerRect.left,
      right: playerRect.right
    };

    let canMove = true;
    for (const obstacle of obstacles) {
      const obstacleRect = obstacle.getBoundingClientRect();
      if (areRectsOverlapping(futureRect, obstacleRect)) {
        canMove = false;
        break;
      }
    }
    
    // --- Check for relic collision (does NOT block movement) ---
    handleRelicCollision(futureRect);
    
    const style = window.getComputedStyle(yourperson);
    const currentY = parseInt(style.getPropertyValue('bottom'), 10);

    if (currentY - 2 >= 0 && canMove) {
      $('#you').animate({
          bottom: '-=2px'
      }, 0, logPosition);
    }
  } else if (key === 'w') {
    console.log('The "w" key was pressed!');

    // Moving "up" on screen decreases the 'top' value
    const futureRect = {
      top: playerRect.top - 2,
      bottom: playerRect.bottom - 2,
      left: playerRect.left,
      right: playerRect.right
    };

    let canMove = true;
    for (const obstacle of obstacles) {
      const obstacleRect = obstacle.getBoundingClientRect();
      if (areRectsOverlapping(futureRect, obstacleRect)) {
        canMove = false;
        break;
      }
    }
    
    // --- Check for relic collision (does NOT block movement) ---
    handleRelicCollision(futureRect);

    const style = window.getComputedStyle(yourperson);
    const currentY = parseInt(style.getPropertyValue('bottom'), 10);

    if (currentY + 2 <= 790 && canMove) {
      $('#you').animate({
          bottom: '+=2px'
      }, 0, logPosition);
    }
  }
});