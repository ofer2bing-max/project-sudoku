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

// --- 1. Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  // Ensure the DOM is fully loaded before accessing elements and initializing the game
  const board = document.getElementById("sudoku-game");
  const numButtons = document.querySelectorAll(".number-btn");
  const markSmallBtn = document.getElementById("mark-small");
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
  });

  startGame();
});

// --- 2. Game Core ---
function startGame(level = currentDifficulty) {
  // Default to currentDifficulty if no level is provided
  document.getElementById("Game-over-screen").classList.add("hidden");
  let board = Array.from({ length: 9 }, () => Array(9).fill(0)); // Create an empty 9x9 board
  lives = 3;
  score = 0;
  updateLivesDisplay();
  updateScoreDisplay();

  generateFullBoard(board); // Generate a complete Sudoku board
  solvedBoard = board.map((row) => [...row]); // Store the solved board for potential future use (e.g., hints or solution reveal)
  const holesToDig = difficultyLevels[level]; // Get the number of holes to dig based on the selected difficulty level
  digHoles(board, holesToDig); // Dig holes to create the puzzle based on the difficulty level

  // Save the deep copy of the puzzle
  initialBoard = board.map((row) => [...row]); // Deep copy to preserve the initial state of the board for restarting the game
  renderBoard(initialBoard); // Render the initial board with clues based on the generated puzzle

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
  highlightAll(cell.value, cell); // Highlight all cells with the same number as the currently clicked cell to provide visual feedback on the current selection and potential duplicates

  if (selectedNumber === null || cell.classList.contains("fixed")) return;
  if (cell.value === selectedNumber && !cell.classList.contains("small-text")) {
    return; // Do nothing if the number is already there
  }

  //Helper to record the state BEFORE change ---
  const recordMove = () => {
    moveHistory.push({
      cell: cell,
      prevValue: cell.value,
      prevClass: Array.from(cell.classList), // Stores small-text or error status
    });
  };

  if (selectedNumber === "") {
    if (cell.value !== "") {
      recordMove(); // Record before clearing
      cell.value = "";
      cell.classList.remove("small-text", "error");
    }
    return;
  }

  // Get coordinates (same as your original)
  const allInputs = Array.from(document.querySelectorAll("#sudoku-game input"));
  const index = allInputs.indexOf(cell);
  const row = Math.floor(index / 9);
  const col = index % 9;

  if (isMarkSmallMode) {
    recordMove(); // Record before marking
    cell.classList.add("small-text"); // Mark the cell as small text to indicate it's a candidate number
    if (cell.value.includes(selectedNumber)) {
      // If the selected number is already marked as a candidate in the cell, remove it from the cell's value to allow toggling candidate numbers on and off for better user experience when marking potential numbers in the Sudoku puzzle
      cell.value = cell.value.replace(selectedNumber, "");
    } else {
      cell.value = (cell.value + selectedNumber).split("").sort().join(""); // Add the selected number to the cell's value and sort the characters to keep candidate numbers organized within the cell for easier readability when multiple candidates are marked
    }
  } else {
    cell.classList.remove("small-text"); // Ensure that the cell is not marked as small text when placing a number, as placing a number should override any candidate markings to reflect the player's intention to commit to that number in the cell
    const numToPlace = parseInt(selectedNumber);

    if (numToPlace === solvedBoard[row][col]) {
      recordMove(); // Record before placing valid number
      cell.classList.remove("small-text", "error");
      cell.value = selectedNumber;
      cell.classList.add("fixed"); // Mark the cell as fixed to prevent further changes
      score += 100; // Increment score for placing a correct number, can be used for future features like score tracking or leaderboards
      updateScoreDisplay(); // Update the score display to reflect the new score after placing a correct number, providing feedback to the player on their progress and performance in the game
      highlightAll(selectedNumber, cell); // Highlight all cells with the same number as the one just placed to provide visual feedback on the current selection and potential duplicates, enhancing the user experience when placing numbers in the Sudoku puzzle
    } else {
      score = Math.max(0, score - 50); // score penalty cannot reduce below 0
      updateScoreDisplay(); // Update the score display to reflect the new score after placing an incorrect number, providing feedback to the player on their performance and encouraging careful consideration when making moves in the game
      lives--;
      updateLivesDisplay();
      cell.value = selectedNumber;
      cell.classList.add("error");
      setTimeout(() => {
        if (lives <= 0) GameOverScreen();
        else {
          cell.value = "";
          cell.classList.remove("error");
        }
      }, 1000);
    }
  }
}

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
  if (screen) screen.classList.remove("hidden");
}

function resetGame() {
  score = 0;
  lives = 3;
  updateLivesDisplay();
  updateScoreDisplay();

  const GameOverScreen = document.getElementById("Game-over-screen");
  if (GameOverScreen) GameOverScreen.classList.add("hidden");

  renderBoard(initialBoard);
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
}
// This function highlights all cells that contain the same number as the currently selected number by adding a specific CSS class to those cells. It first removes the highlight from all cells to ensure that only the relevant cells are highlighted based on the current selection.
function highlightAll(targetNumber, clickedCell) {
  // 1. Select all 81 input cells and convert the list into a true Array
  const allInputs = Array.from(document.querySelectorAll("#sudoku-game input"));

  // 2. Clear out any old highlights before we draw the new ones
  allInputs.forEach((input) =>
    input.classList.remove("highlight-same", "highlight-crosshair"),
  );

  // 3. Logic for the "Crosshair" (Row, Column, and Box)
  if (clickedCell) {
    // Find the index (0-80) of the specific cell that was just clicked
    const clickedIndex = allInputs.indexOf(clickedCell);

    // If the click actually happened on a valid board cell
    if (clickedIndex !== -1) {
      const targetRow = Math.floor(clickedIndex / 9); // Math to find the row number (0-8)
      const targetCol = clickedIndex % 9; // Math to find the column number (0-8)

      // Calculate the start positions of the 3x3 box (e.g., Row 0, 3, or 6)
      const boxRowStart = Math.floor(targetRow / 3) * 3;
      const boxColStart = Math.floor(targetCol / 3) * 3;

      // Loop through EVERY cell on the board to see if it should be highlighted
      allInputs.forEach((input, index) => {
        const currentRow = Math.floor(index / 9); // Row of the current cell in the loop
        const currentCol = index % 9; // Column of the current cell in the loop

        // Check if this cell is in the same row, column, or 3x3 box as the clicked one
        const isInRow = currentRow === targetRow;
        const isInCol = currentCol === targetCol;
        const isInBox =
          currentRow >= boxRowStart &&
          currentRow < boxRowStart + 3 &&
          currentCol >= boxColStart &&
          currentCol < boxColStart + 3;

        // If it meets any of those three conditions, turn on the crosshair color
        if (isInRow || isInCol || isInBox) {
          input.classList.add("highlight-crosshair");
        }
      });
    }
  }

  // 4. Logic for "Matching Numbers" (Finding all 5s, all 2s, etc.)
  if (targetNumber && targetNumber !== "") {
    // Loop through all cells again
    allInputs.forEach((input) => {
      // If the cell's number matches our selected number AND isn't just a tiny note
      if (
        input.value === targetNumber &&
        !input.classList.contains("small-text")
      ) {
        // Add the blue highlight color
        input.classList.add("highlight-same");
      }
    });
  }
}
