let selectedNumber = null;  // This will hold the currently selected number (1-9) or "" for eraser
let isMarkSmallMode = false;    // This will track if we're in "Mark Small" mode or not
let lives = 3;   // Number of lives the player has (for error tracking)

function handleCellInputs(cell){
    if(selectedNumber === null) return;
    if(cell.classList.contains("fixed")) return; // Don't allow changes to fixed cells

    if(selectedNumber === ""){ // If eraser is selected, clear the cell
        cell.value = "";
        cell.classList.remove("small-text", "error") // Remove any classes that might be there
        return;
    }
    
    const board=document.getElementById("sudoku-game");
     const allInputs = Array.from(board.querySelectorAll("input"));
     const index = allInputs.indexOf(cell);
    const row = Math.floor(index / 9);
    const col = index % 9;

    if(isMarkSmallMode){
        // PENCIL MARK LOGIC
        cell.classList.add("small-text");
        // If number is already there, remove it. If not, add it.
        if(cell.value.includes(selectedNumber)){
            cell.value = cell.value.replace(selectedNumber, "");
        } else {
            cell.value = (cell.value + selectedNumber).split('').sort().join('');
        }
    } else {
        // NORMAL PLACEMENT LOGIC
        const currentGrid = getBoardArray(); // Get the current state of the board as a 2D array for validation
        const numToPlace = parseInt(selectedNumber); // Convert the selected number to an integer for validation

        if(isValid(currentGrid, row, col, numToPlace)){ // If the placement is valid according to Sudoku rules
            cell.classList.remove("small-text", "error") // Remove any classes that might be there
            cell.value = selectedNumber; // Place the selected number in the cell
        }
        else {
            lives--;
            updateLivesDisplay();
            cell.value = selectedNumber; // Temporarily show the incorrect number to give feedback to the player
            cell.classList.add("error"); // Add an error class to indicate invalid placement

            setTimeout(() => {
                if(lives <= 0){
                    GameOverScreen();
                }
                else {
                    cell.value = ""; // Clear the incorrect number after a short delay to give visual feedback
                    cell.classList.remove("error"); // Remove the error class after a short delay to give visual feedback
                }
            }, 1000); // Delay of 1 second to allow the player to see the feedback before clearing the cell or showing game over
        }
    }
}
document.addEventListener("DOMContentLoaded", () => {   // Wait for the DOM to load before running the script
    const board = document.getElementById("sudoku-game");   // The container for the Sudoku grid
    const numButtons = document.querySelectorAll(".number-btn");    // The buttons for selecting numbers (1-9)
    const markSmallBtn = document.getElementById("mark-small"); // The button for toggling "Mark Small" mode

    // 1. Create the 81 input boxes
    for (let i = 0; i < 81; i++) {
        const input = document.createElement("input");  // Create an input element for each cell in the Sudoku grid
        input.type = "text";    // Set the input type to text 
        input.readOnly = true;   // User must use your buttons

        input.addEventListener("click", function() { // When an input box is clicked
           handleCellInputs(this);
        });
           board.appendChild(input); // Add the input element to the Sudoku grid container
    }

    // 2. Select a number (1-9)
    numButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            numButtons.forEach(b => b.classList.remove("selected-number")); // Remove the "selected-number" class from all number buttons
            document.getElementById("clear").classList.remove("selected-number"); // Remove the "selected-number" class from the clear button
            btn.classList.add("selected-number"); // Add the "selected-number" class to the clicked button to visually indicate it's selected
            selectedNumber = btn.getAttribute("data-number"); // Update the selectedNumber variable to the number associated with the clicked button (or "" for eraser)
        });
    });

    // 3. Toggle Mark Small Mode
    markSmallBtn.addEventListener("click", () => {
        isMarkSmallMode = !isMarkSmallMode; // Toggle the "Mark Small" mode on or off
        markSmallBtn.classList.toggle("active-mark"); // Toggle the "active-mark" class on the button to visually indicate whether "Mark Small" mode is active or not
    });

    // 4. Eraser tool
    document.getElementById("clear").addEventListener("click", () => {
        numButtons.forEach(b => b.classList.remove("selected-number"));
        selectedNumber = ""; // Set selectedNumber to an empty string to indicate that the eraser is selected
        document.getElementById("clear").classList.add("selected-number")
    }); 

    // 5. Restart
    document.getElementById("restart").addEventListener("click", () => {
        location.reload(); // Reload the page to reset the game
    });
    startGame(); // Call the function to start the game (you can implement this function to generate a new Sudoku board and populate the grid)
});
function startGame() {
    let board = Array.from({ length: 9 }, () => Array(9).fill(0));
    generateFullBoard(board); // Generate a complete Sudoku board using backtracking

    const inputs = document.querySelectorAll("#sudoku-game input");
    for (let i = 0; i < 81; i++) {
        const row = Math.floor(i / 9);
        const col = i % 9;
        inputs[i].value = board[row][col]; // Set the value of each input box to the corresponding number from the generated board
        inputs[i].classList.add("fixed"); // Add the "fixed" class to indicate that these cells are pre-filled and cannot be changed by the player
    }
}
// Function to get the current state of the board as a 2D array for validation purposes
function getBoardArray() {
    const boardDiv = document.getElementById("sudoku-game");
    const inputs = boardDiv.querySelectorAll("input");
    let grid = [];

    for (let r = 0; r < 9; r++) {
        let rowData = [];
        for (let c = 0; c < 9; c++) {
            let index = r * 9 + c;
            let val = inputs[index].value;
            if (val.length === 1 && !inputs[index].classList.contains("small-text")) {
                rowData.push(parseInt(val));
            } else {
                rowData.push(0); // Treat empty cells and pencil marks as 0 for validation purposes
            }
        }
        grid.push(rowData);
    }
    return grid;
}
// Function to check if placing a number in a specific cell is valid according to Sudoku rules
function isValid(board, row, col, num) {
    for (let i = 0; i < 9; i++) {
        if (board[row][i] === num || board[i][col] === num) return false;
        const startRow = 3 * Math.floor(row / 3); // Calculate the starting row of the 3x3 box
        const startCol = 3 * Math.floor(col / 3); // Calculate the starting column of the 3x3 box
        const boxRow = startRow + Math.floor(i / 3); // Calculate the row index within the 3x3 box
        const boxCol = startCol + (i % 3); // Calculate the column index within the 3x3 box
        if (board[boxRow][boxCol] === num) return false; // If the number is found in the 3x3 box, return false
    }
    return true; // If the number is not found in the row, column, or 3x3 box, return true (valid placement)
}

// Backtracking algorithm to check if the current board state has a valid solution
function hasSolution(board) {
    // Check every cell in the board
    for(let row = 0; row < 9; row++) {
        for(let col = 0; col < 9; col++) {
            if(board[row][col] === 0) { //found an empty cell, try to fill it with a valid number
                for(let num = 1; num <= 9; num++) { // try numbers 1-9
                    if(isValid(board, row, col, num)) { //check if placing the number in the current cell is valid according to the rules
                        board[row][col] = num; 
                        if(hasSolution(board)) return true; //try to fill the rest of the board, if it returns true, we are done
                        board[row][col] = 0; //if it didn't work reset the cell and try the next number
                    }
                }
                return false; // Triggers backtracking if no valid number can be placed in the current empty cell
            }
        }
    }
    return true; // If we went through the entire board without finding any empty cells, it means we have a valid solution
}
// Backtracking algorithm to generate a complete Sudoku board
function generateFullBoard(board) {
    // check every cell in the board
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            //looking for empty cell, if found, try to fill it with a valid number
            if (board[row][col] === 0) {
                let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5); // shuffle numbers 1-9 so evertime we generate a board, it will be different 
                for (let num of nums) {  // try numbers 1-9 in random order
                    //check if placing the number in the current cell is valid according to the rules
                    if (isValid(board, row, col, num)) {
                        board[row][col] = num; // place the number in the cell
                        if (generateFullBoard(board)) return true; //try to fill the rest of the board, if it returns true, we are done
                        board[row][col] = 0; // if it didn't work reset the cell and try the next number
                    }
                }
                return false; // Triggers backtracking
            }
        }
    }
    return true; // Board is full
}
// Function to update the display of lives and visually indicate when the player is on their last life
function updateLivesDisplay() {
    const livesDisplay = document.getElementById("lives-count");
    const statusContainer = document.getElementById("status");
    if (livesDisplay) {
        livesDisplay.innerText = lives; // Update the displayed number of lives
    }
    if (lives === 1 && statusContainer) {
        statusContainer.classList.add("last-life"); // Add a class to visually indicate that the player is on their last life
    } else if (lives > 1 && statusContainer) {
        statusContainer.classList.remove("last-life"); // Remove the last-life class if the player has more than one life
    }
}
// Function to show the Game Over screen when the player runs out of lives
function GameOverScreen() {
    const screen = document.getElementById("Game-over-screen");
    if (screen) {
        screen.classList.remove("hidden");
    }
}
