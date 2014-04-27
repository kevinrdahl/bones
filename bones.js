var canvas = document.getElementById("animdisplay");
canvas.setAttribute("tabindex", 0);
var context = canvas.getContext("2d");

var canvasWidth;
var canvasHeight;
setCanvasSize();

var imgPrefix = 'http://kevinstuff.net/img/'; //var imgPrefix = 'img/';
var imageList = ['bone.png'];
var images = new Object();
var numLoaded = 0;

var TICK_LEN = 33;

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
	nextTick = new Date().getTime()+TICK_LEN;
	onTick();
}

/*======
CONTROLS
======*/
canvas.oncontextmenu = function () {return false;};
canvas.onclick = function(e) {e.preventDefault(); e.defaultPrevented = true; e.stopPropagation(); return false;};


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
	if (playAnimation) {
		return;
	}

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
	showBoneInfo();
}

function leftClickUp (mouseCoords) {
	if (playAnimation) {
		return;
	}

	switch (tool) {
		case 'delete':
			if (clickedBone != null && clickedBone != 'origin' && LinAlg.pointDist(mouseCoords,leftMouseDownCoords) <= MOUSE_DRAG_MIN) {
				deleteBone(clickedBone);
			}
			break;
		case 'edit':
			if (clickedBone != null && clickedBone != 'origin' && LinAlg.pointDist(mouseCoords,leftMouseDownCoords) <= MOUSE_DRAG_MIN) {
				selectedBone = clickedBone;
				console.log('editing ' + clickedBone);
			}
			break;
	}

	clickedBone = null;
	showBoneInfo();
}

function leftClickMove (mouseCoords) {
	if (playAnimation) {
		return;
	}

	switch(tool) {
		case 'angle':
			if (clickedBone == 'origin') {
				skeletonAngle = LinAlg.pointAngle(origin,mouseCoords);
			} else if (clickedBone != null) {
				var bone = bones[clickedBone];
				bone.angle = LinAlg.pointAngle(bone.coords,mouseCoords)-skeletonAngle;
				setTimeValue(currentAnimation,clickedBone,'angle',currentTime,bone.angle);
			}
			break;
		case 'position':
			if (clickedBone == 'origin') {
				origin = mouseCoords;
			}
			break;
		case 'add':
			if (clickedBone != null) {
				var bone = bones[clickedBone];
				bone.angle = LinAlg.pointAngle(bone.coords,mouseCoords)-skeletonAngle;
				bone.len = LinAlg.pointDist(bone.coords,mouseCoords);
			}
			break;
		case 'length':
			if (clickedBone != null && clickedBone != 'origin')  {
				var bone = bones[clickedBone];
				bone.len = LinAlg.pointDist(mouseCoords,bone.coords);
			}
	}
	showBoneInfo();
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

function showBoneInfo() {
	var name = null;
	if (selectedBone != null) {
		name = selectedBone;
	} else if (clickedBone != null && clickedBone != 'origin') {
		name = clickedBone;
	}

	var info = 'none selected';
	if (name != null) {
		var bone = bones[name];
		var children = '[';
		for (var i = 0; i < bone.children.length; i++) {
			children += bone.children[i];
			if (i != bone.children.length-1) {
				children += ', ';
			}
		}
		children += ']';
		var rigid = (bone.rigid) ? 'yes' : 'no';
		info = 'name: ' + name + '<br>' +
				'length: ' + bone.len + '<br>' +
				'angle: ' + bone.angle + '<br>' +
				'parent: ' + bone.parent + '<br>' +
				'children: ' + children + '<br>' +
				'rigid: ' + rigid + '<br>' +
				'image: ' + bone.image;
	}
	document.getElementById('boneinfo').innerHTML = info;
}

/*=======
ANIMATION
=======*/
var origin = [300,250];
var skeletonAngle = 0;
var clickedBone = null;
var selectedBone = null;
var tool = 'angle';
var boneNum = 0; //simple counter for naming new bones
var currentAnimation = 'none';
var currentTime = 0;
var playAnimation = false;
var editFrame = 0;

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

var animations = {
	none:{duration:1},
	test:{duration:1000}
};

//for every bone, set frame 0 of the "none" animation to its current angle
//other transforms can be added later
for (name in bones) {
	var bone = bones[name];
	animations['none'][name] = {angle:[[0, bone.angle]]};
}

for (name in bones) {
	var bone = bones[name];
	animations['test'][name] = {angle:[[0, bone.angle]]};
}


function setTool(which) {
	clickedBone = null; //probably not needed but who knows
	selectedBone = null
	tool = which;

	console.log(which);
	showBoneInfo();
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
	nextTick += TICK_LEN;
}

function drawFrame() {
	context.clearRect(0,0,canvasWidth, canvasHeight);

	if(playAnimation) {
		poseSkeleton();
		setFrame(currentTime+TICK_LEN);
	}

	for (name in bones) {
		if (bones[name].parent == 'origin') {
			bones[name].coords = origin;
			poseBones(bones[name]);
		}
	}
	
	for (name in bones) {
		drawBone(name);
	}
	context.strokeStyle = '#FF0000';
	context.beginPath()	
	context.arc(origin[0], origin[1], 3, 0, 2*Math.PI);
	context.stroke();
	if (clickedBone == 'origin' && tool == 'angle') {
		context.beginPath();
		context.moveTo(origin[0], origin[1]);
		var coords = LinAlg.pointOffset(origin,skeletonAngle,300);
		context.lineTo(coords[0], coords[1]);
		context.stroke();
	}
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

function drawBone(namee) {
	var bone = bones[name];

	//image
	if (bone.image != null) {
		if (images[bone.image][0]) {
			var image = images[bone.image][1];
			var midpoint = LinAlg.midPoint(bone.coords,bone.endcoords);
			drawImageRotated(image,midpoint[0],midpoint[1],bone.len,bone.len/3,bone.finalangle);
		}
	}

	if (clickedBone == name || selectedBone == name) {
		context.strokeStyle = '#00FF00';
	} else {
		context.strokeStyle = '#000000';
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
	return {angle:angle, len:len, parent:parent, children:children, rigid:rigid, image:image};
}

function setBoneParent(bonename, parentname) {
	if (bone.parent != 'origin' && bone.parent != null) {
		delete bones[bone.parent].children[bonename];	
	}
	var bone = bones[bonename];
	var parent = bones[parentname];
	
	parent.children.push(bonename);
	bone.parent = parentname;
}

//deletes a bone, and then recursively deletes its children
function deleteBone(name) {
	if (name == 'origin') {
		bones = {};
	}
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

//updates all references to a bone
function renameBone(name, newname) {
	var bone = bones[name];
	if (bone.parent != 'origin' && bone.parent != null) {
		var parent = bones[bone.parent];
		parent.children.splice(parent.children.indexOf(name), 1);
		parent.children.push(newname);
	}
	for (var i = 0; i < bone.children.length; i++) {
		bones[children[i]].parent = newname;
	}
}

function poseSkeleton () {
	var animation = animations[currentAnimation];

	for (bonename in bones) {
		var bone = bones[bonename];
		for (prop in animation[bonename]) {
			bone[prop] = getTimeValue(animation[bonename][prop], currentTime);
		}
	}
}

//TODO: instead of iterating over all keyframes to find prev/next, implement a modified binary search for n where n-1 <= n and n < n+1
//given the keyframes of a property, returns the interpolated value at a specific time
function getTimeValue(keyframes, time) {
	if (keyframes.length == 1) {
		return keyframes[0][1];
	}
	
	var prevIndex = 0;
	var nextIndex = 0;
	for (var i = 0; i < keyframes.length; i++) {
		if (keyframes[i][0] <= time) {
			prevIndex = i;
		} else {
			nextIndex = i;
			break;
		}
	}
	if (nextIndex == 0) {
		return keyframes[prevIndex][1];
	}
	var prevTime = keyframes[prevIndex][0];
	var prevValue = keyframes[prevIndex][1];
	var nextTime = keyframes[nextIndex][0];
	var nextValue = keyframes[nextIndex][1];

	var progress = (time-prevTime)/(nextTime-prevTime); // [0,1)
	return prevValue + progress*(nextValue-prevValue); // [prevValue,nextValue)
}

function setTimeValue(animationname, bonename, property, time, value) {
	var animation = animations[animationname];
	var keyframes = animation[bonename][property];

	var prevIndex = 0;
	for (var i = 0; i < keyframes.length; i++) {
		if (keyframes[i][0] <= time) {
			prevIndex = i;
		} else {
			break;
		}
	}

	if (keyframes[prevIndex][0] == time) {
		keyframes[prevIndex][1] = value;
	} else {
		keyframes.splice(prevIndex+1, 0, [time,value]);
	}

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
	var outer = document.getElementById('animdisplayouter');
	canvasWidth = outer.clientWidth;
	canvasHeight = outer.clientHeight;
	canvas.width = canvasWidth;
	canvas.height = canvasHeight;

	//console.log('canvas size: ' + canvasWidth + 'x' + canvasHeight);
}

function UIToggleAnimation(checkbox) {
	console.log(checkbox.checked);
	playAnimation = checkbox.checked;
	setFrame(editFrame);
	document.getElementById('currentframe').readOnly = playAnimation;
}

function UISetAnimation(list) {
	setFrame(0);
	currentAnimation = list.options[list.selectedIndex].value;
}

function UISetFrame(field) {
	setFrame(field.value);
	editFrame = field.value;
	console.log(currentTime);
}

function setFrame(frame) {
	currentTime = frame%animations[currentAnimation].duration;
	poseSkeleton();
}

function logDump(what) {
	console.log(what);
	console.log(JSON.stringify(eval(what),null,4));
}


//============
//	INIT
//============
var nextTick;
loadImages();
showBoneInfo();
context.lineWidth = 3;
