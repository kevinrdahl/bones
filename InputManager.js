var InputManager = {};

InputManager.MOUSE_DRAG_MIN = 2;

//big long ugly method of woe
InputManager.createInputManager = function (element) {
	var m = {
		getMouseCoords: function(e) {
			var elementX = this.element.offsetLeft;
			var elementY = this.element.offsetTop;
			var x = e.clientX - elementX;
			var y = e.clientY - elementY;
			return [x,y];
		},
		onMouseDown: function(e) {
			InputManager.fixWhich(e);
			var mouseCoords = this.getMouseCoords(e);
			if (e.which == 1) {
				//left mouse
				this.leftMouseDownCoords = mouseCoords;
				this.leftMouseIsDown = true;
				this.leftClickDown(mouseCoords);
			}
		},
		onMouseUp: function(e) {
			InputManager.fixWhich(e);
			var mouseCoords = this.getMouseCoords(e);
			if (e.which == 1) {
				//left mouse up
				this.leftClickUp(mouseCoords);
				this.leftMouseIsDown = false;
				this.leftMouseDragging = false;
			} else if (e.which == 3) {
				this.rightClick();
			}
		},
		onMouseMove: function(e) {
			var mouseCoords = this.getMouseCoords(e);
			if (this.leftMouseIsDown) {
				if (Math.abs(mouseCoords[0]-this.leftMouseDownCoords[0]) > InputManager.MOUSE_DRAG_MIN || Math.abs(mouseCoords[1]-this.leftMouseDownCoords[1]) > InputManager.MOUSE_DRAG_MIN) {
					this.leftMouseDragging = true;
					this.leftClickMove(mouseCoords);
				}
			}
		},
		onKeyDown: function(e) {
			this.pressed[e.keyCode] = true;
		},
		onKeyUp: function(e) {
			this.pressed[e.keyCode] = false;
		},
		leftClickDown: InputManager.doNothing,
		leftClickUp: InputManager.doNothing,
		rightClick: InputManager.doNothing,
		leftClickMove: InputManager.doNothing
	};
	m.element = element;

	var keys = new Object();
	var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	for (var i = 0; i < 26; i++) {
		keys[alphabet.charAt(i)] = i+65;
	}
	keys['SHIFT'] = 16;
	keys['CRTL'] = 17;
	keys['ALT'] = 18;
	keys['LEFT'] = 37;
	keys['UP'] = 38;
	keys['RIGHT'] = 39;
	keys['DOWN'] = 40;

	var pressed = [];
	for (key in keys) {
		pressed[keys[key]] = false;
	}

	m.keys = keys;
	m.pressed = pressed;

	m.leftMouseIsDown = false;
	m.leftMouseDownCoords = [-1.-1];
	m.leftMouseDragging = false;

	element.inputManager = m;

	element.oncontextmenu = function () {return false;};
	element.onclick = function(e) {e.preventDefault(); e.defaultPrevented = true; e.stopPropagation(); return false;};

	element.addEventListener('mousedown', function(e) {this.inputManager.onMouseDown(e);}, false);
	element.addEventListener('mouseup', function(e) {this.inputManager.onMouseUp(e);}, false);
	element.addEventListener('mousemove', function(e) {this.inputManager.onMouseMove(e);}, false);
	element.addEventListener('keydown', function(e) {this.inputManager.onKeyDown(e);}, false);
	element.addEventListener('keyup', function(e) {this.inputManager.onKeyUp(e);}, false);

	return m;
};


InputManager.fixWhich = function(e) {
  if (!e.which && e.button) {
    if (e.button & 1) e.which = 1      // Left
    else if (e.button & 4) e.which = 2 // Middle
    else if (e.button & 2) e.which = 3 // Right
  }
};

InputManager.doNothing = function() {
	//nuffin bruv
}