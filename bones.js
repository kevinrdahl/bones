window.onbeforeunload = function(e) {
	return "";
}

var canvas = document.getElementById("display");
canvas.setAttribute("tabindex", 0);
var context = canvas.getContext("2d");

var canvasWidth;
var canvasHeight;
setCanvasSize();

var framecanvas = document.getElementById("framecanvas");
var framecontext = framecanvas.getContext("2d");
framecanvas.setAttribute("tabindex", 0);

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
var canvasInput = InputManager.createInputManager(canvas);
canvasInput.leftClickDown = canvasLeftDown;
canvasInput.leftClickUp = canvasLeftUp;
canvasInput.leftClickMove = canvasLeftMove;
canvasInput.keyDown = keyDown;
canvasInput.keyUp = keyUp;

var frameCanvasInput = InputManager.createInputManager(framecanvas);
frameCanvasInput.leftClickDown = frameCanvasLeftDown;
frameCanvasInput.leftClickUp = frameCanvasLeftUp;
frameCanvasInput.leftClickMove = frameCanvasLeftMove;
frameCanvasInput.keyDown = keyDown;
frameCanvasInput.keyUp = keyUp;


function canvasLeftDown (mouseCoords) {
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
				addBoneAnimations(name);
				clickedBone = name;
			}
			break;
	}
	showBoneInfo();
}

function canvasLeftUp (mouseCoords) {
	if (playAnimation) {
		return;
	}

	switch (tool) {
		case 'delete':
			if (clickedBone != null && clickedBone != 'origin' && !canvasInput.leftMouseDragging) {
				deleteBone(clickedBone);
			}
			break;
		case 'edit':
			if (clickedBone != null && clickedBone != 'origin' && !canvasInput.leftMouseDragging) {
				selectedBone = clickedBone;
				console.log('editing ' + clickedBone);
			}
			break;
		case 'angle':
		case 'add':
			drawFrameTable();
	}

	clickedBone = null;
	showBoneInfo();
}

function canvasLeftMove (mouseCoords) {
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
				for (animationname in animations) {
					for (property in animatedProperties) {
						setTimeValue(animationname, clickedBone, property, 0, bone[property]);
					}
				}
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

function frameCanvasLeftDown (mouseCoords) {
	var coords = clickedFrame(mouseCoords);
	selectFrame(coords, !InputManager.pressed[InputManager.keys['SHIFT']]);
}

function frameCanvasLeftUp (mouseCoords) {
}

function frameCanvasLeftMove (mouseCoords) {
}

function keyDown(which) {
	//console.log(which+" down");
}

function keyUp(which) {
	//console.log(which+" up");
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
var animatedProperties = {'angle':0};
var selectedFrames = []; //should be list of [x,y]
var boneList = [];

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
	context.lineWidth = 3;
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

function addBoneAnimations(name) {
	var bone = bones[name];

	for (animationname in animations) {
		var animation = animations[animationname];
		animation[name] = {};
		for (property in animatedProperties) {
			animation[name][property] = [[0,bone[property]]];
		}
	}
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

	//find where in the list of keyframes to put this one
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

function deleteTimeValue(animationname, bonename, property, time) {
	if (time == 0) {
		console.alert("Can't delete frame 0");
		return;
	}

	var animation = animations[animationname];
	var keyframes = animation[bonename][property];

	for (var i = 0; i < keyframes.length; i++) {
		if (keyframes[i][0] == time) {
			keyframes.splice(i,1);
			return;
		}
	}
}


var BONE_LABEL_WIDTH = 100;
var FRAME_WIDTH = 10;
var ROW_HEIGHT = 20;
function drawFrameTable() {
	boneList = [];
	var animation = animations[currentAnimation];

	var numBones = 0;
	for (bone in bones) {
		numBones++;
	}

	var width = BONE_LABEL_WIDTH + (FRAME_WIDTH * animation.duration);
	var height = ROW_HEIGHT * numBones;
	framecanvas.width = width;
	framecanvas.height = height;

	framecontext.font = '15px bold Arial'

	framecontext.strokeStyle = '#000000';
	framecontext.lineWidth = 2;
	framecontext.fillStyle = '#DDDDDD';
	framecontext.fillRect(BONE_LABEL_WIDTH,0,width,height);
	framecontext.beginPath();
	framecontext.moveTo(BONE_LABEL_WIDTH,0);
	framecontext.lineTo(BONE_LABEL_WIDTH,height-1);
	framecontext.stroke();

	var row = 0;
	for (bonename in animation) {
		if (bonename == 'duration') {
			continue;
		}
		boneList.push(bonename);
		var x = 5;
		var y = ROW_HEIGHT*row;
		framecontext.fillStyle = '#000000';
		framecontext.fillText(bonename,x,y+ROW_HEIGHT-5);
		framecontext.strokeRect(-1,y-1,width,ROW_HEIGHT);

		var keyframes = animation[bonename]['angle'];
		for (var i = 0; i < keyframes.length; i++) {
			x = keyframes[i][0]*FRAME_WIDTH + BONE_LABEL_WIDTH;
			framecontext.fillStyle = '#666666';
			framecontext.fillRect(x+1,y,FRAME_WIDTH-3,ROW_HEIGHT-2);
		}
		row++;
	}
	saveFrameTable();
}

function saveFrameTable() {
	savedframetable = framecontext.getImageData(0,0,framecanvas.width,framecanvas.height);
}

function restoreFrameTable() {
	framecontext.putImageData(savedframetable,0,0);
}

function clickedFrame(coords) {
	return [Math.floor((coords[0]-BONE_LABEL_WIDTH)/FRAME_WIDTH), Math.floor(coords[1]/ROW_HEIGHT)];
}

function selectFrame(which, clear) {
	if (which[0] >= animations[currentAnimation].duration || which[0] < 0) {
		return;
	}

	console.log(JSON.stringify(animations[currentAnimation][boneList[which[1]]]));
	
	clear = typeof clear !== 'undefined' ? clear : false;
	if (clear)
		restoreFrameTable();
	
	var x = BONE_LABEL_WIDTH + (which[0] * FRAME_WIDTH) - 1;
	var y = which[1]*ROW_HEIGHT - 1;
	framecontext.strokeStyle = '#00FF00';
	framecontext.strokeRect(x,y,FRAME_WIDTH,ROW_HEIGHT);
}

function hasKeyFrame(bone, time) {
	var keyframes = animations[currentAnimation][bone]['angle'];
	for (var i = 0; i < keyframes.length; i++) {
		if (keyframes[i][0] == time)
			return true;
	}
	return false;
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

	//console.log('canvas size: ' + canvasWidth + 'x' + canvasHeight);
}

function UIToggleAnimation(on) {
	playAnimation = on;
	setFrame(editFrame);
	document.getElementById('currentframe').readOnly = playAnimation;
}

function UIFrameButtons(frame) {
	setFrame(eval(frame));
}

function UISetAnimation(list) {
	currentAnimation = list.options[list.selectedIndex].value;
	setFrame(0);
	drawFrameTable();
}

function UISetFrame(field) {
	setFrame(field.value);
	editFrame = field.value;;
}

function setFrame(frame) {
	currentTime = frame%animations[currentAnimation].duration;
	document.getElementById('currentframe').value = currentTime;
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
drawFrameTable();
context.lineWidth = 3;
