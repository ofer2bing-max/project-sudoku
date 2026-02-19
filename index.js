let selectedNumber = null;  // This will hold the currently selected number (1-9) or "" for eraser
let isMarkSmallMode = false;    // This will track if we're in "Mark Small" mode or not
let lives=3;   // Number of lives the player has (for error tracking)

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
            if (selectedNumber===null) return;
            if(selectedNumber===""){    // If eraser is selected, clear the cell
                this.value="";     // Clear the value of the cell
                this.classList.remove("small-text","error")  // Remove any classes that might be there 
                return;
            }
            // Calculate the row and column based on the index of the input
            const index = Array.from(board.querySelectorAll("input")).indexOf(this);
            const row = Math.floor(index / 9);  // Calculate the row number (0-8)
            const col = index % 9;   // Calculate the column number (0-8)

            if (isMarkSmallMode) {
                // PENCIL MARK LOGIC
                this.classList.add("small-text");
                // If number is already there, remove it. If not, add it.
                if (this.value.includes(selectedNumber)) { // If the selected number is already in the cell, remove it
                    this.value = this.value.replace(selectedNumber, "");
                } else { // If the selected number is not in the cell, add it and sort the numbers
                    this.value = (this.value + selectedNumber).split('').sort().join('');
                }
            } else {
                // NORMAL PLACEMENT LOGIC
                const currentGrid =getBoardArray();    // Get the current state of the board as a 2D array for validation
                const numToPlace=parseInt(selectedNumber);   // Convert the selected number to an integer for validation
                if(isValid(currentGrid, row,col, numToPlace)){    // If the placement is valid according to Sudoku rules
                    this.classList.remove("small-text","error"); // Remove any classes that might be there
                    this.value=selectedNumber; // Place the selected number in the cell
                }
                else{
                    lives--;
                    updateLivesDisplay();

                    this.classList.add("error"); // Add an error class to indicate invalid placement
                    setTimeout(() => this.classList.remove("error"), 500); // Remove the error class after a short delay to give visual feedback

                    if(lives<=0){
                        GameOverScreen();
                    }
                }
            }
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

    // 4. Eraser Board
    document.getElementById("clear").addEventListener("click", () => {
        numButtons.forEach(b=>b.classList.remove("selected-number"));
        selectedNumber=""; // Set selectedNumber to an empty string to indicate that the eraser is selected
        document.getElementById("clear").classList.add("selected-number")
    }); 

    // 5. Restart
    document.getElementById("restart").addEventListener("click", () => {
        location.reload(); // Reload the page to reset the game
    });
});
// --- HELPER FUNCTION TO GET THE BOARD STATE AS A 2D ARRAY ---
// This function reads the current values from the input boxes and constructs a 2D array representing the Sudoku board. 
// It only considers "real" numbers (length 1 and not marked as small text) for validation purposes, treating empty cells and pencil marks as 0.
function getBoardArray() {
    const boardDiv = document.getElementById("sudoku-game");
    const inputs = boardDiv.querySelectorAll("input");
    let grid = [];

    for (let r = 0; r < 9; r++) {
        let rowData = [];
        for (let c = 0; c < 9; c++) {
            let index = r * 9 + c;
            let val = inputs[index].value;
            
            // Only count "Real" numbers (length 1 and NOT small-text)
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

// --- THE LOGIC (Checks Sudoku rules) ---
function isValid(board, row, col, num) {
    for (let i = 0; i < 9; i++) {
        // 1. Check Row and columns
        if (board[row][i] === num || board[i][col] === num) return false;
        
        // 3. Check 3x3 Square
        const startRow = 3 * Math.floor(row / 3); // Calculate the starting row of the 3x3 box
        const startCol = 3 * Math.floor(col / 3); // Calculate the starting column of the 3x3 box
        const boxRow = startRow + Math.floor(i / 3); // Calculate the row index within the 3x3 box
        const boxCol = startCol + (i % 3); // Calculate the column index within the 3x3 box

        if (board[boxRow][boxCol] === num) return false; // If the number is found in the 3x3 box, return false
    }
    return true; // If the number is not found in the row, column, or 3x3 box, return true (valid placement)
}

function updateLivesDisplay() {
    const livesDisplay = document.getElementById("lives-count");
    if(livesDisplay) {
        livesDisplay.innerText = lives; // Update the displayed number of lives
    }
    if (lives === 1 && statusContainer) {
        statusContainer.classList.add("last-life"); // מוסיף את העיצוב האדום
    } else if (lives > 1 && statusContainer) {
        statusContainer.classList.remove("last-life"); // מחזיר למצב רגיל אם עשינו ריסטרט
    }
}


function solveSudoku(board) {
    for(let row=0; row<9; row++){
        for(let col=0; col<9; col++){
            if(board[row][col]===0){ // If the cell is empty
                // Try placing numbers 1-9 in the empty cell
                for(let num=1; num<=9; num++){
                    if(isValid(board, row, col, num)){ // If placing the number is valid according to Sudoku rules
                        board[row][col]=num; // Place the number in the cell
                        if(solveSudoku(board)) return true; // Recursively attempt to solve the rest of the board
                        board[row][col]=0; // If it doesn't lead to a solution, reset the cell and try the next number
                    }
                }
                return false; // If no number 1-9 can be placed in the empty cell, return false to trigger backtracking
            }
        }
    }
    return true; // If the entire board is filled without conflicts, return true (solved)
}

function GameOverScreen(){
    const screen = document.getElementById("Game-over-screen");
    if(screen){
        screen.classList.remove("hidden");
    }

}
