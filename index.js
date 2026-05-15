// Defines an object holding the number of hidden cells (holes) to create for each difficulty level
const difficultyLevels = {
  Easy: 30, // Easy level leaves 51 clues (81 - 30)
  Medium: 43, // Medium level leaves 38 clues (81 - 43)
  Hard: 53, // Hard level leaves 28 clues (81 - 53)
  Advanced: 59, // Advanced level leaves 22 clues (81 - 59)
  Impossible: 64, // Impossible level leaves 17 clues (81 - 64)
};
let boiSound = new Audio("boi.mp3"); // Loads the audio file for a positive/easter-egg action sound
let dnumSound = new Audio("dNum.mp3"); // Loads the audio file for when a specific number is completely completed on the board
let noSound = new Audio("no.mp3"); // Loads the audio file for the game over sound sequence
let errorSound = new Audio("error.wav"); // Loads the audio file for an incorrect number placement action
let selectedNumber = null; // Tracks the currently active number button value chosen by the user for input
let isMarkSmallMode = false; // Flags whether the game is currently in pencil note mode or solid number placement mode
let lives = 3; // Tracks the remaining mistakes a player can make before losing the game
let currentDifficulty = "Medium"; // Keeps track of the currently active or selected game difficulty setting
let initialBoard = []; // Keeps a frozen copy of the generated starting layout to handle game resets properly
let moveHistory = []; // Acts as a stack array that logs historical move changes to enable undo actions
let solvedBoard = []; // Keeps a complete matrix copy of the correct full solution for validation testing
let score = 0; // Tracks the running total of points earned by the user during the session
let scoreMulty = 1; // Holds a dynamic mathematical weight factor determined entirely by the active difficulty
let timeSeconds = 0; // Counts the cumulative time spent on the active board puzzle in seconds
let timerInterval = null; // Stores the active JavaScript interval reference responsible for ticking the clock forward
let correctStreak = 0; // Counts consecutive correct solid cell answers to award streak milestone point bonuses
// --- 1. Initialization ---
// Waits until the complete HTML layout structure is fully parsed and ready before triggering initial game setup
document.addEventListener("DOMContentLoaded", () => {
  // Selects the core grid container element where the individual Sudoku inputs will be drawn
  const board = document.getElementById("sudoku-game");
  // Grabs all target element nodes representing the keypad buttons 1 through 9
  const numButtons = document.querySelectorAll(".number-btn");
  // Selects the functional button element used to toggle note-taking mode on or off
  const markSmallBtn = document.getElementById("mark-small");

  // 1. ADD THIS LINE (The variable for your bottom sheet)
  // Retrieves the modal menu panel element used for displaying difficulty options
  const difficultyMenu = document.getElementById("difficulty-menu");

  // 2. REPLACE your play-button listener with this:
  // Adds a click action listener to the main menu play button to reveal the difficulty selection overlay
  document.getElementById("play-button").addEventListener("click", () => {
    difficultyMenu.classList.remove("hidden"); // Removes the hiding utility style class from the difficulty panel
    difficultyMenu.style.display = "flex"; // Sets the CSS display layout mode to flex to safely reveal the element
  });

  // 3. ADD THIS (The logic to close the menu if you click the background)
  // Adds an action listener to the modal background mask to dismiss the menu if a user clicks outside it
  document.getElementById("sheet-close-zone").addEventListener("click", () => {
    difficultyMenu.style.display = "none"; // Forces the difficulty interface overlay block to hide visually
    difficultyMenu.classList.add("hidden"); // Appends the standard hidden layout utility style class back onto it
  });

  // 4. REPLACE your difficulty button listeners with this:
  // Loops through every individual difficulty mode button inside the selection interface panel
  document.querySelectorAll(".difficulty-btn").forEach((btn) => {
    // Listens for a click interaction on each specific difficulty option option button
    btn.addEventListener("click", () => {
      const level = btn.getAttribute("data-level"); // Extracts the designated level string token from the button markup data attribute
      currentDifficulty = level; // Updates the globally configured current tracking difficulty reference variable

      // Hide both menus and show the game
      document.getElementById("main-menu").classList.add("hidden"); // Applies the hidden display utility class to screen off the landing menu
      difficultyMenu.style.display = "none"; // Manually overwrites display layout styling to collapse the modal choice window
      difficultyMenu.classList.add("hidden"); // Ensures the generic hidden layout class is pinned to the modal container
      document.getElementById("game-container").classList.remove("hidden"); // Drops the hidden utility class from the core gameplay view interface panel

      startGame(level); // Triggers the core initialization and puzzle generation lifecycle routine using the chosen level
    });
  });
  // Create 81 input cells for the Sudoku board
  // Runs an active index counter iteration from 0 up to 80 to establish the classic Sudoku board architecture
  for (let i = 0; i < 81; i++) {
    const input = document.createElement("input"); // Generates a completely new interactive HTML text input element programmatically
    input.type = "text"; // Configures the standard element structural attribute type to text input format
    input.readOnly = true; // Prevents traditional direct user typing inputs into the field element node
    input.inputMode = "none"; // Disable mobile keyboard
    input.addEventListener("focus", (e) => e.preventDefault()); // Block default device browser actions when selecting a field container cell
    // Adds a direct click action event handler to every single generated puzzle grid cell block
    input.addEventListener("click", function () {
      handleCellInputs(this); // Hands over processing controls to the validation routine passing the clicked element reference
      this.blur(); // Remove focus to prevent mobile keyboard from appearing
    });
    board.appendChild(input); // Appends the prepared individual text field block straight into the main grid wrapper container
  }
  // Number button event listeners
  // Loops systematically through each selectable numeric selection input keypad button item
  numButtons.forEach((btn) => {
    // Attaches a click handler to map keypad actions to the active selected tracking index variable
    btn.addEventListener("click", () => {
      numButtons.forEach((b) => b.classList.remove("selected-number")); // Clears visual focus markers off all number buttons in the grid panel
      document.getElementById("clear").classList.remove("selected-number"); // Disengages visual highlight feedback trackers away from the specialized clean-up erase tool
      btn.classList.add("selected-number"); // Locks visual active tracking classes straight onto the clicked input option element
      selectedNumber = btn.getAttribute("data-number"); // Records the target raw numerical string identity attribute value to global memory variables
      highlightAll(selectedNumber); // Highlight all cells with the same number as the selected number
    });
  });
  // Mark small numbers button event listener
  // Binds an event tracking monitor onto the notes toggle interface control button structure
  markSmallBtn.addEventListener("click", () => {
    isMarkSmallMode = !isMarkSmallMode; // Toggle the mode
    markSmallBtn.classList.toggle("active-mark"); // Update button appearance based on mode
  });
  // Clear selection button event listener
  // Connects a mouse click event supervisor over the dashboard eraser tool action layout box
  document.getElementById("clear").addEventListener("click", () => {
    const clearBtn = document.getElementById("clear"); // Extracts the structural element node referencing the clear controller button item

    // Inspects whether the eraser state tool flag tracker is currently already active
    if (selectedNumber === "") {
      selectedNumber = null; // If already in clear mode, deselect it
      clearBtn.classList.remove("selected-number"); // Completely pulls down highlight styles away from the dashboard clear utility button
    } else {
      // Clear the selected number and update button states
      numButtons.forEach((b) => b.classList.remove("selected-number")); // Deselect all number buttons
      selectedNumber = ""; // Set selectedNumber to empty string to indicate clearing input
      clearBtn.classList.add("selected-number"); // Highlight the clear button to indicate it's active
    }
    highlightAll(""); // Clear highlights when clearing selection
  });
  // Hooks an action event interceptor to respond directly to triggers on the undo utility icon
  document.getElementById("undo").addEventListener("click", () => {
    undo(); // Directs execution code flow to look backward and restore previous historical state metrics
  });
  // Restart button resets the game state and re-renders the initial board clues
  // Configures a reset listener block attached to the dashboard level restart button structure
  document.getElementById("restart").addEventListener("click", () => {
    resetGame(); // Rolls back system progress states to restart matching original seed layout specs
  });
  // Intercepts structural click signals raised on the primary user dashboard home redirection link
  document.getElementById("home-button")?.addEventListener("click", () => {
    document.getElementById("game-container").classList.add("hidden"); // Conceals the active game engine container view template box from view
    document.getElementById("win-screen").classList.add("hidden"); // Enforces hidden state settings across the successful win menu panel structure
    document.getElementById("win-screen").style.display = "none"; // Normalizes layout configurations by completely collapsing the visual win screen block dimensions
    document.getElementById("Game-over-screen").classList.add("hidden"); // Conceals failure metrics components screen panels from view space layout dimensions
    document.getElementById("Game-over-screen").style.display = "none"; // Flattens display metrics properties to ensure the failure interface does not render

    const difficultyMenu = document.getElementById("difficulty-menu"); // Isolates the difficulty bottom selector drawer component block configuration element
    // Safely guards checking verification states to confirm the selection window asset is present
    if (difficultyMenu) {
      difficultyMenu.classList.add("hidden"); // Appends explicit CSS masking rules onto the layout controller block
      difficultyMenu.style.display = "none"; // Hard-overrides styling configuration states to collapse selection nodes out of view
    }
    document.getElementById("main-menu").classList.remove("hidden"); // Recalls and unmasks standard dashboard splash landing menus back to workspace area layouts
    clearInterval(timerInterval); // Halts active background system timers tracking running game progression metrics
  });

  updateNumberButtons(); // Initial update to set the correct state of number buttons based on the initial board clues, hiding any numbers that are already fully placed in the clues to prevent players from selecting numbers that are already completed in the puzzle right from the start of the game
  // Return to menu from Game Over Screen
  // Registers user interaction handlers mapping across failure panel configuration control links
  document.getElementById("new-game-btn")?.addEventListener("click", () => {
    const difficultyMenu = document.getElementById("difficulty-menu"); // Maps layout variable controls straight over structural modal choice objects
    // Checks that the element container exists to avoid structural engine runtime reference faults
    if (difficultyMenu) {
      difficultyMenu.classList.remove("hidden"); // Cleans off display hiding flags to prepare visualization execution tracks
      difficultyMenu.style.display = "flex"; // Restores active layout frame matrices inside system workspace parameters
    }
  });

  // Return to menu from Win Screen
  // Registers active event handlers across functional links mounted inside victory review screens
  document.getElementById("win-new-game-btn")?.addEventListener("click", () => {
    const difficultyMenu = document.getElementById("difficulty-menu"); // Locks variable target points onto the difficulty selector drawer model item
    // Inspects reference availability states to confirm runtime execution safety targets pass cleanly
    if (difficultyMenu) {
      difficultyMenu.classList.remove("hidden"); // Removes structural hiding attributes from selection configuration components
      difficultyMenu.style.display = "flex"; // Deploys open block layouts mapping the panel frame configurations into view
    }
  });
});

// --- 2. Game Core ---
// Initializes a brand-new Sudoku level instance using the targeted complexity configuration options
function startGame(level = currentDifficulty) {
  // Default to currentDifficulty if no level is provided
  document.getElementById("main-menu").classList.add("hidden"); // Pins down active concealment CSS rules onto the home screen wrapper
  document.getElementById("difficulty-menu").classList.add("hidden"); // Enforces layout masking conditions onto the modal selection window
  document.getElementById("difficulty-menu").style.display = "none"; // Shrinks display rendering frame boundaries down to a hidden value state

  document.getElementById("Game-over-screen").classList.add("hidden"); // Secures concealment rules across the game layout failure component views
  document.getElementById("Game-over-screen").style.display = "none"; // Disables styling frames evaluating failure metrics UI layouts entirely

  document.getElementById("win-screen").classList.add("hidden"); // Locks display mask rules over successful puzzle victory window panels
  document.getElementById("win-screen").style.display = "none"; // Shuts off interface presentation modules relating to active success tracking views

  document.getElementById("game-container").classList.remove("hidden"); // Unveils the active canvas sandbox containing grid board matrices
  isMarkSmallMode = false; // Reset to placement mode at the start of the game
  document.getElementById("mark-small").classList.remove("active-mark"); // Ensure the mark small button is in the correct state at the start of the game

  let board = Array.from({ length: 9 }, () => Array(9).fill(0)); // Create an empty 9x9 board
  lives = 3; // Replenishes global failure safety allowances back up to maximum baseline
  score = 0; // Wipes out historic point registers to balance current session scores
  correctStreak = 0; // Flattens multiplier streak trackers back down to step-one defaults
  timeSeconds = 0; // Standardizes time lapse history back to instant start metrics values
  moveHistory = []; // Purges old historical tracks to clean the undo buffer stack space
  selectedNumber = null; // Unsets selected values to prevent lingering keypad input leaks

  if (level === "Easy")
    scoreMulty = 1; // Standardizes scaling multipliers to unity factor bounds for easy tasks
  else if (level === "Medium")
    scoreMulty = 1.5; // Upgrades performance point weight scoring metrics for normal complexity settings
  else if (level === "Hard")
    scoreMulty = 2; // Elevates score growth speeds for managing difficult gaming grid systems
  else if (level === "Advanced")
    scoreMulty = 3; // Maximizes progress point yields for professional grade configuration challenges
  else if (level === "Impossible") scoreMulty = 4; // Maximizes point returns to account for extreme grid removal conditions

  updateLivesDisplay(); // Syncs active system health data trackers onto user interface panel views
  updateScoreDisplay(); // Refreshes layout score view fields to trace local session values properly

  generateFullBoard(board); // Generate a complete Sudoku board
  solvedBoard = board.map((row) => [...row]); // Store the solved board for potential future use (e.g., hints or solution reveal)
  const holesToDig = difficultyLevels[level]; // Get the number of holes to dig based on the selected difficulty level
  digHoles(board, holesToDig); // Dig holes to create the puzzle based on the difficulty level

  // Save the deep copy of the puzzle
  initialBoard = board.map((row) => [...row]); // Deep copy to preserve the initial state of the board for restarting the game
  renderBoard(initialBoard); // Render the initial board with clues based on the generated puzzle
  updateNumberButtons(); // Update the number buttons to reflect the initial state of the board, hiding any numbers that are already fully placed in the clues to prevent players from selecting numbers that are already completed in the puzzle
  startTimer(); // Start the game timer to track how long the player takes to solve the puzzle, allowing for potential future features like time-based scoring or performance feedback based on time taken

  selectedNumber = null; // Resets current input trackers to guarantee clean starting states on layout loads
  document
    .querySelectorAll(".number-btn") // Collects the complete arrays of input number control components inside the keypad wrapper
    .forEach((b) => b.classList.remove("selected-number")); // Trims off any residual highlight accent styles still pinned onto button elements
  document.getElementById("clear").classList.remove("selected-number"); // Strips active status classes off the general deletion tool icon layout block
  highlightAll(""); // Clears any matching cell highlights away across all elements in the puzzle arena
}
// Renders the Sudoku board by populating the input cells with the values from the provided board array. It also applies the "fixed" class to cells that contain clues and resets any previous input or error states.
function renderBoard(board) {
  const inputs = document.querySelectorAll("#sudoku-game input"); // Select all input cells in the Sudoku board
  inputs.forEach((input) => {
    // Clear all input cells and remove any previous classes (fixed, small-text, error)
    input.value = ""; // Empties the current display value from the evaluation input box structure
    input.classList.remove(
      "fixed", // Clears away immutable core setup state modifier flags
      "small-text", // Eliminates pencil marker notation text display format setups
      "error", // Cleans away incorrect cell selection indicator accents
      "highlight-same", // Pulls back target number equality glowing backdrop elements
      "highlight-crosshair", // Wipes away row/column visual intersecting tracking frames
    );
  });
  // Populate the cells with the values from the board array and apply the "fixed" class to clue cells
  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9); // Calculates the precise row coordinate position index across grid system axes
    const col = i % 9; // Extracts the direct horizontal array element column coordinate tracking position
    const value = board[row][col]; // Get the value from the board array for the current cell
    if (value !== 0) {
      // If the value is not 0, it means it's a clue and should be rendered as a fixed cell
      inputs[i].value = value; // Set the cell value to the clue number
      inputs[i].classList.add("fixed"); // Add the "fixed" class to indicate that this cell is a clue and cannot be changed by the player
    }
  }
}

// --- 3. Input & Validation ---
// Handles user interaction inputs and evaluates mechanics logic whenever a valid box grid node cell gets clicked
function handleCellInputs(cell) {
  // 1. SYNC CLICKED CELL TO BUTTONS
  // This updates the selectedNumber if you click a number already on the board
  if (
    cell.value && // Evaluates whether the user clicked an occupied field item block containing numbers
    !cell.classList.contains("small-text") && // Assures the verification check ignores cells holding tiny notes options
    !cell.classList.contains("error") // Checks that the target component does not have an active validation fault flag
  ) {
    const val = cell.value.toString(); // Grabs the underlying numerical digit content string from the target matrix container element
    const targetBtn = document.querySelector(
      `.number-btn[data-number="${val}"]`, // Attempts to find a matching button element in the keypad corresponding to the clicked cell's value
    );

    if (targetBtn) {
      // Clear all active states from other buttons
      document
        .querySelectorAll(".number-btn") // Collects all number keypad action buttons inside the control system layout view
        .forEach((b) => b.classList.remove("selected-number")); // Trims away glowing active indicators across the selection dashboard buttons
      document.getElementById("clear").classList.remove("selected-number"); // Turns off active focus markers from the system-wide element erase tool

      // Set the new active button
      targetBtn.classList.add("selected-number"); // Applies active highlight tracking classes straight onto the matching selector block
      selectedNumber = val; // Synchronizes the central control variables to mirror the clicked cell's value
    }
  }

  // 2. RUN HIGHLIGHTS
  // We run this BEFORE the guard so that finished numbers still glow!
  highlightAll(selectedNumber, cell); // Directs board display modules to project background accent glows based on chosen elements
  checkwin(); // Check win condition after highlighting to ensure that the game state is updated correctly and any potential win condition is evaluated based on the current state of the board, allowing for scenarios where a player might win the game by placing a number that completes the puzzle, even if they haven't made a move that directly triggers a win condition check, as long as the board is in a winning state after the highlights are applied

  // 3. THE GUARD: "Look but don't touch"
  const currentBtn = document.querySelector(
    `.number-btn[data-number="${selectedNumber}"]`, // Queries the document structure for keypad controls associated with active selected numbers
  );
  if (currentBtn && currentBtn.classList.contains("hidden-number")) {
    // Stop here so the player can't place or clear if the number is done
    return; // Breaks sequence processing executions instantly to secure locked completed sets
  }

  // 4. EXIT CHECKS
  if (selectedNumber === null || cell.classList.contains("fixed")) return; // Aborts cell edits instantly if inputs are null or marked immutable initial board values
  if (cell.value === selectedNumber && !cell.classList.contains("small-text")) {
    return; // Do nothing if the number is already there
  }

  // Helper to record the state BEFORE change
  // Inner tracking tool routine designed to capture and archive state vectors before modification loops run
  const recordMove = () => {
    moveHistory.push({
      cell: cell, // Logs the specific interactive DOM element node object reference being changed
      prevValue: cell.value, // Stores the plain character or digit value string resting in the field container
      prevClass: Array.from(cell.classList), // Saves an array snapshot of all style utility state flags currently pinned to the element
    });
  };

  // Logic for the Clear Tool
  if (selectedNumber === "") {
    if (cell.value !== "") {
      recordMove(); // Runs state logging procedures to guarantee historical tracking updates save accurately
      cell.value = ""; // Safely empties out contents filled inside the target text box component
      cell.classList.remove("small-text", "error"); // Standardizes class listings by cleaning out style states from the target element frame
      updateNumberButtons(); // Update the number buttons to reflect the new state of the board after clearing a cell, ensuring that any numbers that are now fully placed in the clues are hidden again to prevent players from selecting numbers that are already completed in the puzzle, maintaining consistency between the board state and the available number options for the player
    }
    return; // Returns control loop back up to system environments once deletion tasks execute cleanly
  }

  const allInputs = Array.from(document.querySelectorAll("#sudoku-game input")); // Aggregates the absolute matrix collection of 81 layout elements into local scope arrays
  const index = allInputs.indexOf(cell); // Localizes the absolute dimensional index coordinate position offset of the target field box
  const row = Math.floor(index / 9); // Derives row location metrics across standard flat grid counting index offsets
  const col = index % 9; // Identifies column coordinates across normal flat array listing offset positions

  if (isMarkSmallMode) {
    // --- NOTES MODE LOGIC ---
    const numToPlace = parseInt(selectedNumber); // Parses layout text strings into integer format representations for evaluation processing
    const currentSolidBoard = Array.from({ length: 9 }, () => Array(9).fill(0)); // Sets up a transient blank scratchpad 9x9 multi-dimensional layout workspace matrix

    allInputs.forEach((input, i) => {
      const r = Math.floor(i / 9); // Determines matching y-axis grid parameters inside sequential parsing runs
      const c = i % 9; // pinpoints matching x-axis positional alignment maps in sequential loop evaluations
      if (
        input.classList.contains("fixed") && // Checks if the examined grid slot element possesses persistent core value setups
        !input.classList.contains("small-text") // Confirms that the target value layout frame is an actual set choice asset
      ) {
        currentSolidBoard[r][c] = parseInt(input.value); // Syncs true static integers over into matching temporary analysis matrix frames
      }
    });

    if (!isValid(currentSolidBoard, row, col, numToPlace)) {
      cell.classList.add("error"); // Drops validation error highlighting frameworks on structural element containers
      setTimeout(() => cell.classList.remove("error"), 250); // Schedules automatic tracking clear functions to execute after a brief quarter-second timeout sequence
      return; // Breaks further programmatic sequence execution pipelines to avoid bad inputs entering structures
    }

    recordMove(); // Logs state configuration values before introducing alternative note configurations
    cell.classList.add("small-text"); // Appends specialized tiny annotation-style font rendering behaviors onto element classes
    if (cell.value.includes(selectedNumber)) {
      cell.value = cell.value.replace(selectedNumber, ""); // Wipes away overlapping duplicate digit tokens from within internal text layout values
    } else {
      cell.value = (cell.value + selectedNumber).split("").sort().join(""); // appends newly configured digit entries into sorted string structures
    }
    highlightAll(selectedNumber, cell); // Prompts layout engines to reconstruct system highlights across updated field vectors
  } else {
    // --- PLACEMENT MODE LOGIC ---
    cell.classList.remove("small-text"); // Tears down note layout presentation style instructions from the cell element
    const numToPlace = parseInt(selectedNumber); // Resolves targeted user string configuration choices down into binary code integers

    if (numToPlace === solvedBoard[row][col]) {
      // CORRECT MOVE
      recordMove(); // Snapshots historic context layouts right before injecting certified solution values
      cell.classList.remove("small-text", "error"); // Safely filters away bad input state tracking accents from cell styling tags
      cell.value = selectedNumber; // Prints the chosen valid digit text right into the target cell location input line
      cell.classList.add("fixed"); // Commits lock styles onto element tags to classify inputs as certified puzzle clues

      correctStreak++; // Updates the running sequence tracking integers evaluating correct placements back-to-back
      let Bonus = 0; // Prepares local score multiplier tracking blocks to figure additional earned values
      if (correctStreak >= 4) {
        Bonus = Math.floor(50 * scoreMulty); // Configures specialized extra point yields scaled exactly to game mode factors
      }
      score += Math.floor(100 * scoreMulty) + Bonus; // Calculates overall score adjustments utilizing difficulty weight models and bonuses

      removeSmallNumbers(row, col, numToPlace); // Dispatches cleanup engines to sweep out outdated pencil notes from linked sectors
      updateScoreDisplay(); // Remaps modified dashboard tracking values down to visual screen view layouts
      updateNumberButtons(); // Re-evaluates active numeric counts to shut down filled numbers across selection areas

      if (currentBtn && !currentBtn.classList.contains("hidden-number")) {
        highlightAll(selectedNumber, cell); // Refreshes active display canvas focus frames to point highlighting grids over active selections
      }
      checkSecCompletion(row, col); // Instructs checking frameworks to scan whether a full row, box, or line completed cleanly
      checkwin(); // Forces verification engines to crawl through board components checking victory milestones
    } else {
      // WRONG MOVE
      errorSound.play(); // Triggers high-priority audio execution targets to announce validation check failure instances
      correctStreak = 0; // Collapses successful consecutive streak multipliers immediately down to zero bounds
      const penalty = 50 * scoreMulty; // Calculates point reduction scaling metrics matching game speed configurations
      score = Math.max(0, score - penalty); // Deducts negative scores safely while guaranteeing tracking variables never drop below zero boundaries
      updateScoreDisplay(); // Syncs newly modified mathematical calculation totals straight down onto dashboard screens
      lives--; // Subtracts health point allowances systematically from master game loop variables
      updateLivesDisplay(); // Redraws remaining safety life indicators straight across visual interface views
      cell.value = selectedNumber; // Temporarily reveals the incorrect value choice within the target text box field block
      cell.classList.add("error"); // Employs specialized crimson alert layout highlighting outlines over the failing cell structure

      setTimeout(() => {
        if (lives <= 0) {
          GameOverScreen(); // Passes computational tracking executions to launch failure layout overlay templates
        } else {
          // Safety: Don't clear if the user fixed it with a correct move already
          if (!cell.classList.contains("fixed")) {
            cell.value = ""; // Automatically flushes the incorrect value string from the target grid entry block
            cell.classList.remove("error"); // Strips warning class structures away to clean up field presentation states
            updateNumberButtons(); // Update the number buttons to reflect the new state of the board after handling a wrong move, ensuring that any numbers that are now fully placed in the clues are hidden again to prevent players from selecting numbers that are already completed in the puzzle, maintaining consistency between the board state and the available number options for the player even after making a mistake, allowing for a more forgiving gameplay experience where players can recover from errors without permanently affecting their ability to select numbers based on the current state of the board
          }
        }
        checkwin(); // Check win condition after handling the wrong move to ensure that the game state is updated correctly and any potential win condition is evaluated even after a wrong move, allowing for scenarios where a player might still win the game despite making a mistake, as long as they correct it within their remaining lives
      }, 1000);
    }
  }
} // End of function
// --- 4. Logic & Algorithms ---
// Analyzes row alignments, column planes, and regional 3x3 grids to verify structural validation constraints
function isValid(board, row, col, num) {
  // Check if placing the number in the specified row and column is valid according to Sudoku rules (no duplicates in the same row, column, or 3x3 subgrid)
  const startCol = 3 * Math.floor(col / 3); // Maps grid coordinate points back to matching column index entry boundaries
  const startRow = 3 * Math.floor(row / 3); // Pinpoints regional row alignment index headers for 3x3 box clusters

  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num || board[i][col] === num) return false; // Throws failure values immediately if vertical or horizontal lines contain overlapping twins
    const subgridRow = startRow + Math.floor(i / 3); // Calculates deep row traversal metrics step-indexes inside subgrid scanning loops
    const subgridCol = startCol + (i % 3); // Derives step column cell references mapped inside isolated quadrant boxes
    if (board[subgridRow][subgridCol] === num) return false; // Returns bad tracking results if target numbers collide with existing regional quadrant content
  }
  return true; // Validates the coordinates as meeting structural requirements for placement safety constraints
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
            board[row][col] = num; // Assigns target number configuration choices over to local structural board arrays
            if (generateFullBoard(board)) return true; // Follows operational code execution paths down into deep recursive matching trials
            board[row][col] = 0; // Sweeps values backward by flattening cells to empty conditions when validation paths collapse
          }
        }
        return false; // Sends failure alerts back up execution chains to reveal unresolvable configuration branches
      }
    }
  }
  return true; // Confirms that the target multi-dimensional board layout array matrix completely filled without conflicts
}
// This function counts the number of valid solutions for the given Sudoku board by recursively trying to fill in empty cells with valid numbers and backtracking when necessary.
// It increments the count each time a complete valid solution is found and stops counting if more than one solution is detected to ensure that the puzzle has a unique solution.
function countSolutions(board) {
  let count = 0; // Establishes isolated counting memory indexes to trace complete discovery instances
  function solve() {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValid(board, row, col, num)) {
              board[row][col] = num; // Commits experimental matrix evaluations straight across scratchpad board layout arrays
              solve(); // Directs execution trees to trace deeper layout matching possibilities recursively
              board[row][col] = 0; // Rolls back layout structural state data values to clear matching verification tracks
              if (count > 1) return; // Instantly breaks computing logic streams if layout ambiguities reveal branching duplication faults
            }
          }
          return; // Closes operational scope runs to safely unwind ongoing backtracking calculations
        }
      }
    }
    count++; // Registers and logs single individual complete configuration matching solutions into localized memory
  }
  solve(); // Fires off the internal deep validation solver logic across target array parameters
  return count; // Outputs the absolute aggregate solution count discovered by calculation matrix evaluations
}
// This function digs holes in the completed Sudoku board by randomly selecting cells and clearing their values while ensuring that the resulting puzzle still has a unique solution.
// It continues to dig holes until the desired number of holes is reached or a maximum number of attempts is exceeded to prevent infinite loops in cases where it's difficult to maintain a unique solution.
function digHoles(board, holesToDig) {
  let holesDug = 0; // Initializes operational layout loop metrics tracking success milestones for node clearing
  let attempts = 0; // Records consecutive try counters to safely prevent algorithm stalling boundaries
  while (holesDug < holesToDig && attempts < 200) {
    const row = Math.floor(Math.random() * 9); // Pulls randomized vertical cell tracking targets inside standard grid bounds
    const col = Math.floor(Math.random() * 9); // Selects random horizontal location points along grid space lines
    if (board[row][col] !== 0) {
      const backup = board[row][col]; // Reserves structural board state backup copies to handle restoration fallbacks safely
      board[row][col] = 0; // Sets targeted cell value entries straight to empty values inside configuration spaces
      if (countSolutions(board) === 1) {
        holesDug++; // Ticks success confirmation tracking parameters upward to confirm valid hole generation
      } else {
        board[row][col] = backup; // Recalls historical state metrics data to heal configurations when layout integrity compromises
      }
    }
    attempts++; // Advances execution security loop counters to keep track of total computation steps
  }
}
// --- 5. UI Updates ---
// This function updates the display of remaining lives by modifying the inner text of the element with the ID "lives-count" to reflect the current number of lives left for the player, providing visual feedback on their remaining chances in the game.
function updateLivesDisplay() {
  const livesDisplay = document.getElementById("lives-count"); // Accesses dashboard layout assets tracking user status counts
  if (livesDisplay) livesDisplay.innerText = lives; // Binds current structural counting integer states directly into view windows
}
// This function updates the score display by modifying the inner text of the element with the ID "score-count" to reflect the current score, providing visual feedback on the player's performance and progress in the game.
function updateScoreDisplay() {
  const scoreDisplay = document.getElementById("score-count"); // Get the element that displays the score to update it with the current score value, allowing players to see their score as they play and providing motivation to improve their performance in the game
  if (scoreDisplay) {
    // Check if the score display element exists before trying to update it to prevent errors in case the element is missing from the DOM, ensuring that the function can safely update the score display without causing issues in the game interface
    scoreDisplay.innerText = score; // Commits calculated performance score figures onto output interface labels
  }
}

// This function displays the game over screen by removing the "hidden" class from the Game-over-screen element, allowing players to see the game over message and options when they run out of lives.
function GameOverScreen() {
  const screen = document.getElementById("Game-over-screen"); // Locates HTML template containers containing failure display layers
  clearInterval(timerInterval); // Stop the game timer when the game is over to prevent it from continuing to run after the player has lost, ensuring that the time tracking is accurate and consistent with the game state when the game over screen is displayed

  if (screen) {
    noSound.play(); // Dispatches audio playback queues to execute negative outcome alert sound effects
    screen.classList.remove("hidden"); // Unveils targeted failure display layers directly within application interfaces
    screen.style.display = "flex"; // Ensure the game over screen is displayed as a flex container for proper layout of its contents, providing a visually appealing and organized presentation of the game over message and options for the player when they lose the game
  }
}

// Restructures core system engine metrics variables back to factory values for clean level initializations
function resetGame() {
  score = 0; // Normalizes point tracking performance statistics registers down to baseline zero values
  lives = 3; // Replenishes health resource tracking allocations back to maximum default bounds
  timeSeconds = 0; // Standardizes cumulative gameplay execution timer indexes down to instant zero marks
  moveHistory = []; // Clear the move history stack when resetting the game to ensure that previous moves from the old game do not interfere with the new game, allowing players to start fresh without any carryover of past actions that could affect the integrity of the new game state

  updateLivesDisplay(); // Prompts system interface monitors to sync configuration stats to structural counters
  updateScoreDisplay(); // Triggers display panel re-renders to reflect updated point total changes cleanly

  const numButtons = document.querySelectorAll(".number-btn"); // Pulls down node lists identifying standard number selection keys
  numButtons.forEach((btn) => {
    btn.classList.remove("selected-number", "hidden-number"); // Reset the state of all number buttons by removing both the "selected-number" and "hidden-number" classes to ensure that all buttons are available and none are highlighted or hidden when starting a new game, providing a consistent and fair starting point for the player in the new game session
  });

  const GameOverScreen = document.getElementById("Game-over-screen"); // Captures the UI overlay layer that houses failure messaging templates
  if (GameOverScreen) {
    GameOverScreen.classList.add("hidden"); // Conceals failure interface elements inside layout configurations safely
    GameOverScreen.style.display = "none"; // Hide the game over screen when resetting the game to allow players to start a new game without the game over message obstructing the view, providing a seamless transition back to the game interface for a fresh start
  }

  const winScreen = document.getElementById("win-screen"); // Queries document elements to capture victory summary dashboard cards
  if (winScreen) {
    winScreen.classList.add("hidden"); // Pushes victory screen overlays into hidden background processing fields
    winScreen.style.display = "none"; // Hide the win screen when resetting the game to allow players to start a new game without the win message obstructing the view, providing a seamless transition back to the game interface for a fresh start
  }

  renderBoard(initialBoard); // Runs board rendering processes utilizing archived initial starting layouts
  updateNumberButtons(); // Update the number buttons to reflect the initial state of the board after resetting the game, hiding any numbers that are already fully placed in the clues to prevent players from selecting numbers that are already completed in the puzzle right from the start of the new game session
  startTimer(); // Initializes background timing scripts to trace ongoing performance speed metrics

  selectedNumber = null; // Unsets temporary tracking references mapping chosen number selections
  document.querySelectorAll(".number-btn").forEach((btn) => {
    btn.classList.remove("selected-number"); // 2. Removes the blue highlight from the button
  });
  document.getElementById("clear").classList.remove("selected-number"); // 3. Removes the blue highlight from the clear button
  highlightAll(""); // Clears any highlights off the board cells
}
// This function implements the undo functionality by popping the last move from the move history stack and restoring the cell's value and classes to their previous state, allowing players to revert their last action and correct mistakes without affecting the overall game state or losing progress.
function undo() {
  if (moveHistory.length === 0) return; // Aborts backup extraction processes instantly if history tracking arrays sit empty

  // Get the last move from the stack
  const lastMove = moveHistory.pop(); // Retrieve the last move, which contains the cell reference, previous value, and previous classes to allow accurate restoration of the cell's state when undoing a move
  const cell = lastMove.cell; // Get the cell reference from the last move to identify which cell needs to be restored to its previous state when undoing the last action performed by the player

  // Restore value
  cell.value = lastMove.prevValue; // Restores original inner values back into the target input cell workspace container

  // Restore classes
  cell.className = ""; // Clear current classes
  lastMove.prevClass.forEach((cls) => cell.classList.add(cls)); // Iterates through old style sheets lists appending properties sequentially onto elements

  highlightAll(selectedNumber); // Update highlights after undoing the move to ensure that the visual feedback on the board is consistent with the current state of the game, allowing players to see the correct highlights based on their current selection and the restored state of the board after undoing a move
  updateNumberButtons(); // Update the number buttons to reflect the new state of the board after undoing a move, ensuring that any numbers that are now fully placed in the clues are hidden again to prevent players from selecting numbers that are already completed in the puzzle, maintaining consistency between the board state and the available number options for the player
}
// This function highlights all cells that contain the same number as the currently selected number by adding a specific CSS class to those cells. It first removes the highlight from all cells to ensure that only the relevant cells are highlighted based on the current selection.
function highlightAll(targetNumber, clickedCell) {
  // 1. Select all 81 input cells and convert the list into a true Array
  const allInputs = Array.from(document.querySelectorAll("#sudoku-game input"));

  // 2. Clear out any old highlights before we draw the new ones
  allInputs.forEach(
    (input) => input.classList.remove("highlight-same", "highlight-crosshair"), // Clears existing active color indicator classes from individual input containers
  );

  // 2. Logic for the "Crosshair" (Replaces all that code you just showed me)
  if (clickedCell) {
    const clickedIndex = allInputs.indexOf(clickedCell); // Looks up relative array coordinates tracking where the user clicked along layout boundaries
    const targetRow = Math.floor(clickedIndex / 9); // Figures out line indexing parameters evaluating horizontal grid alignment states
    const targetCol = clickedIndex % 9; // Establishes individual vertical column positioning parameters over the selected asset

    // We call the helper and tell it to light up every cell it finds
    getAffectedCells(targetRow, targetCol).forEach((cell) => {
      cell.classList.add("highlight-crosshair"); // Pins visual guiding intersection accent highlights onto linked row/column items
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
        input.classList.add("highlight-same"); // Pencils background highlight accent classes onto active grid cell containers
      }
    });
  }
}
// Computes active number counts remaining open on the field to switch interface visibility states dynamically
function updateNumberButtons() {
  const allInputs = Array.from(document.querySelectorAll("#sudoku-game input")); // Packs the total matrix arrangement of grid fields into iterable local lists
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }; // Establishes dedicated local data tracking maps tracking instances found on the board

  allInputs.forEach((input) => {
    const val = input.value; // Safely harvests string entries loaded into separate box slots
    if (
      val && // Validates whether structural cell containers currently hold true text values
      !input.classList.contains("small-text") && // Insures checking loops bypass simple user pencil markup notations
      !input.classList.contains("error") // Avoids evaluating data sitting inside cell blocks currently showing bad entry flags
    ) {
      if (val.length === 1) {
        counts[val]++; // Adjusts mapping registers to accumulate counts for specific found numbers
      }
    }
  });
  const numButtons = document.querySelectorAll(".number-btn"); // Pulls arrays tracking structural number buttons on the player dashboard
  numButtons.forEach((btn) => {
    const num = btn.getAttribute("data-number"); // Pulls target identification data tokens from individual button object scopes
    const remaining = 9 - counts[num]; // Figures differences evaluating how many copies of numbers remain to hide or clear
    const badge = btn.querySelector(".count-badge"); // Looks up internal visual counter badge tags resting within button components

    if (badge) {
      badge.innerText = remaining; // Populates badge layout strings to present remaining allocations left to enter
    }

    if (remaining <= 0) {
      if (!btn.classList.contains("hidden-number")) {
        dnumSound.play(); // Dispatches success audio track players to confirm set completions loudly
        triggerNumberPop(num); // Trigger animation when a number is fully placed in the clues, providing a celebratory visual effect to reward the player for completing that number in the puzzle and enhancing the overall gaming experience with positive feedback for their progress
        if (selectedNumber === num) {
          highlightAll(""); // Cleans highlights down to clean slates when chosen values complete entirely
          let nextNum = null; // Instantiates local memory pointers to discover next eligible selection options
          const allBtns = Array.from(document.querySelectorAll(".number-btn")); // Packs individual keypad control element sets into flat arrays

          for (let i = 1; i <= 9; i++) {
            let checkNum = ((parseInt(num) + i - 1) % 9) + 1; // Generates sequential wrapping numeric indexing keys to evaluate next options loop-wise
            let checkBtn = document.querySelector(
              `.number-btn[data-number="${checkNum}"]`, // Identifies interface keypad buttons associated with evaluated target numbers
            );

            if (checkBtn && !checkBtn.classList.contains("hidden-number")) {
              nextNum = checkNum.toString(); // Records target valid available keypad options straight to execution pointers
              break; // Snaps open control sequence iteration loops early once eligible values arise
            }
          }
          if (nextNum) {
            const nextBtn = document.querySelector(
              `.number-btn[data-number="${nextNum}"]`, // Re-targets interface keypad controllers mapping to discovered ready choices
            );
            nextBtn.click(); // Triggers automated programmatic click actions to switch selections smoothly
          } else {
            selectedNum = null; // Unsets numeric pointer tracks to protect system runtime integrity
            btn.classList.remove("selectedNumber"); // Cleans focus background accents away from the active keypad item frame
          }
        }
      }
      btn.classList.add("hidden-number"); // Appends active masking classes onto completed number controls to pull them out of play fields
    } else {
      btn.classList.remove("hidden-number"); // restructures layout rules to return keys back to active availability fields
    }
  });
}

// Gathers row, column, and sub-block input intersections passing arrays out to mapping filters
function getAffectedCells(row, col) {
  const allInputs = Array.from(document.querySelectorAll("#sudoku-game input")); // Isolates full listings containing the 81 layout blocks inside arrays
  const startRow = Math.floor(row / 3) * 3; // Locates baseline horizontal tracking offsets for internal 3x3 sectors
  const startCol = Math.floor(col / 3) * 3; // Locates baseline vertical bounding headers for matching 3x3 zones

  return allInputs.filter((_, index) => {
    const r = Math.floor(index / 9); // Converts running cell list indices down into precise row numbers
    const c = index % 9; // Converts flat list indexing coordinates into structural column variables
    return (
      r === row || // Checks cell alignments verifying row level identity comparisons pass
      c === col || // Evaluates layout indices confirming column plane equality holds true
      (r >= startRow && r < startRow + 3 && c >= startCol && c < startCol + 3) // Matches local blocks checking sector coordinates inside the active 3x3 matrix block
    );
  });
}
// Automatically wipes out matching small candidate note values from row, column, and 3x3 box zones when a final number is successfully locked in
function removeSmallNumbers(row, col, placedNumber) {
  const numStr = placedNumber.toString(); // Casts the placed integer number directly into a text string representation for string matching operations
  const affected = getAffectedCells(row, col); // Leverages structural grid index functions to isolate all cell DOM element nodes sharing the same lines or box zone
  affected.forEach((cell) => {
    // Evaluates whether the currently scanned board cell contains active user candidate pencil notations
    if (cell.classList.contains("small-text")) {
      cell.value = cell.value.replace(numStr, ""); // Remove the placed number from the candidate markings in the affected cells to maintain consistency with Sudoku rules and provide a clearer visual representation of remaining candidate numbers for the player after placing a correct number in the puzzle
      if (cell.value === "") {
        cell.classList.remove("small-text"); // If there are no more candidate numbers left in the cell after removing the placed number, remove the "small-text" class to reflect that there are no more candidates for that cell, providing accurate visual feedback to the player on the current state of the cell's candidate markings in the Sudoku puzzle
      }
    }
  });
}
// Utility time-formatting routine that translates a raw tracking integer of seconds into a standard digital display format string
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60); // Devotes an absolute division step to break total accumulative seconds down into complete whole minutes
  const secs = seconds % 60; // Computes the modulus remainder to evaluate trailing residual seconds left inside the minute interval block
  return `${mins}:${secs.toString().padStart(2, "0")}`; // Structures and returns a template literal string keeping secondary digits constantly at a minimum length of two characters
}

// Spawns background system interval execution procedures designed to track the time duration of active gaming levels
function startTimer() {
  clearInterval(timerInterval); // Clear any existing timer interval to prevent multiple timers from running simultaneously, ensuring that the time tracking is accurate and consistent when starting a new game or resetting the timer
  timeSeconds = 0; // flattens master stopwatch integer state metrics down to baseline initialization limits

  const timerDisplay = document.getElementById("time-count"); // Acquires the document text container reference tasked with displaying session elapsed time metrics
  timerInterval = setInterval(() => {
    timeSeconds++; // Advances global running second counters step-by-step each time a new programmatic execution frame updates

    const mins = Math.floor(timeSeconds / 60); // Extracts whole integer quantities defining complete minutes spent on the board puzzle
    const secs = timeSeconds % 60; // Resolves structural clock remainder math to separate single-digit trailing seconds components cleanly

    if (timerDisplay) {
      timerDisplay.innerText = `${mins}:${secs.toString().padStart(2, "0")}`; // Updates visual interface labels using zero-padded string layout rules to project matching times
    }
  }, 1000); // Forces structural background clock ticking loops to recycle continuously at one-second cycle steps
}

// Scans the active status of all game inputs across the interface canvas board to verify level completion milestones
function checkwin() {
  const allInputs = Array.from(document.querySelectorAll("#sudoku-game input")); // Aggregates the collection of 81 grid block element targets directly into a true utility matrix array
  const isComplete = allInputs.every(
    (input) => input.value !== "" && !input.classList.contains("error"), // Inspects all array elements checking that every container holds active values missing error flag classes
  );

  if (isComplete) {
    showWinScreen(); // Hands program flow execution controls over to layout scripts responsible for triggering victory interface wrappers
  }
}

// Renders successful gameplay result overlays across screen layouts when users resolve full boards cleanly
function showWinScreen() {
  const screen = document.getElementById("win-screen"); // Targets the core container node element housing the victory summary layout overlay structures
  clearInterval(timerInterval); // Stop the game timer when the player wins to prevent it from continuing to run after the game is completed, ensuring that the time tracking is accurate and consistent with the game state when the win screen is displayed

  triggerAnim(); // Fires up specialized third-party programmatic library particle simulations to celebrate level completion milestones

  document.getElementById("final-time").innerText = formatTime(timeSeconds); // Update the final time display on the win screen to reflect the total time taken by the player to solve the puzzle, providing feedback on their performance and rewarding them for their achievement in completing the puzzle within a certain time frame
  document.getElementById("final-score").innerText = score; // Update the final score display on the win screen to reflect the player's score at the time of winning, providing feedback on their performance and rewarding them for their achievement in completing the puzzle
  document.getElementById("final-lives").innerText = lives; // Sets the text content of the victory review screen label to showcase the number of safety lives remaining intact
  if (screen) {
    setTimeout(() => {
      boiSound.play(); // Dispatches the designated audio source element playback pipeline to announce victory events auditively
      screen.classList.remove("hidden"); // Drops spatial layout concealment style instructions away from the core winning container panel wrapper
      screen.style.display = "flex"; // Ensure the win screen is displayed as a flex container for proper layout of its contents, providing a visually appealing and organized presentation of the win message and options for the player when they successfully complete the game
    }, 1000); // Spaces out victory UI arrivals by establishing a fixed full-second delay sequence buffer following final cell evaluation drops
  }
}

// Triggers brief visual bounce/pop feedback style modifications over elements on the grid that match specific input conditions
function triggerNumberPop(num) {
  const allInputs = document.querySelectorAll("#sudoku-game input"); // Gathers the absolute collection nodes listing all 81 individual text boxes in the playground
  allInputs.forEach((input) => {
    if (input.value == num) {
      input.classList.add("number-pop"); // Pins customized CSS keyframe transformation selector flags straight onto qualifying structural elements
      setTimeout(() => {
        input.classList.remove("number-pop"); // Strips animation layout utility classes off field containers once keyframe transformation duration limits pass
      }, 600); // Schedules automatic component styling reset operations to run right at the six-hundred millisecond threshold
    }
  });
}

// Pulls down open difficulty selection bottom drawers while managing the closure of underlying failure or victory views
function showDifficultyMenu() {
  document.getElementById("Game-over-screen").style.display = "none"; // Forces failure review screen views out of workspace rendering layers
  document.getElementById("win-screen").style.display = "none"; // Hard-collapses victory screen summary wrappers to clear drawing areas completely

  const mainm = document.getElementById("main-menu"); // Isolates references pointing straight to the master home landing menu container frame element

  const difficultyMenu = document.getElementById("difficulty-menu"); // Pinpoints the modal container structural element node housing complexity choice buttons
  difficultyMenu.classList.remove("hidden"); // Excludes traditional concealment display rules out of active modal style collection properties
  difficultyMenu.style.display = "flex"; // Applies flex layout visibility modifiers over target modal containers to reveal them clearly
}

// Configures and launches a continuous multi-directional particle confetti flow simulation inside game windows
function triggerAnim() {
  const duration = 5 * 1000; // Calculates absolute performance tracking limits specifying five full seconds of total simulation runtime bounds
  const endAnim = Date.now() + duration; // Maps a future system timestamp benchmark to mark where simulation loops must cease execution
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }; // Normalizes base vector configurations steering physics properties of particle nodes

  // Generates randomized floating-point values within an explicit floor and ceiling value range boundary
  function rndInRange(min, max) {
    return Math.random() * (max - min) + min; // Computes standard mathematical random distribution scaling algorithms across specified ranges
  }

  const interval = setInterval(function () {
    const timeLeft = endAnim - Date.now(); // Figures current performance countdown limits comparing future stop markers against the local clock

    if (timeLeft <= 0) {
      return clearInterval(interval); // Destroys running execution interval loops immediately once duration limits run entirely down to zero bounds
    }
    const particalCount = 50 * (timeLeft / duration); // Dynamically scales total particle deployment metrics down as simulations near completion thresholds
    // Drops particle animation explosions targeting coordinates clustered along the left boundary areas of layout screens
    confetti({
      ...defaults, // Injects generic operational baseline configuration properties into execution context parameters
      particalCount, // Passes down computed dynamic quantity density measurements to feed the active rendering cycle frame
      origin: { x: rndInRange(0.1, 0.3), y: Math.random() - 0.2 }, // Evaluates specific localized x/y coordinate origins to guide emission launch tracks
    });
    // Fires particle simulation explosions centered over layout coordinates mapping along the right section of windows
    confetti({
      ...defaults, // Bundles default movement parameters directly over into individual target script properties templates
      particalCount, // Connects the computed time-faded density scaling limit constraints to local parameters profiles
      origin: { x: rndInRange(0.7, 0.9), y: Math.random() - 0.2 }, // Directs script handlers to spawn emissions across right-side screen quadrants
    });
  }, 250); // Commands rendering routine triggers to recur cyclically every two hundred and fifty milliseconds throughout execution loops
}
// Inspects lines, columns, or 3x3 local subgrid containers to trace section completions and fires staggered ripple animations
function checkSecCompletion(row, col) {
  const inputs = Array.from(document.querySelectorAll("#sudoku-game input")); // Compiles the absolute structure listing of 81 grid blocks into a standard utility list array
  const rStart = Math.floor(row / 3) * 3; // Locates baseline horizontal row coordinate markers bounding the boundaries of 3x3 box clusters
  const cStart = Math.floor(col / 3) * 3; // Evaluates vertical column offset index rules determining 3x3 quadrant cluster starts

  const isRowFull = [...Array(9)].every(
    (_, i) => inputs[row * 9 + i].value !== "", // Validates whether every structural element alignment index mapping across the specified horizontal row tracks true values
  );
  const isColFull = [...Array(9)].every(
    (_, i) => inputs[i * 9 + col].value !== "", // Evaluates column indices across vertical counting structures to verify all entry states contain strings
  );

  const isBoxFull = [...Array(9)].every((_, i) => {
    const r = rStart + Math.floor(i / 3); // Resolves specific row matrix index calculations mapping sequential steps into regional 3x3 frames
    const c = cStart + (i % 3); // Extracts matched column data points bounding regional structural coordinates within 3x3 subgrids
    return inputs[r * 9 + c].value !== ""; // Returns logical verification success values if examined block slot indexes possess text strings
  });
  //helps with ripple delay
  // Handles delayed timing calculation rules to sequence staggered grid row/column animation pulses outwards
  const animDelay = (targetRow, targetCol) => {
    const cell = inputs[targetRow * 9 + targetCol]; // Pinpoints specific targeted grid item box references resting inside absolute tracking lists
    //calculate the distance from the placed number to create timing
    const distance = Math.abs(row - targetRow) + Math.abs(col - targetCol); // Derives coordinate step metrics offsets across axes utilizing absolute Manhattan distance equations
    const delay = distance * 90; //90ms per step forward

    setTimeout(() => {
      cell.classList.add("animate-complete"); // Appends customized structural highlight animation classes over target layout element structures
      setTimeout(() => cell.classList.remove("animate-complete"), 1000); // Clears structural highlighting classes away from style lists after a fixed full-second lifecycle duration passes
    }, delay); // Executes the inner scheduled animation triggers using calculated distance-scaled timing delays
  };

  for (let i = 0; i < 9; i++) {
    if (isRowFull) animDelay(row, i); // Cascades animation timing sequences sideways across rows if full row-completion tracks confirm true
    if (isColFull) animDelay(i, col); // Directs animation timing frames down column chains if column completion evaluation pipelines pass clean checks
    if (isBoxFull) {
      const r = rStart + Math.floor(i / 3); // Derives row coordinate identities across sub-box iteration indexing steps
      const c = cStart + (i % 3); // Pinpoints column coordinates mapped within the targeted regional quadrant block matrix
      animDelay(r, c); // Commands animation steps to fire sequentially over target elements located within full completed blocks
    }
  }
}
