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
            if (!selectedNumber) return;

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
                this.classList.remove("small-text");
                this.value = selectedNumber;
            }
        });

        board.appendChild(input);
    }

    // 2. Select a number (1-9)
    numButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            numButtons.forEach(b => b.classList.remove("selected-number"));
            btn.classList.add("selected-number");
            selectedNumber = btn.getAttribute("data-number");
        });
    });

    // 3. Toggle Mark Small Mode
    markSmallBtn.addEventListener("click", () => {
        isMarkSmallMode = !isMarkSmallMode;
        markSmallBtn.classList.toggle("active-mark");
    });

    // 4. Clear Board
    document.getElementById("clear").addEventListener("click", () => {
        board.querySelectorAll("input").forEach(input => {
            input.value = "";
            input.classList.remove("small-text");
        });
    });

    // 5. Restart
    document.getElementById("restart").addEventListener("click", () => {
        location.reload();
    });
});

