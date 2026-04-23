// --- Global Variables ---
// Difficulty levels mapped to the number of holes to dig
const difficultyLevels = {
  easy: 35,
  medium: 45,
  hard: 55,
  expert: 60,
};

let selectedNumber = null; // Tracks the current selected number for input
let isMarkSmallMode = false; // Flag to indicate if the player is in "mark small numbers" mode
let lives = 3;
let currentDifficulty = "medium";
let initialBoard = []; // Persistent storage for the level's starting clues
let moveHistory = []; // Stack to keep track of moves for undo functionality, storing the cell reference, previous value, and previous classes to allow accurate restoration of the cell's state when undoing a move
let solvedBoard = []; // Store the fully solved board for potential future features like hints or solution reveal
let score = 0; // Placeholder for score tracking, can be implemented based on time taken, number of moves, or other criteria in the future
let scoreMulty = 1; // Placeholder for score multiplier, can be used to increase score based on difficulty level or other factors in the future
let timeSeconds = 0; // Placeholder for time tracking, can be implemented to track the time taken by the player to solve the puzzle and potentially use it for scoring or providing feedback on performance in the future
let timerInterval = null; // Placeholder for timer interval, can be used to manage the timing mechanism for tracking how long the player has been playing the current puzzle, allowing for features like time-based scoring or performance feedback in the future

// --- 1. Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  // Ensure the DOM is fully loaded before accessing elements and initializing the game
  const board = document.getElementById("sudoku-game");
  const numButtons = document.querySelectorAll(".number-btn");
  const markSmallBtn = document.getElementById("mark-small");

  document.getElementById("play-button").addEventListener("click", () => {
    document.getElementById("main-menu").classList.add("hidden");
    document.getElementById("difficulty-menu").classList.remove("hidden");
  });

  document.querySelectorAll(".difficulty-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const level = btn.getAttribute("data-level");

      document.getElementById("difficulty-menu").classList.add("hidden");
      document.getElementById("game-container").classList.remove("hidden");

      currentDifficulty = level; // Store the selected difficulty level in a global variable to be used when starting the game, allowing for consistent access to the selected difficulty level across different functions and ensuring that the game starts with the correct settings based on the player's choice
      startGame(level); // Pass the selected difficulty level to the startGame function to initialize the game with the appropriate settings and puzzle generation based on the chosen difficulty, ensuring that the game experience is tailored to the player's selection and providing a consistent and engaging gameplay experience from the moment they start the game
    });
  });
  // Create 81 input cells for the Sudoku board
  for (let i = 0; i < 81; i++) {
    const input = document.createElement("input");
    input.type = "text";
    input.readOnly = true;
    input.addEventListener("click", function () {
      handleCellInputs(this);
    });
    board.appendChild(input);
  }
  // Number button event listeners
  numButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      numButtons.forEach((b) => b.classList.remove("selected-number"));
      document.getElementById("clear").classList.remove("selected-number");
      btn.classList.add("selected-number");
      selectedNumber = btn.getAttribute("data-number");
      highlightAll(selectedNumber); // Highlight all cells with the same number as the selected number
    });
  });
  // Mark small numbers button event listener
  markSmallBtn.addEventListener("click", () => {
    isMarkSmallMode = !isMarkSmallMode; // Toggle the mode
    markSmallBtn.classList.toggle("active-mark"); // Update button appearance based on mode
  });
  // Clear selection button event listener
  document.getElementById("clear").addEventListener("click", () => {
    const clearBtn = document.getElementById("clear");

    if (selectedNumber === "") {
      selectedNumber = null; // If already in clear mode, deselect it
      clearBtn.classList.remove("selected-number");
    } else {
      // Clear the selected number and update button states
      numButtons.forEach((b) => b.classList.remove("selected-number")); // Deselect all number buttons
      selectedNumber = ""; // Set selectedNumber to empty string to indicate clearing input
      clearBtn.classList.add("selected-number"); // Highlight the clear button to indicate it's active
    }
    highlightAll(""); // Clear highlights when clearing selection
  });
  document.getElementById("undo").addEventListener("click", () => {
    undo();
  });
  // Restart button resets the game state and re-renders the initial board clues
  document.getElementById("restart").addEventListener("click", () => {
    resetGame();
    startTimer(); // Restart the timer when the game is reset to ensure that time tracking is accurate and consistent with the new game state, allowing players to start fresh with a new timer for their new game session
  });

  updateNumberButtons(); // Initial update to set the correct state of number buttons based on the initial board clues, hiding any numbers that are already fully placed in the clues to prevent players from selecting numbers that are already completed in the puzzle right from the start of the game
});

// --- 2. Game Core ---
function startGame(level = currentDifficulty) {
  // Default to currentDifficulty if no level is provided
  document.getElementById("main-menu").classList.add("hidden");
  document.getElementById("difficulty-menu").classList.add("hidden");
  document.getElementById("Game-over-screen").classList.add("hidden");
  document.getElementById("win-screen").classList.add("hidden");
  document.getElementById("game-container").classList.remove("hidden");

  let board = Array.from({ length: 9 }, () => Array(9).fill(0)); // Create an empty 9x9 board
  lives = 3;
  score = 0;

  if (level === "easy") scoreMulty = 1;
  else if (level === "medium") scoreMulty = 1.5;
  else if (level === "hard") scoreMulty = 2;
  else if (level === "expert") scoreMulty = 3;

  updateLivesDisplay();
  updateScoreDisplay();

  generateFullBoard(board); // Generate a complete Sudoku board
  solvedBoard = board.map((row) => [...row]); // Store the solved board for potential future use (e.g., hints or solution reveal)
  const holesToDig = difficultyLevels[level]; // Get the number of holes to dig based on the selected difficulty level
  digHoles(board, holesToDig); // Dig holes to create the puzzle based on the difficulty level

  // Save the deep copy of the puzzle
  initialBoard = board.map((row) => [...row]); // Deep copy to preserve the initial state of the board for restarting the game
  renderBoard(initialBoard); // Render the initial board with clues based on the generated puzzle
  updateNumberButtons(); // Update the number buttons to reflect the initial state of the board, hiding any numbers that are already fully placed in the clues to prevent players from selecting numbers that are already completed in the puzzle
  startTimer(); // Start the game timer to track how long the player takes to solve the puzzle, allowing for potential future features like time-based scoring or performance feedback based on time taken

  selectedNumber = null;
  document
    .querySelectorAll(".number-btn")
    .forEach((b) => b.classList.remove("selected-number"));
  document.getElementById("clear").classList.remove("selected-number");
  highlightAll("");
}
// Renders the Sudoku board by populating the input cells with the values from the provided board array. It also applies the "fixed" class to cells that contain clues and resets any previous input or error states.
function renderBoard(board) {
  const inputs = document.querySelectorAll("#sudoku-game input"); // Select all input cells in the Sudoku board
  inputs.forEach((input) => {
    // Clear all input cells and remove any previous classes (fixed, small-text, error)
    input.value = "";
    input.classList.remove(
      "fixed",
      "small-text",
      "error",
      "highlight-same",
      "highlight-crosshair",
    );
  });
  // Populate the cells with the values from the board array and apply the "fixed" class to clue cells
  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9);
    const col = i % 9;
    const value = board[row][col]; // Get the value from the board array for the current cell
    if (value !== 0) {
      // If the value is not 0, it means it's a clue and should be rendered as a fixed cell
      inputs[i].value = value; // Set the cell value to the clue number
      inputs[i].classList.add("fixed"); // Add the "fixed" class to indicate that this cell is a clue and cannot be changed by the player
    }
  }
}

// --- 3. Input & Validation ---
function handleCellInputs(cell) {
  // 1. SYNC CLICKED CELL TO BUTTONS
  // This updates the selectedNumber if you click a number already on the board
  if (
    cell.value &&
    !cell.classList.contains("small-text") &&
    !cell.classList.contains("error")
  ) {
    const val = cell.value.toString();
    const targetBtn = document.querySelector(
      `.number-btn[data-number="${val}"]`,
    );

    if (targetBtn) {
      // Clear all active states from other buttons
      document
        .querySelectorAll(".number-btn")
        .forEach((b) => b.classList.remove("selected-number"));
      document.getElementById("clear").classList.remove("selected-number");

      // Set the new active button
      targetBtn.classList.add("selected-number");
      selectedNumber = val;
    }
  }

  // 2. RUN HIGHLIGHTS
  // We run this BEFORE the guard so that finished numbers still glow!
  highlightAll(selectedNumber, cell);
  checkwin(); // Check win condition after highlighting to ensure that the game state is updated correctly and any potential win condition is evaluated based on the current state of the board, allowing for scenarios where a player might win the game by placing a number that completes the puzzle, even if they haven't made a move that directly triggers a win condition check, as long as the board is in a winning state after the highlights are applied

  // 3. THE GUARD: "Look but don't touch"
  const currentBtn = document.querySelector(
    `.number-btn[data-number="${selectedNumber}"]`,
  );
  if (currentBtn && currentBtn.classList.contains("hidden-number")) {
    // Stop here so the player can't place or clear if the number is done
    return;
  }

  // 4. EXIT CHECKS
  if (selectedNumber === null || cell.classList.contains("fixed")) return;
  if (cell.value === selectedNumber && !cell.classList.contains("small-text")) {
    return; // Do nothing if the number is already there
  }

  // Helper to record the state BEFORE change
  const recordMove = () => {
    moveHistory.push({
      cell: cell,
      prevValue: cell.value,
      prevClass: Array.from(cell.classList),
    });
  };

  // Logic for the Clear Tool
  if (selectedNumber === "") {
    if (cell.value !== "") {
      recordMove();
      cell.value = "";
      cell.classList.remove("small-text", "error");
    }
    return;
  }

  const allInputs = Array.from(document.querySelectorAll("#sudoku-game input"));
  const index = allInputs.indexOf(cell);
  const row = Math.floor(index / 9);
  const col = index % 9;

  if (isMarkSmallMode) {
    // --- NOTES MODE LOGIC ---
    const numToPlace = parseInt(selectedNumber);
    const currentSolidBoard = Array.from({ length: 9 }, () => Array(9).fill(0));

    allInputs.forEach((input, i) => {
      const r = Math.floor(i / 9);
      const c = i % 9;
      if (
        input.classList.contains("fixed") &&
        !input.classList.contains("small-text")
      ) {
        currentSolidBoard[r][c] = parseInt(input.value);
      }
    });

    if (!isValid(currentSolidBoard, row, col, numToPlace)) {
      cell.classList.add("error");
      setTimeout(() => cell.classList.remove("error"), 250);
      return;
    }

    recordMove();
    cell.classList.add("small-text");
    if (cell.value.includes(selectedNumber)) {
      cell.value = cell.value.replace(selectedNumber, "");
    } else {
      cell.value = (cell.value + selectedNumber).split("").sort().join("");
    }
    highlightAll(selectedNumber, cell);
  } else {
    // --- PLACEMENT MODE LOGIC ---
    cell.classList.remove("small-text");
    const numToPlace = parseInt(selectedNumber);

    if (numToPlace === solvedBoard[row][col]) {
      // CORRECT MOVE
      recordMove();
      cell.classList.remove("small-text", "error");
      cell.value = selectedNumber;
      cell.classList.add("fixed");
      removeSmallNumbers(row, col, numToPlace);

      score += Math.floor(100 * scoreMulty);
      updateScoreDisplay();
      highlightAll(selectedNumber, cell);
      updateNumberButtons();
      checkwin();
    } else {
      // WRONG MOVE
      const penalty = 50 * scoreMulty;
      score = Math.max(0, score - penalty);
      updateScoreDisplay();
      lives--;
      updateLivesDisplay();
      cell.value = selectedNumber;
      cell.classList.add("error");

      setTimeout(() => {
        if (lives <= 0) {
          GameOverScreen();
        } else {
          // Safety: Don't clear if the user fixed it with a correct move already
          if (!cell.classList.contains("fixed")) {
            cell.value = "";
            cell.classList.remove("error");
          }
        }
        checkwin(); // Check win condition after handling the wrong move to ensure that the game state is updated correctly and any potential win condition is evaluated even after a wrong move, allowing for scenarios where a player might still win the game despite making a mistake, as long as they correct it within their remaining lives
      }, 1000);
    }
  }
} // End of function
// --- 4. Logic & Algorithms ---
function isValid(board, row, col, num) {
  // Check if placing the number in the specified row and column is valid according to Sudoku rules (no duplicates in the same row, column, or 3x3 subgrid)
  const startCol = 3 * Math.floor(col / 3);
  const startRow = 3 * Math.floor(row / 3);

  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num || board[i][col] === num) return false;
    const subgridRow = startRow + Math.floor(i / 3);
    const subgridCol = startCol + (i % 3);
    if (board[subgridRow][subgridCol] === num) return false;
  }
  return true;
}

// This function generates a complete Sudoku board by recursively filling in numbers while ensuring that the placement of each number is valid according to Sudoku rules.
// It uses backtracking to explore different number placements and shuffles the order of numbers to create a unique solution each time.
function generateFullBoard(board) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        // If the current cell is empty, attempt to fill it with a valid number
        let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5); // Shuffle the numbers 1-9 to ensure a unique solution each time the board is generated by randomizing the order of the numbers before trying to place them in the cell
        for (let num of nums) {
          // Iterate through the shuffled numbers and attempt to place each one in the current cell, checking if it's valid according to Sudoku rules before placing it; if a valid placement is found, recursively call the function to fill the next empty cell; if the recursive call returns true, it means the board is successfully filled and we can return true; if not, reset the cell to 0 and continue trying other numbers until all options are exhausted
          if (isValid(board, row, col, num)) {
            board[row][col] = num;
            if (generateFullBoard(board)) return true;
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}
// This function counts the number of valid solutions for the given Sudoku board by recursively trying to fill in empty cells with valid numbers and backtracking when necessary.
// It increments the count each time a complete valid solution is found and stops counting if more than one solution is detected to ensure that the puzzle has a unique solution.
function countSolutions(board) {
  let count = 0;
  function solve() {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValid(board, row, col, num)) {
              board[row][col] = num;
              solve();
              board[row][col] = 0;
              if (count > 1) return;
            }
          }
          return;
        }
      }
    }
    count++;
  }
  solve();
  return count;
}
// This function digs holes in the completed Sudoku board by randomly selecting cells and clearing their values while ensuring that the resulting puzzle still has a unique solution.
// It continues to dig holes until the desired number of holes is reached or a maximum number of attempts is exceeded to prevent infinite loops in cases where it's difficult to maintain a unique solution.
function digHoles(board, holesToDig) {
  let holesDug = 0;
  let attempts = 0;
  while (holesDug < holesToDig && attempts < 200) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    if (board[row][col] !== 0) {
      const backup = board[row][col];
      board[row][col] = 0;
      if (countSolutions(board) === 1) {
        holesDug++;
      } else {
        board[row][col] = backup;
      }
    }
    attempts++;
  }
}
// --- 5. UI Updates ---
// This function updates the display of remaining lives by modifying the inner text of the element with the ID "lives-count" to reflect the current number of lives left for the player, providing visual feedback on their remaining chances in the game.
function updateLivesDisplay() {
  const livesDisplay = document.getElementById("lives-count");
  if (livesDisplay) livesDisplay.innerText = lives;
}
// This function updates the score display by modifying the inner text of the element with the ID "score-count" to reflect the current score, providing visual feedback on the player's performance and progress in the game.
function updateScoreDisplay() {
  const scoreDisplay = document.getElementById("score-count"); // Get the element that displays the score to update it with the current score value, allowing players to see their score as they play and providing motivation to improve their performance in the game
  if (scoreDisplay) {
    // Check if the score display element exists before trying to update it to prevent errors in case the element is missing from the DOM, ensuring that the function can safely update the score display without causing issues in the game interface
    scoreDisplay.innerText = score;
  }
}

// This function displays the game over screen by removing the "hidden" class from the Game-over-screen element, allowing players to see the game over message and options when they run out of lives.
function GameOverScreen() {
  const screen = document.getElementById("Game-over-screen");
  clearInterval(timerInterval); // Stop the game timer when the game is over to prevent it from continuing to run after the player has lost, ensuring that the time tracking is accurate and consistent with the game state when the game over screen is displayed

  if (screen) {
    screen.classList.remove("hidden");
    screen.style.display = "flex"; // Ensure the game over screen is displayed as a flex container for proper layout of its contents, providing a visually appealing and organized presentation of the game over message and options for the player when they lose the game
  }
}

function resetGame() {
  score = 0;
  lives = 3;
  timeSeconds = 0;
  moveHistory = []; // Clear the move history stack when resetting the game to ensure that previous moves from the old game do not interfere with the new game, allowing players to start fresh without any carryover of past actions that could affect the integrity of the new game state

  updateLivesDisplay();
  updateScoreDisplay();

  const numButtons = document.querySelectorAll(".number-btn");
  numButtons.forEach((btn) => {
    btn.classList.remove("selected-number", "hidden-number"); // Reset the state of all number buttons by removing both the "selected-number" and "hidden-number" classes to ensure that all buttons are available and none are highlighted or hidden when starting a new game, providing a consistent and fair starting point for the player in the new game session
  });

  const GameOverScreen = document.getElementById("Game-over-screen");
  if (GameOverScreen) {
    GameOverScreen.classList.add("hidden");
    GameOverScreen.style.display = "none"; // Hide the game over screen when resetting the game to allow players to start a new game without the game over message obstructing the view, providing a seamless transition back to the game interface for a fresh start
  }

  const winScreen = document.getElementById("win-screen");
  if (winScreen) {
    winScreen.classList.add("hidden");
    winScreen.style.display = "none"; // Hide the win screen when resetting the game to allow players to start a new game without the win message obstructing the view, providing a seamless transition back to the game interface for a fresh start
  }

  renderBoard(initialBoard);
  updateNumberButtons(); // Update the number buttons to reflect the initial state of the board after resetting the game, hiding any numbers that are already fully placed in the clues to prevent players from selecting numbers that are already completed in the puzzle right from the start of the new game session
  startTimer();

  selectedNumber = null;
  document.querySelectorAll(".number-btn").forEach((btn) => {
    btn.classList.remove("selected-number"); // 2. Removes the blue highlight from the button
  });
  highlightAll(""); // Clears any highlights off the board cells
}
// This function implements the undo functionality by popping the last move from the move history stack and restoring the cell's value and classes to their previous state, allowing players to revert their last action and correct mistakes without affecting the overall game state or losing progress.
function undo() {
  if (moveHistory.length === 0) return;

  // Get the last move from the stack
  const lastMove = moveHistory.pop(); // Retrieve the last move, which contains the cell reference, previous value, and previous classes to allow accurate restoration of the cell's state when undoing a move
  const cell = lastMove.cell; // Get the cell reference from the last move to identify which cell needs to be restored to its previous state when undoing the last action performed by the player

  // Restore value
  cell.value = lastMove.prevValue;

  // Restore classes
  cell.className = ""; // Clear current classes
  lastMove.prevClass.forEach((cls) => cell.classList.add(cls));
  highlightAll(selectedNumber); // Update highlights after undoing the move to ensure that the visual feedback on the board is consistent with the current state of the game, allowing players to see the correct highlights based on their current selection and the restored state of the board after undoing a move
  updateNumberButtons(); // Update the number buttons to reflect the new state of the board after undoing a move, ensuring that any numbers that are now fully placed in the clues are hidden again to prevent players from selecting numbers that are already completed in the puzzle, maintaining consistency between the board state and the available number options for the player
}
// This function highlights all cells that contain the same number as the currently selected number by adding a specific CSS class to those cells. It first removes the highlight from all cells to ensure that only the relevant cells are highlighted based on the current selection.
function highlightAll(targetNumber, clickedCell) {
  // 1. Select all 81 input cells and convert the list into a true Array
  const allInputs = Array.from(document.querySelectorAll("#sudoku-game input"));

  // 2. Clear out any old highlights before we draw the new ones
  allInputs.forEach((input) =>
    input.classList.remove("highlight-same", "highlight-crosshair"),
  );

  // 2. Logic for the "Crosshair" (Replaces all that code you just showed me)
  if (clickedCell) {
    const clickedIndex = allInputs.indexOf(clickedCell);
    const targetRow = Math.floor(clickedIndex / 9);
    const targetCol = clickedIndex % 9;

    // We call the helper and tell it to light up every cell it finds
    getAffectedCells(targetRow, targetCol).forEach((cell) => {
      cell.classList.add("highlight-crosshair");
    });
  }

  // 3. Logic for "Matching Numbers" (Finding all 5s, all 2s, etc.)
  if (targetNumber && targetNumber !== "") {
    const searchNum = targetNumber.toString(); // Ensure the target number is treated as a string for comparison, allowing the function to correctly identify and highlight cells that contain the same number as the selected number, regardless of whether the input is a number or a string representation of a number
    // Loop through all cells again
    allInputs.forEach((input) => {
      // If the cell's number matches our selected number AND isn't just a tiny note
      if (input.value.toString().includes(searchNum)) {
        // Add the blue highlight color
        input.classList.add("highlight-same");
      }
    });
  }
}
function updateNumberButtons() {
  const allInputs = Array.from(document.querySelectorAll("#sudoku-game input"));
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  allInputs.forEach((input) => {
    const val = input.value;
    if (val && !input.classList.contains("small-text")) {
      if (val.length === 1) {
        counts[val]++;
      }
    }
  });
  const numButtons = document.querySelectorAll(".number-btn");
  numButtons.forEach((btn) => {
    const num = btn.getAttribute("data-number");
    const remaining = 9 - counts[num];
    const badge = btn.querySelector(".count-badge");

    if (badge) {
      badge.innerText = remaining;
    }

    if (remaining <= 0) {
      if (!btn.classList.contains("hidden-number")) {
        triggerNumberPop(num); // Trigger confetti animation when a number is fully placed in the clues, providing a celebratory visual effect to reward the player for completing that number in the puzzle and enhancing the overall gaming experience with positive feedback for their progress
      }
      btn.classList.add("hidden-number");
    } else {
      btn.classList.remove("hidden-number");
    }
  });
}

function getAffectedCells(row, col) {
  const allInputs = Array.from(document.querySelectorAll("#sudoku-game input"));
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;

  return allInputs.filter((_, index) => {
    const r = Math.floor(index / 9);
    const c = index % 9;
    return (
      r === row ||
      c === col ||
      (r >= startRow && r < startRow + 3 && c >= startCol && c < startCol + 3)
    );
  });
}
function removeSmallNumbers(row, col, placedNumber) {
  const numStr = placedNumber.toString();
  const affected = getAffectedCells(row, col);
  affected.forEach((cell) => {
    if (cell.classList.contains("small-text")) {
      cell.value = cell.value.replace(numStr, ""); // Remove the placed number from the candidate markings in the affected cells to maintain consistency with Sudoku rules and provide a clearer visual representation of remaining candidate numbers for the player after placing a correct number in the puzzle
      if (cell.value === "") {
        cell.classList.remove("small-text"); // If there are no more candidate numbers left in the cell after removing the placed number, remove the "small-text" class to reflect that there are no more candidates for that cell, providing accurate visual feedback to the player on the current state of the cell's candidate markings in the Sudoku puzzle
      }
    }
  });
}
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function startTimer() {
  clearInterval(timerInterval); // Clear any existing timer interval to prevent multiple timers from running simultaneously, ensuring that the time tracking is accurate and consistent when starting a new game or resetting the timer
  timeSeconds = 0;

  const timerDisplay = document.getElementById("time-count");
  timerInterval = setInterval(() => {
    timeSeconds++;

    const mins = Math.floor(timeSeconds / 60);
    const secs = timeSeconds % 60;

    if (timerDisplay) {
      timerDisplay.innerText = `${mins}:${secs.toString().padStart(2, "0")}`;
    }
  }, 1000);
}

function checkwin() {
  const allInputs = Array.from(document.querySelectorAll("#sudoku-game input"));
  const isComplete = allInputs.every(
    (input) => input.value !== "" && !input.classList.contains("error"),
  );

  if (isComplete) {
    showWinScreen();
  }
}

function showWinScreen() {
  const screen = document.getElementById("win-screen");
  clearInterval(timerInterval); // Stop the game timer when the player wins to prevent it from continuing to run after the game is completed, ensuring that the time tracking is accurate and consistent with the game state when the win screen is displayed

  document.getElementById("final-time").innerText = formatTime(timeSeconds); // Update the final time display on the win screen to reflect the total time taken by the player to solve the puzzle, providing feedback on their performance and rewarding them for their achievement in completing the puzzle within a certain time frame
  document.getElementById("final-score").innerText = score; // Update the final score display on the win screen to reflect the player's score at the time of winning, providing feedback on their performance and rewarding them for their achievement in completing the puzzle

  if (screen) {
    screen.classList.remove("hidden");
    screen.style.display = "flex"; // Ensure the win screen is displayed as a flex container for proper layout of its contents, providing a visually appealing and organized presentation of the win message and options for the player when they successfully complete the game
  }
}

function triggerNumberPop(num) {
  const allInputs = document.querySelectorAll("#sudoku-game input");
  allInputs.forEach((input) => {
    if (input.value == num) {
      input.classList.add("number-pop");
      setTimeout(() => {
        input.classList.remove("number-pop");
      }, 600);
    }
  });
}
