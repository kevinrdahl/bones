var canvas = document.getElementById("display");
canvas.setAttribute("tabindex", 0);
var context = canvas.getContext("2d");

var canvasWidth;
var canvasHeight;
setCanvasSize();
window.onresize = setCanvasSize();

/*======
CONTROLS
======*/
document.oncontextmenu = function () {return false;};
document.onclick = function(e) {e.preventDefault(); e.defaultPrevented = true; e.stopPropagation(); return false;};


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

var MOUSE_DRAG_MIN = 2;
var mouseIsDown = false;
var mouseDragging = false;
canvas.addEventListener('mousedown', onMouseDown, false);
canvas.addEventListener('mouseup', onMouseUp, false);
canvas.addEventListener('mousemove', onMouseMove, false);
canvas.addEventListener('keydown', onKeyDown, false);
canvas.addEventListener('keyup', onKeyUp, false);

function onMouseDown(e) {
	fixWhich(e);
	
	var canvasX = canvas.offsetLeft;
	var canvasY = canvas.offsetTop;
	
	var x = e.clientX - canvasX;
	var y = e.clientY - canvasY;
	
	if (e.which == 1) {
		//left mouse
		mouseDownCoords = [x,y];
		mouseIsDown = true;
	}
}

function onMouseUp(e) {
	fixWhich(e);
	
	if (e.which == 1) {
		//left mouse up
		if (mouseDragging) {
			leftClickDrag();
		} else {
			leftClick();
		}
		mouseIsDown = false;
		mouseDragging = false;
	} else if (e.which == 3) {
		rightClick();
	}
}

function onMouseMove (e) {
	fixWhich(e);
	var canvasX = canvas.offsetLeft;
	var canvasY = canvas.offsetTop;
	mouseCoords = [e.clientX-canvasX, e.clientY-canvasY];
	
	if (mouseIsDown) {
		if (Math.abs(mouseCoords[0]-mouseDownCoords[0]) > MOUSE_DRAG_MIN || Math.abs(mouseCoords[1]-mouseDownCoords[1]) > MOUSE_DRAG_MIN) {
			mouseDragging = true;
		}
	}
}

function leftClick() {
	console.log('left click');
}

function rightClick() {
	console.log('right click');
}

function leftClickDrag() {
	console.log('left click drag');
}

function onKeyDown (e) {
	pressed[e.keyCode] = true;
}

function onKeyUp (e) {
	pressed[e.keyCode] = false;
}

function fixWhich(e) {
  if (!e.which && e.button) {
    if (e.button & 1) e.which = 1      // Left
    else if (e.button & 4) e.which = 2 // Middle
    else if (e.button & 2) e.which = 3 // Right
  }
}

function input(form) {
	console.log(form.stuff.value);
}

/*=======
ANIMATION
=======*/
var bones = {
	bone0:newBone([200,300],270,100,null,['bone1','bone2']),
	bone1:newBone(null,90,100,'bone0',['bone3']),
	bone2:newBone(null,270,100,'bone0',[]),
	bone3:newBone(null,90,50,'bone1',[])
};

var keyframes = {
	bone0:[{frame:0, angle:270}, {frame:30, angle:0}]
}

var frame = 0;
var numFrames = 60;

var nextTick = new Date().getTime()+33;
onTick();

function onTick() {
	drawFrame();

	setTick();
}

function setTick() {
	var wait = nextTick - new Date().getTime();
	if (wait < 0) {
		wait = 0;
	}
	setTimeout(onTick,wait);
	nextTick += 33;
}

function drawFrame() {
	context.clearRect(0,0,canvasWidth, canvasHeight);

	for (name in bones) {
		if (bones[name].parent == null) {
			poseBones(bones[name],0);
		}
	}

	context.strokeStyle = '#000000';
	
	for (name in bones) {	
		var bone = bones[name];
		
		context.beginPath()	
		context.moveTo(bone.coords[0], bone.coords[1]);
		context.lineTo(bone.endcoords[0], bone.endcoords[1]);
		context.stroke();
		
		context.beginPath()	
		context.arc(bone.endcoords[0], bone.endcoords[1], 3, 0, 2*Math.PI);
		context.stroke();
		
		if (bone.parent == null) {
			context.beginPath()	
			context.arc(bone.coords[0], bone.coords[1], 3, 0, 2*Math.PI);
			context.stroke();
		}
	}
}

function poseBones(bone, parentAngle) {
	bone.angle++;
	bone.endcoords = LinAlg.pointOffset(bone.coords, bone.angle+parentAngle, bone.len);
	for (var i = 0; i < bone.children.length; i++) {
		var child = bones[bone.children[i]];
		child.coords = bone.endcoords;
		poseBones(child,bone.angle+parentAngle);
	}
}

function newBone(coords, angle, len, parent, children) {
	return {coords:coords, angle:angle, len:len, parent:parent, children:children};
}

function setCanvasSize() {
	var outer = document.getElementById('displayouter');
	canvasWidth = outer.clientWidth;
	canvasHeight = outer.clientHeight;
	canvas.width = canvasWidth;
	canvas.height = canvasHeight;

	console.log('canvas size: ' + canvasWidth + 'x' + canvasHeight);
}
