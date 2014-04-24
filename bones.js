var canvas = document.getElementById("display");
canvas.setAttribute("tabindex", 0);
var context = canvas.getContext("2d");

var canvasWidth;
var canvasHeight;
setCanvasSize();
window.onresize = setCanvasSize();

var imgPrefix = 'http://kevinstuff.net/img/'; //var imgPrefix = 'img/';
var imageList = ['bone.png'];
var images = new Object();
var numLoaded = 0;

function imageLoaded () {
	var str = this.src.substring(imgPrefix.length);
	images[str][0] = true;
	numLoaded++;
	if (numLoaded == imageList.length) {
		loadComplete();
	}
}

function loadImages() {
	console.log('loading images');
	for (var i = 0; i < imageList.length; i++) {
		var image = new Image();
		image.onload = imageLoaded;
		images[imageList[i]] = [false, image];
		image.src = imgPrefix + imageList[i];
	}
}

function loadComplete() {
	nextTick = new Date().getTime()+33;
	onTick();
}

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
var leftMouseIsDown = false;
var leftMouseDownCoords = [-1.-1];
var leftMouseDragging = false;
canvas.addEventListener('mousedown', onMouseDown, false);
canvas.addEventListener('mouseup', onMouseUp, false);
canvas.addEventListener('mousemove', onMouseMove, false);
canvas.addEventListener('keydown', onKeyDown, false);
canvas.addEventListener('keyup', onKeyUp, false);

function getMouseCoords (e) {
	var canvasX = canvas.offsetLeft;
	var canvasY = canvas.offsetTop;
	var x = e.clientX - canvasX;
	var y = e.clientY - canvasY;
	return [x,y];
}

function onMouseDown(e) {
	fixWhich(e);
	var mouseCoords = getMouseCoords(e);
	
	if (e.which == 1) {
		//left mouse
		leftMouseDownCoords = mouseCoords;
		leftMouseIsDown = true;
		leftClickDown(mouseCoords);
	}
}

function onMouseUp(e) {
	fixWhich(e);
	var mouseCoords = getMouseCoords(e);
	
	if (e.which == 1) {
		//left mouse up
		leftClickUp(mouseCoords);
		leftMouseIsDown = false;
		leftMouseDragging = false;
	} else if (e.which == 3) {
		rightClick();
	}
}

function onMouseMove (e) {
	mouseCoords = getMouseCoords(e);
	
	if (leftMouseIsDown) {
		if (Math.abs(mouseCoords[0]-leftMouseDownCoords[0]) > MOUSE_DRAG_MIN || Math.abs(mouseCoords[1]-leftMouseDownCoords[1]) > MOUSE_DRAG_MIN) {
			leftMouseDragging = true;
			leftClickMove(mouseCoords);
		}
	}
}

function leftClickDown (mouseCoords) {
	for (name in bones) {
		var bone = bones[name];
		if (LinAlg.pointDist(mouseCoords,bone.endcoords) <= 5) {
			clickedBone = name;
			break;
		}
	}
	if (LinAlg.pointDist(mouseCoords,origin) <= 5) {
		clickedBone = 'origin';
	}

	switch (tool) {
		case 'add':
			if (clickedBone != null) {
				var name = 'bone' + boneNum++;
				bones[name] = newBone(0,1,clickedBone,[],false,'bone.png');
				if (clickedBone == 'origin') {
					bones[name].coords = origin;
				} else {
					bones[name].coords = bones[clickedBone].endcoords;
					bones[clickedBone].children.push(name);
				}
				clickedBone = name;
			}
			break;
	}
}

function leftClickUp (mouseCoords) {
	switch (tool) {
		case 'delete':
			if (clickedBone != null && LinAlg.pointDist(mouseCoords,leftMouseDownCoords) <= MOUSE_DRAG_MIN) {
				deleteBone(clickedBone);
			}
	}

	clickedBone = null;
}

function leftClickMove (mouseCoords) {
	switch(tool) {
		case 'angle':
			if (clickedBone == 'origin') {
				origin = mouseCoords;
			} else if (clickedBone != null) {
				var bone = bones[clickedBone];
				bone.angle = LinAlg.pointAngle(bone.coords,mouseCoords);
			}
			break;
		case 'add':
			if (clickedBone != null) {
				var bone = bones[clickedBone];
				bone.angle = LinAlg.pointAngle(bone.coords,mouseCoords);
				bone.len = LinAlg.pointDist(bone.coords,mouseCoords);
			}
	}
	
}

function rightClick () {
	console.log('right click');
}

function leftClickDrag () {
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
var origin = [300,300];
var skeletonAngle = 0;
var clickedBone = null;
var tool = 'angle';
var boneNum = 0;

var bones = {
	chest:newBone(270,150,'origin',['head','shoulderleft','shoulderright'],false,'bone.png'),
	head:newBone(270,50,'chest',[],false,'bone.png'),
	
	legleft1:newBone(110,80,'origin',['legleft2'],false,'bone.png'),
	legleft2:newBone(95,80,'legleft1',['footleft'],false,'bone.png'),
	footleft:newBone(180,20,'legleft2',[],false,'bone.png'),
	
	legright1:newBone(70,80,'origin',['legright2'],false,'bone.png'),
	legright2:newBone(85,80,'legright1',['footright'],false,'bone.png'),
	footright:newBone(0,20,'legright2',[],false,'bone.png'),
	
	shoulderleft:newBone(160,45,'chest',['armleft1'],false,'bone.png'),
	armleft1:newBone(100,70,'shoulderleft',['armleft2'],false,'bone.png'),
	armleft2:newBone(90,65,'armleft1',[],false,'bone.png'),
	
	shoulderright:newBone(20,45,'chest',['armright1'],false,'bone.png'),
	armright1:newBone(80,70,'shoulderright',['armright2'],false,'bone.png'),
	armright2:newBone(90,65,'armright1',[],false,'bone.png')
};

function setTool(which) {
	clickedBone = null; //probably not needed but who knows
	tool = which;

	console.log(which);
}

var frame = 0;
var numFrames = 60;

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
		if (bones[name].parent == 'origin') {
			bones[name].coords = origin;
			poseBones(bones[name]);
		}
	}

	context.strokeStyle = '#000000';
	
	for (name in bones) {
		drawBone(bones[name]);
	}
	context.strokeStyle = '#FF0000';
	context.beginPath()	
	context.arc(origin[0], origin[1], 3, 0, 2*Math.PI);
	context.stroke();
}

//poses the specified bone and then recursively poses its children, if it has any
function poseBones(bone) {
	var angle = bone.angle+skeletonAngle;
	if (bone.rigid) {
		angle += bones[bone.parent].angle;
	}
	bone.finalangle = angle;
	
	bone.endcoords = LinAlg.pointOffset(bone.coords, angle, bone.len);
	for (var i = 0; i < bone.children.length; i++) {
		var child = bones[bone.children[i]];
		child.coords = bone.endcoords;
		poseBones(child);
	}
}

function drawBone(bone) {
	//image
	if (bone.image != null) {
		if (images[bone.image][0]) {
			var image = images[bone.image][1];
			var midpoint = LinAlg.midPoint(bone.coords,bone.endcoords);
			drawImageRotated(image,midpoint[0],midpoint[1],bone.len,bone.len/3,bone.finalangle);
		}
	}

	//wireframe
	context.beginPath();
	context.moveTo(bone.coords[0], bone.coords[1]);
	context.lineTo(bone.endcoords[0], bone.endcoords[1]);
	context.stroke();
	
	context.beginPath()	
	context.arc(bone.endcoords[0], bone.endcoords[1], 3, 0, 2*Math.PI);
	context.stroke();
}

function newBone(angle, len, parent, children, rigid, image) {
	return {angle:angle, len:len, parent:parent, children:children, rigid:rigid, image:image, transforms:{rotation:[]}};
}

function setBoneParent(bonename, parentname) {
	if (bone.parent != null) {
		delete bones[bone.parent].children[bonename];	
	}
	var bone = bones[bonename];
	var parent = bones[parentname];
	
	parent.children.push(bonename);
	bone.parent = parentname;
}

//deletes a bone, and then recursively deletes its children
function deleteBone(name) {
	var bone = bones[name];
	if (bone.parent != 'origin') {
		var parent = bones[bone.parent];
		parent.children.splice(parent.children.indexOf(name), 1);
	}
	while (bone.children.length > 0) {
		deleteBone(bone.children[0]);
	}
	delete bones[name];
}

//angle is degrees
function drawImageRotated(image, x, y, w, h, angle) { 
	context.save();
	context.translate(x, y);
	context.rotate(LinAlg.toRadians(angle));
	context.drawImage(image, -w/2, -h/2, w, h); //x,y,w,h
	context.restore(); 
}

function setCanvasSize() {
	var outer = document.getElementById('displayouter');
	canvasWidth = outer.clientWidth;
	canvasHeight = outer.clientHeight;
	canvas.width = canvasWidth;
	canvas.height = canvasHeight;

	console.log('canvas size: ' + canvasWidth + 'x' + canvasHeight);
}


//============
//	INIT
//============
var nextTick;
loadImages();
