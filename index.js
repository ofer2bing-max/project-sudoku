// --- Global Variables ---
// Difficulty levels mapped to the number of holes to dig
const difficultyLevels = {
    "easy": 35,
    "medium": 45,
    "hard": 55,
    "expert": 60
};

let selectedNumber = null; // Tracks the currently selected number for input
let isMarkSmallMode = false; // Flag to indicate if the player is in "mark small numbers" mode
let lives = 3;
let currentDifficulty = "medium";
let intialBoard = []; // Persistent storage for the level's starting clues

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
    if (selectedNumber === null) return;// If no number is selected, do nothing when a cell is clicked
    if (cell.classList.contains("fixed")) return; // If the cell is a fixed clue, do nothing when it's clicked

    if (selectedNumber === "") {// If the clear button is selected, clear the cell value and remove any small text or error classes
        cell.value = "";
        cell.classList.remove("small-text", "error");
        return;// Exit the function after clearing the cell
    }
    
    const boardElement = document.getElementById("sudoku-game"); // Get the Sudoku board element to calculate the row and column of the clicked cell
    const allInputs = Array.from(boardElement.querySelectorAll("input")); // Get all input cells in the Sudoku board as an array to determine the index of the clicked cell
    const index = allInputs.indexOf(cell); // Find the index of the clicked cell in the array of input cells to calculate its row and column
    const row = Math.floor(index / 9); // Calculate the row number based on the index of the cell (integer division by 9)
    const col = index % 9; // Calculate the column number based on the index of the cell (remainder when divided by 9)

    // If the player is in "mark small numbers" mode, toggle the presence of the selected number in the cell's value and apply the "small-text" class for styling
    if (isMarkSmallMode) {
        cell.classList.add("small-text"); 
        if (cell.value.includes(selectedNumber)) { 
            cell.value = cell.value.replace(selectedNumber, ""); 
        } else {
            cell.value = (cell.value + selectedNumber).split('').sort().join(''); // Add the selected number to the cell's value and sort the characters to keep them in order for better readability
        }
    } else { // If not in "mark small numbers" mode, validate the selected number against the current board state and either place it in the cell or handle it as an error if it's invalid according to Sudoku rules
        const currentGrid = getBoardArray(); 
        const numToPlace = parseInt(selectedNumber); 

        if (isValid(currentGrid, row, col, numToPlace)) { // If the selected number is valid according to Sudoku rules, place it in the cell and remove any error or small text classes
            cell.classList.remove("small-text", "error");// Remove any classes that indicate small marks or errors since the input is valid
            cell.value = selectedNumber;// Set the cell value to the selected number since it's a valid input
        } else {
            lives--;// Decrement the player's lives for an incorrect input and
            updateLivesDisplay();
            cell.value = selectedNumber; // Temporarily show the incorrect number in the cell to provide feedback to the player before clearing it
            cell.classList.add("error");// Add the "error" class to style the cell with a red background to indicate that the input is incorrect

            setTimeout(() => {// After a short delay, check if the player has run out of lives and show the game over screen if so, or clear the cell and remove the error class to allow the player to try again
                if (lives <= 0) {
                    GameOverScreen();
                } else {
                    cell.value = "";
                    cell.classList.remove("error");
                }
            }, 1000);// Delay of 1 second to allow the player to see the incorrect input before it is cleared and the error styling is removed
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
}