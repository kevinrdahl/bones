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
framecanvas.setAttribute("tabindex", 1);

var imgPrefix = 'http://kevinstuff.net/img/';
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
	time = new Date().getTime();
	window.requestAnimationFrame(drawFrame);
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

	var bones = skeleton.bones;
	for (name in bones) {
		var bone = bones[name];
		if (LinAlg.pointDist(mouseCoords,bone.endcoords) <= 5) {
			clickedBone = name;
			break;
		}
	}
	if (LinAlg.pointDist(mouseCoords,skeleton.origin) <= 5) {
		clickedBone = 'origin';
	}

	switch (tool) {
		case 'add':
			if (clickedBone != null) {
				var name = 'bone' + boneNum++;
				bones[name] = Skeletons.newBone(0,1,clickedBone,[],false,'bone.png');
				if (clickedBone == 'origin') {
					bones[name].coords = skeleton.origin;
				} else {
					bones[name].coords = bones[clickedBone].endcoords;
					bones[clickedBone].children.push(name);
				}
				Skeletons.addBoneAnimations(skeleton,name);
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
				Skeletons.deleteBone(skeleton,clickedBone);
				drawFrameTable();
				highlightFrames();
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
			highlightFrames();
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
				skeleton.angle = LinAlg.pointAngle(skeleton.origin,mouseCoords);
			} else if (clickedBone != null) {
				//TODO: set angles intelligently, based on movement of mouse
				var bone = skeleton.bones[clickedBone];
				bone.angle = LinAlg.pointAngle(bone.coords,mouseCoords)-skeleton.angle;
				Skeletons.setFrame(skeleton.animations[currentAnimation][clickedBone]['angle'],currentTime,bone.angle);
			}
			break;
		case 'position':
			if (clickedBone == 'origin') {
				skeleton.origin = mouseCoords;
			}
			break;
		case 'add':
			if (clickedBone != null) {
				var bone = skeleton.bones[clickedBone];
				bone.angle = LinAlg.pointAngle(bone.coords,mouseCoords)-skeleton.angle;
				bone.len = LinAlg.pointDist(bone.coords,mouseCoords);
				for (animationname in skeleton.animations) {
					for (var i = 0; i < Skeletons.animatedProperties.length; i++) {
						Skeletons.setFrame(skeleton.animations[animationname][clickedBone][Skeletons.animatedProperties[i]], 0, bone[animatedProperties[i]]);
					}
				}
			}
			break;
		case 'length':
			if (clickedBone != null && clickedBone != 'origin')  {
				var bone = skeleton.bones[clickedBone];
				bone.len = LinAlg.pointDist(mouseCoords,bone.coords);
			}
	}
	showBoneInfo();
}

function frameCanvasLeftDown (mouseCoords) {
	var which = clickedFrame(mouseCoords);
	selectFrame(which, !InputManager.pressed[InputManager.keys['SHIFT']]);
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
		var bone = skeleton.bones[name];
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
var clickedBone = null;
var selectedBone = null;
var tool = 'angle';
var boneNum = 0; //simple counter for naming new bones
var currentAnimation = 'none';
var currentTime = 0;
var playAnimation = false;
var editFrame = 0;
var animatedProperties = ['angle'];
var selectedFrames = []; //should be list of [x,y]
var copiedFrames = [];
var boneList = [];

var skeleton = Skeletons.newSkeleton();

Skeletons.addAnimation(skeleton, 'test', 1000);


function setTool(which) {
	clickedBone = null; //probably not needed, but true gangsters play it safe
	selectedBone = null
	tool = which;

	console.log(which);
	showBoneInfo();
}

function drawFrame() {
	context.clearRect(0,0,canvasWidth, canvasHeight);
	
	newtime = new Date().getTime();
	timedelta = newtime-time;
	time = newtime;

	if(playAnimation) {
		setFrame(currentTime+timedelta);
	}

	Skeletons.poseSkeleton(skeleton,currentAnimation,currentTime);
	Skeletons.drawSkeleton(context,skeleton,imagemap, images);
	Skeletons.drawWireframe(context,skeleton,[clickedBone,selectedBone]);
	
	window.requestAnimationFrame(drawFrame);
}

function updateAnimationList() {
	var list = document.getElementById("animationlist");

	while (list.length > 0) {
		list.remove(0);
	}

	for (name in skeleton.animations) {
		var option = document.createElement("option");
		option.text = name;
		option.value = name;
		if (name == currentAnimation) {
			option.selected = true;
		}
		list.add(option);
	}
}

function updateImageJSON() {
	var area = document.getElementById("imagejson");
	area.value = printNestedList(imagemap,1,4);
}

function printNestedList(list, skip, depth, indent) {
	indent = typeof indent !== 'undefined' ? indent : 0;

	if (skip > 0)
		indent -= 1;

	if (depth == 0 || typeof list === 'string') {
		return nChars(indent,' ') + JSON.stringify(list);
	} else {
		var str = nChars(indent,' ');
		if (skip <= 0)
			str+= '[\n';
		for (var i = 0; i < list.length; i++) {
			str += printNestedList(list[i],skip-1,depth-1,indent+1);
			if (i == list.length-1) {
				str += '\n';
			} else {
				str += ',\n';
			}
		}
		if (skip <= 0)
			str += nChars(indent,' ') + ']';
		return str;
	}
}

function nChars(n, char) {
	var str = '';
	for (var i = 0; i < n; i++) {
		str += char;
	}
	return str;
}

var BONE_LABEL_WIDTH = 100;
var FRAME_WIDTH = 10;
var ROW_HEIGHT = 20;
function drawFrameTable() {
	boneList = [];
	var animation = skeleton.animations[currentAnimation];
	var bones = skeleton.bones;

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

function highlightFrames() {
	restoreFrameTable();
	for (var i = 0; i < selectedFrames.length; i++) {
		if (boneList.indexOf(selectedFrames[i][0]) == -1) {
			continue;
		}
		var x = BONE_LABEL_WIDTH + (selectedFrames[i][1] * FRAME_WIDTH);
		var y = boneList.indexOf(selectedFrames[i][0])*ROW_HEIGHT - 1;
		framecontext.strokeStyle = "#00FF00";
		framecontext.strokeRect(x,y,FRAME_WIDTH-1,ROW_HEIGHT);
	}

	//time marker
	var x = BONE_LABEL_WIDTH + (currentTime * FRAME_WIDTH) + (FRAME_WIDTH / 2);
	framecontext.strokeStyle = "#FF0000";
	framecontext.beginPath();
	framecontext.moveTo(x,0);
	framecontext.lineTo(x,framecanvas.height-1);
	framecontext.stroke();
}

//returns the bone name and time at coords of the frametable
function clickedFrame(coords) {
	return [boneList[Math.floor(coords[1]/ROW_HEIGHT)], Math.floor((coords[0]-BONE_LABEL_WIDTH)/FRAME_WIDTH)];
}

function selectFrame(which, clear) {
	var animations = skeleton.animations;
	if (which[1] >= animations[currentAnimation].duration || which[1] < 0) {
		return;
	} else if (boneList.indexOf(which[0]) == -1) {
		return;
	}
	
	clear = typeof clear !== 'undefined' ? clear : false;
	if (clear) {
		restoreFrameTable();
		selectedFrames = [];
		setFrame(which[1]);
	}

	//indexOf does not work here because the items are lists
	var alreadySelected = false;
	for (var i = 0; i < selectedFrames.length; i++) {
		if (which[0] == selectedFrames[i][0] && which[1] == selectedFrames[i][1]) {
			alreadySelected = true;
			break;
		}
	}

	if (!alreadySelected) {
		selectedFrames.push(which);
	}

	highlightFrames();
}

function hasKeyFrame(bone, time) {
	var keyframes = skeleton.animations[currentAnimation][bone]['angle'];
	for (var i = 0; i < keyframes.length; i++) {
		if (keyframes[i][0] == time)
			return true;
	}
	return false;
}

function setCanvasSize() {
	var outer = document.getElementById('displayouter');
	canvasWidth = outer.clientWidth;
	canvasHeight = outer.clientHeight;
	canvas.width = canvasWidth;
	canvas.height = canvasHeight;
}

function UICopyFrames() {
	copiedFrames = [];
	var name, time, keyframes, value;
	for (var i = 0; i < selectedFrames.length; i++) {
		name = selectedFrames[i][0];
		time = selectedFrames[i][1];
		keyframes = skeleton.animations[currentAnimation][name]['angle'];
		value = Skeletons.getFrame(keyframes, time);
		copiedFrames.push([name, time, value]);
	}

	console.log(JSON.stringify(copiedFrames));
}

function UICutFrames() {
	UICopyFrames();
	UIDeleteFrames();
}

function UIPasteFrames() {
	if (copiedFrames.length == 0) {
		return;
	}

	//find leftmost time
	var left = -1;
	for (var i = 0; i < copiedFrames.length; i++) {
		if (left == -1 || copiedFrames[i][1] < left) {
			left = copiedFrames[i][1];
		}
	}

	var name, time, value;
	for (var i = 0; i < copiedFrames.length; i++) {
		console.log("loop");
		name = copiedFrames[i][0];
		time = copiedFrames[i][1] + currentTime - left;
		value = copiedFrames[i][2];

		if (boneList.indexOf(name) == -1) {
			continue;
		}
		if (time > skeleton.animations[currentAnimation].duration-1) {
			skeleton.animations[currentAnimation].duration = time+1;
		}

		//console.log("Set " + currentAnimation + " " + name + " " + time + " = " + value);
		Skeletons.setFrame(skeleton.animations[currentAnimation][name]['angle'], time, value);
	}

	drawFrameTable();
	highlightFrames();
}

function UIDeleteFrames() {
	for (var i = 0; i < selectedFrames.length; i++) {
		for (var j = 0; j < Skeletons.animatedProperties.length; j++) {
			var keyframes = skeleton.animations[currentAnimation][selectedFrames[i][0]][Skeletons.animatedProperties[j]];
			var time = selectedFrames[i][1];
			Skeletons.deleteFrame(keyframes, time);
		}
	}
	selectedFrames = [];
	drawFrameTable();
	highlightFrames();
}

function UIToggleAnimation(on) {
	if (on) {
		time = new Date().getTime();
	}
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
	highlightFrames();
}

function UISetFrame(field) {
	setFrame(field.value);
	editFrame = field.value;
}

function UIRenameAnimation() {
	if (currentAnimation == 'none') {
		alert("Can't rename the \"none\" animation.");
		return;
	}
	var name = prompt("Rename animation:", currentAnimation);
	for (animationname in skeleton.animations) {
		if (name == animationname) {
			alert("\"" + name + "\" already exists.");
			return;
		}
	}
	skeleton.animations[name] = skeleton.animations[currentAnimation];
	delete skeleton.animations[currentAnimation];
	currentAnimation = name;
	updateAnimationList();
}

function UIAddAnimation() {
	var name = prompt("New animation name", "");
	var duration = parseInt(prompt("Duration:", ""));
	console.log(duration);
	for (animationname in skeleton.animations) {
		if (name == animationname) {
			alert("\"" + name + "\" already exists.");
			return;
		}
	}
	if (duration == NaN || duration < 0) {
		alert(duration + " is not a valid duration.");
	}

	Skeletons.addAnimation(skeleton,name,duration);
	updateAnimationList();
}

function UICloneAnimation() {
	var name = prompt("New animation name", currentAnimation + "-clone");
	for (animationname in skeleton.animations) {
		if (name == animationname) {
			alert("\"" + name + "\" already exists.");
			return;
		}
	}
	Skeletons.cloneAnimation(skeleton, currentAnimation, name);
	updateAnimationList();
}

function UISetAnimationDuration() {
	var duration = parseInt(prompt("New duration for \"" + currentAnimation + "\":", skeleton.animations[currentAnimation].duration));
	if (duration == NaN || duration < 0) {
		alert(duration + " is not a valid duration.");
	}

	Skeletons.setAnimationDuration(skeleton, currentAnimation, duration);
	drawFrameTable();
}

function UIDeleteAnimation() {
	if (currentAnimation == 'none') {
		alert("Can't delete the \"none\" animation");
		return;
	}
	if (!confirm("Delete \"" + currentAnimation + "\"" + "?")) {
		return;
	}

	Skeletons.deleteAnimation(skeleton, currentAnimation);

	currentAnimation = 'none';
	setFrame(0);
	drawFrameTable();
	highlightFrames();
	updateAnimationList();
}

function UISaveSkeleton() {
	prompt("Skeleton JSON", JSON.stringify(skeleton));
}

function UILoadSkeleton() {

}

function UIUpdateImageMap() {
	console.log(JSON.stringify(imagemap));
	var box = document.getElementById('imagejson');
	try {
		var json = JSON.parse('['+box.value+']');
		imagemap = json;
	} catch(err) {
		console.log(err);
		alert('Malformed JSON');
	}
	console.log("===");
	console.log(JSON.stringify(imagemap));

}

function setFrame(frame) {
	currentTime = frame % skeleton.animations[currentAnimation].duration;
	document.getElementById('currentframe').value = currentTime;
	Skeletons.poseSkeleton(skeleton, currentAnimation, currentTime);
	highlightFrames();
}

function logDump(what) {
	console.log(what);
	console.log(JSON.stringify(eval(what),null,4));
}


//============
//	INIT
//============
loadImages();
showBoneInfo();
updateAnimationList();
drawFrameTable();
highlightFrames();
//layer,bone,params
var imagemap = [
	[//layer 1
		['chest',[['bone.png',100,50,0,0,0]]]
	],
	[//layer 2
		['chest',[['bone.png',100,50,90,0,0]]]
	]
];
updateImageJSON();