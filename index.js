let selectedNumber = null;
let isMarkSmallMode = false;

document.addEventListener("DOMContentLoaded", () => {
    const board = document.getElementById("sudoku-game");
    const numButtons = document.querySelectorAll(".number-btn");
    const markSmallBtn = document.getElementById("mark-small");

    // 1. Create the 81 input boxes
    for (let i = 0; i < 81; i++) {
        const input = document.createElement("input");
        input.type = "text";
        input.readOnly = true; // User must use your buttons

        input.addEventListener("click", function() {
            if (selectedNumber===null) return;
            if(selectedNumber===""){
                this.value="";
                this.classList.remove("small-text","error")
                return;
            }

            const index = Array.from(board.querySelectorAll("input")).indexOf(this);
            const row = Math.floor(index / 9);
            const col = index % 9;

            if (isMarkSmallMode) {
                // PENCIL MARK LOGIC
                this.classList.add("small-text");
                // If number is already there, remove it. If not, add it.
                if (this.value.includes(selectedNumber)) {
                    this.value = this.value.replace(selectedNumber, "");
                } else {
                    this.value = (this.value + selectedNumber).split('').sort().join('');
                }
            } else {
                // NORMAL PLACEMENT LOGIC
                const currentGrid =getBoardArray();
                const numToPlace=parseInt(selectedNumber);
                if(isValid(currentGrid, row,col, numToPlace)){
                    this.classList.remove("small-text","error");
                    this.value=selectedNumber;
                }
                else{
                    this.classList.add("error");
                    setTimeout(() => this.classList.remove("error"), 500);
                }
            }
        });

        board.appendChild(input);
    }

    // 2. Select a number (1-9)
    numButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            numButtons.forEach(b => b.classList.remove("selected-number"));
            document.getElementById("clear").classList.remove("selected-number");
            btn.classList.add("selected-number");
            selectedNumber = btn.getAttribute("data-number");
        });
    });

    // 3. Toggle Mark Small Mode
    markSmallBtn.addEventListener("click", () => {
        isMarkSmallMode = !isMarkSmallMode;
        markSmallBtn.classList.toggle("active-mark");
    });

    // 4. Eraser Board
    document.getElementById("clear").addEventListener("click", () => {
        numButtons.forEach(b=>b.classList.remove("selected-number"));
        selectedNumber="";
        document.getElementById("clear").classList.add("selected-number")
    }); 

    // 5. Restart
    document.getElementById("restart").addEventListener("click", () => {
        location.reload();
    });
});

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
                rowData.push(0);
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
        const startRow = 3 * Math.floor(row / 3);
        const startCol = 3 * Math.floor(col / 3);
        const boxRow = startRow + Math.floor(i / 3);
        const boxCol = startCol + (i % 3);

        if (board[boxRow][boxCol] === num) return false;
    }
    return true;
}