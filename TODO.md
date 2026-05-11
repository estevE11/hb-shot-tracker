# Handball Shot Tracker Improvements

## 1. Shot Registration Feedback & Management
- [ ] **Visual Feedback:** Add a point counter (e.g., "Point 1/3") or visual indicator on the canvas/UI to show how many points have been registered for the current shot.
- [ ] **Shot List:** Add a list of shots for the currently selected player below the player button grid.
- [ ] **Shot Interaction:** 
    - [ ] Highlight shot on canvas when selected in the list.
    - [ ] Add ability to delete a shot from the list.

## 2. Team & Player Management
- [ ] **Edit Teams:** Add functionality to edit existing teams (name and player numbers).
- [ ] **Validation:** Ensure editing doesn't break existing shot associations (though using player numbers as identifiers might be tricky if they change).

## 3. Goal/Save Confirmation UI
- [ ] **In-Canvas Popup:** Replace automatic goal detection with a manual confirmation popup (Goal vs. Save) after the 3rd point is placed.
- [ ] **Trigger Logic:** Only show if the 3rd point is within the "net" area.

## 4. Technical Improvements
- [ ] **Code Structure:** Refactor `menu.js` to reduce large HTML strings in JS (consider templates or small helper functions).
- [ ] **State Management:** Formalize the `AppState` transitions to avoid inconsistent UI states.
- [ ] **Canvas Rendering:** Optimize the render loop (only re-render when state changes instead of `requestAnimationFrame` constantly if performance is an issue).
- [ ] **ID Management:** Ensure player identification is robust if numbers are edited.
- [ ] **Error Handling:** Add more user-friendly error messages for database failures.
