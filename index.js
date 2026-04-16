// --- Global Variables ---
// Difficulty levels mapped to the number of holes to dig
const difficultyLevels = {
    "easy": 35,
    "medium": 45,
    "hard": 55,
    "expert": 60
};

let selectedNumber = null; // Tracks the current selected number for input
let isMarkSmallMode = false; // Flag to indicate if the player is in "mark small numbers" mode
let lives = 3;
let currentDifficulty = "medium";
let intialBoard = []; // Persistent storage for the level's starting clues
let moveHistory = [];

// --- 1. Initialization ---
document.addEventListener("DOMContentLoaded", () => { // Ensure the DOM is fully loaded before accessing elements and initializing the game
    const board = document.getElementById("sudoku-game"); 
    const numButtons = document.querySelectorAll(".number-btn"); 
    const markSmallBtn = document.getElementById("mark-small"); 
    // Create 81 input cells for the Sudoku board
    for (let i = 0; i < 81; i++) {
        const input = document.createElement("input");
        input.type = "text"; 
        input.readOnly = true; 
        input.addEventListener("click", function() {
           handleCellInputs(this); 
        });
        board.appendChild(input); 
    }
    // Number button event listeners
    numButtons.forEach(btn => { 
        btn.addEventListener("click", () => {
            numButtons.forEach(b => b.classList.remove("selected-number"));
            document.getElementById("clear").classList.remove("selected-number");
            btn.classList.add("selected-number");
            selectedNumber = btn.getAttribute("data-number");
            highlightAllInstances(selectedNumber); // Highlight all cells with the same number as the selected number
        });
    });
    // Mark small numbers button event listener
    markSmallBtn.addEventListener("click", () => {
        isMarkSmallMode = !isMarkSmallMode; // Toggle the mode
        markSmallBtn.classList.toggle("active-mark"); // Update button appearance based on mode
    });
    // Clear selection button event listener
    document.getElementById("clear").addEventListener("click", () => { // Clear the selected number and update button states
        numButtons.forEach(b => b.classList.remove("selected-number")); // Deselect all number buttons
        selectedNumber = ""; // Set selectedNumber to empty string to indicate clearing input
        document.getElementById("clear").classList.add("selected-number"); // Highlight the clear button to indicate it's active
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
function startGame(level = currentDifficulty) { // Default to currentDifficulty if no level is provided
    document.getElementById("Game-over-screen").classList.add("hidden");
    let board = Array.from({ length: 9 }, () => Array(9).fill(0)); // Create an empty 9x9 board
    lives = 3;
    updateLivesDisplay();

    generateFullBoard(board); // Generate a complete Sudoku board
    const holesToDig = difficultyLevels[level]; // Get the number of holes to dig based on the selected difficulty level
    digHoles(board, holesToDig); // Dig holes to create the puzzle based on the difficulty level
    
    // Save the deep copy of the puzzle
    intialBoard = board.map(row => [...row]); // Deep copy to preserve the initial state of the board for restarting the game
    renderBoard(intialBoard); // Render the initial board with clues based on the generated puzzle
}
// Renders the Sudoku board by populating the input cells with the values from the provided board array. It also applies the "fixed" class to cells that contain clues and resets any previous input or error states.
function renderBoard(board) {
    const inputs = document.querySelectorAll("#sudoku-game input"); // Select all input cells in the Sudoku board
    inputs.forEach(input => { // Clear all input cells and remove any previous classes (fixed, small-text, error)
        input.value = ""; 
        input.classList.remove("fixed", "small-text", "error"); 
    });
    // Populate the cells with the values from the board array and apply the "fixed" class to clue cells
    for (let i = 0; i < 81; i++) {
        const row = Math.floor(i / 9);
        const col = i % 9;
        const value = board[row][col]; // Get the value from the board array for the current cell
        if (value !== 0) { // If the value is not 0, it means it's a clue and should be rendered as a fixed cell
            inputs[i].value = value; // Set the cell value to the clue number
            inputs[i].classList.add("fixed"); // Add the "fixed" class to indicate that this cell is a clue and cannot be changed by the player
        }
    }
}

// --- 3. Input & Validation ---
function handleCellInputs(cell) {
    highlightAllInstances(cell.value ,cell); // Highlight all cells with the same number as the currently clicked cell to provide visual feedback on the current selection and potential duplicates
    
    if (selectedNumber === null || cell.classList.contains("fixed")) return;
    if (cell.value === selectedNumber && !cell.classList.contains("small-text")) {
        return; // Do nothing if the number is already there
    }

    //Helper to record the state BEFORE change ---
    const recordMove = () => {
        moveHistory.push({
            cell: cell,
            prevValue: cell.value,
            prevClass: Array.from(cell.classList) // Stores small-text or error status
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
        cell.classList.add("small-text");
        if (cell.value.includes(selectedNumber)) {
            cell.value = cell.value.replace(selectedNumber, "");
        } else {
            cell.value = (cell.value + selectedNumber).split('').sort().join('');
        }
    } else {
        const currentGrid = getBoardArray();
        const numToPlace = parseInt(selectedNumber);

        if (isValid(currentGrid, row, col, numToPlace)) {
            recordMove(); // Record before placing valid number
            cell.classList.remove("small-text", "error");
            cell.value = selectedNumber;
            highlightAll(selectedNumber); // Update highlights after placing a number
        } else {
            // Usually, we don't record "Errors" in undo history 
            // because the game clears them automatically after 1 second.
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
// This function reads the current values from the input cells on the board and constructs a 2D array representing the current state of the Sudoku board. It checks for valid single-digit inputs that are not marked as small text or errors to ensure that only valid numbers are included in the board array for validation purposes.
function getBoardArray() {
    const inputs = document.querySelectorAll("#sudoku-game input"); // Select all input cells in the Sudoku board to read their values and construct the board array
    let grid = []; // Initialize an empty array to hold the rows of the board
    for (let r = 0; r < 9; r++) {// Loop through each row of the board to construct the 2D array representation of the current board state for validation purposes
        let rowData = []; // Initialize an empty array to hold the values for the current row
        for (let c = 0; c < 9; c++) { // Calculate the index of the current cell based on its row and column to access its value from the inputs array
            let index = r * 9 + c;
            let inputCell = inputs[index]; 
            let val = inputCell.value; 

            if (val.length === 1 && !inputCell.classList.contains("small-text") && !inputCell.classList.contains("error")) { // If the value is a single character and the cell is not marked as small text or error, parse it as an integer and add it to the row array; otherwise, add 0 to represent an empty cell in the board array
                rowData.push(parseInt(val));
            } else { // If the cell is empty, marked as small text, or marked as an error, treat it as an empty cell in the board array by adding 0 to the row array to indicate that there is no valid number in that cell for validation purposes
                rowData.push(0); 
            }
        }
        grid.push(rowData);// After processing all columns for the current row, add the row array to the grid array to build the complete 2D array representation of the current board state for validation purposes
    }
    return grid; 
}
// --- 4. Logic & Algorithms ---
function isValid(board, row, col, num) { // Check if placing the number in the specified row and column is valid according to Sudoku rules (no duplicates in the same row, column, or 3x3 subgrid)
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
            if (board[row][col] === 0) {// If the current cell is empty, attempt to fill it with a valid number
                let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5); // Shuffle the numbers 1-9 to ensure a unique solution each time the board is generated by randomizing the order of the numbers before trying to place them in the cell
                for (let num of nums) { // Iterate through the shuffled numbers and attempt to place each one in the current cell, checking if it's valid according to Sudoku rules before placing it; if a valid placement is found, recursively call the function to fill the next empty cell; if the recursive call returns true, it means the board is successfully filled and we can return true; if not, reset the cell to 0 and continue trying other numbers until all options are exhausted
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
function updateLivesDisplay() {
    const livesDisplay = document.getElementById("lives-count");
    if (livesDisplay) livesDisplay.innerText = lives;
}

function GameOverScreen() {
    const screen = document.getElementById("Game-over-screen");
    if (screen) screen.classList.remove("hidden");
}

function resetGame(){
    lives=3;
    updateLivesDisplay();
     const GameOverScreen = document.getElementById("Game-over-screen");
    if(GameOverScreen)  GameOverScreen.classList.add("hidden");
    renderBoard(intialBoard);
    highlightAllInstances(""); // Clear highlights when restarting the game
}
function undo() {
    if (moveHistory.length === 0) return;

    // Get the last move from the stack
    const lastMove = moveHistory.pop();
    const cell = lastMove.cell;

    // Restore value
    cell.value = lastMove.prevValue;

    // Restore classes (this fixes the "small-text" disappearing bug)
    cell.className = ""; // Clear current classes
    lastMove.prevClass.forEach(cls => cell.classList.add(cls));
}
// This function highlights all cells that contain the same number as the currently selected number by adding a specific CSS class to those cells. It first removes the highlight from all cells to ensure that only the relevant cells are highlighted based on the current selection.
function highlightAllInstances(targetNumber, clickedCell) {
    const allInputs = Array.from(document.querySelectorAll("#sudoku-game input"));
    const clickedIndex = allInputs.indexOf(clickedCell);
    
    // If user clicks outside or on nothing, just clear highlights
    if (clickedIndex === -1) {
        allInputs.forEach(input => input.classList.remove("highlight-same", "highlight-crosshair"));
        return;
    }

    const targetRow = Math.floor(clickedIndex / 9);
    const targetCol = clickedIndex % 9;

    const boxRowStart = Math.floor(targetRow / 3) * 3;
    const boxColStart = Math.floor(targetCol / 3) * 3;

    allInputs.forEach((input, index) => {
        input.classList.remove("highlight-same", "highlight-crosshair");

        const currentRow = Math.floor(index / 9);
        const currentCol = index % 9;

        // Highlight Row, Column, AND 3x3 Box ---
        const isInRow = (currentRow === targetRow);
        const isInCol = (currentCol === targetCol);
        const isInBox = (currentRow >= boxRowStart && currentRow < boxRowStart + 3 &&
                         currentCol >= boxColStart && currentCol < boxColStart + 3);

        if (isInRow || isInCol || isInBox) {
            input.classList.add("highlight-crosshair");
        }

        // Highlight Matching Numbers
        if (targetNumber && 
            targetNumber !== "" && 
            input.value === targetNumber && 
            !input.classList.contains("small-text")) {
            input.classList.add("highlight-same");
        }
    });
}
