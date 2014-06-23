var Skeletons = {
	animatedProperties:['angle'],
	newSkeleton:function() {
		var origin = [300,250];
		var angle = 0;
		var bones = {
			chest:this.newBone(270,150,'origin',['head','shoulderleft','shoulderright'],false,'bone.png'),
			head:this.newBone(270,50,'chest',[],false,'bone.png'),
			
			legleft1:this.newBone(110,80,'origin',['legleft2'],false,'bone.png'),
			legleft2:this.newBone(95,80,'legleft1',['footleft'],false,'bone.png'),
			footleft:this.newBone(180,20,'legleft2',[],false,'bone.png'),
			
			legright1:this.newBone(70,80,'origin',['legright2'],false,'bone.png'),
			legright2:this.newBone(85,80,'legright1',['footright'],false,'bone.png'),
			footright:this.newBone(0,20,'legright2',[],false,'bone.png'),
			
			shoulderleft:this.newBone(160,45,'chest',['armleft1'],false,'bone.png'),
			armleft1:this.newBone(100,70,'shoulderleft',['armleft2'],false,'bone.png'),
			armleft2:this.newBone(90,65,'armleft1',[],false,'bone.png'),
			
			shoulderright:this.newBone(20,45,'chest',['armright1'],false,'bone.png'),
			armright1:this.newBone(80,70,'shoulderright',['armright2'],false,'bone.png'),
			armright2:this.newBone(90,65,'armright1',[],false,'bone.png')
		};

		var animations = {
			none:{duration:1}
		};

		for (name in bones) {
			var bone = bones[name];
			animations['none'][name] = {angle:[[0, bone.angle]]};
		}

		return {origin:origin, angle:angle, bones:bones, animations:animations, images:images};
	},

	newBone:function(angle, len, parent, children, rigid, image) {
		return {angle:angle, len:len, parent:parent, children:children, rigid:rigid, image:image};
	},

	poseSkeleton:function(skeleton, animation, time) {
		animation = skeleton.animations[animation];
		var bones = skeleton.bones;

		for (name in bones) {
			var bone = bones[name];
			for (prop in animation[name]) {
				bone[prop] = this.getFrame(animation[name][prop], time);
			}
		}

		for (name in bones) {
			if (bones[name].parent == 'origin') {
				bones[name].coords = skeleton.origin;
				this.poseBones(skeleton,bones[name]);
			}
		}
	},

	poseBones:function(skeleton, bone) {
		var angle = bone.angle+skeleton.angle;
		if (bone.rigid) {
			angle += bones[bone.parent].angle;
		}
		bone.finalangle = angle;
		
		bone.endcoords = LinAlg.pointOffset(bone.coords, angle, bone.len);
		for (var i = 0; i < bone.children.length; i++) {
			var child = skeleton.bones[bone.children[i]];
			child.coords = bone.endcoords;
			this.poseBones(skeleton,child);
		}
	},

	drawSkeleton:function(context, skeleton) {
		this.context = context;
		var bones = skeleton.bones;
		for (name in bones) {
			this.drawBone(bones[name]);
		}
	},

	drawWireframe:function(context, skeleton, highlights) {
		this.context = context;
		var bones = skeleton.bones;

		context.lineWidth = 3;
		context.strokeStyle = "#000000";
		for (name in bones) {
			if (name in highlights)
				continue
			this.drawWire(bones[name]);
		}
		context.strokeStyle = "#00FF00";
		for (var i = 0; i < highlights.length; i++) {
			if (highlights[i] == null || highlights[i] == 'origin')
				continue;
			this.drawWire(bones[highlights[i]]);
		}

		//origin
		context.strokeStyle = '#FF0000';
		context.beginPath()	
		context.arc(skeleton.origin[0], skeleton.origin[1], 3, 0, 2*Math.PI);
		context.stroke();
	},

	//NOTE: Skeletons set its context variable each time it is told to draw the skeleton or wireframe
	//it is absolutely not thread safe, but this is javascript homie
	drawBone:function(bone) {
		if (bone.image != null) {
			if (images[bone.image][0]) {
				var image = images[bone.image][1];
				var midpoint = LinAlg.midPoint(bone.coords,bone.endcoords);
				this.drawImageRotated(image,midpoint[0],midpoint[1],bone.len,bone.len/3,bone.finalangle);
			}
		}
	},

	drawWire:function(bone) {
		var context = this.context;
		context.beginPath();
		context.moveTo(bone.coords[0], bone.coords[1]);
		context.lineTo(bone.endcoords[0], bone.endcoords[1]);
		context.stroke();
		
		context.beginPath();
		context.arc(bone.endcoords[0], bone.endcoords[1], 3, 0, 2*Math.PI);
		context.stroke();
	},

	//angle is degrees
	drawImageRotated:function(image, x, y, w, h, angle) {
		var context = this.context;
		context.save();
		context.translate(x, y);
		context.rotate(LinAlg.toRadians(angle));
		context.drawImage(image, -w/2, -h/2, w, h); //x,y,w,h
		context.restore(); 
	},

	//updates all references to a bone
	renameBone:function(skeleton, name, newname) {
		var bones = skeleton.bones;
		var bone = bones[name];
		if (bone.parent != 'origin' && bone.parent != null) {
			var parent = bones[bone.parent];
			parent.children.splice(parent.children.indexOf(name), 1);
			parent.children.push(newname);
		}
		for (var i = 0; i < bone.children.length; i++) {
			bones[children[i]].parent = newname;
		}
	},

	//adds bone to each animation
	addBoneAnimations:function(skeleton, bonename) {
		var animations = skeleton.animations;

		for (animationname in animations) {
			var animation = animations[animationname];
			animation[bonename] = {};
			for (var i = 0; i < this.animatedProperties.length; i++) {
				var property = this.animatedProperties[i];
				animation[bonename][property] = [[0,bone[property]]];
			}
		}
	},

	setBoneParent:function(skeleton, bonename, parentname) {
		var bones = skeleton.bones;
		var bone = bones[bonename];
		var parent = bones[parentname];

		if (bone.parent != 'origin' && bone.parent != null) {
			delete bones[bone.parent].children[bonename];	
		}
		
		parent.children.push(bonename);
		bone.parent = parentname;
	},

	//deletes a bone, and then recursively deletes its children
	//also removes it from animation definitions
	deleteBone:function(skeleton, name) {
		if (name == 'origin') {
			skeleton.bones = {};
			return;
		}

		var bones = skeleton.bones;
		var bone = bones[name];
		var animations = skeleton.animations;
		if (bone.parent != 'origin') {
			var parent = bones[bone.parent];
			parent.children.splice(parent.children.indexOf(name), 1);
		}
		while (bone.children.length > 0) {
			this.deleteBone(skeleton, bone.children[0]);
		}
		delete bones[name];
		
		for (animationname in animations) {
			delete animations[animationname][name];
		}

	},

	//TODO: instead of iterating over all keyframes to find prev/next, implement a modified binary search for n where n-1 <= n and n < n+1
	//given the keyframes of a property, returns the interpolated value at a specific time
	getFrame:function(keyframes, time) {
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
	},

	setFrame:function(keyframes, time, value) {
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

	},

	//deletes a keyframe
	deleteFrame:function(keyframes, time) {
		for (var i = 0; i < keyframes.length; i++) {
			if (keyframes[i][0] == time) {
				keyframes.splice(i,1);
				return;
			}
		}
	},

	addAnimation:function(skeleton, animationname, duration) {
		if (animationname in skeleton.animations) {
			alert("Skeleton already has animation \"" + animationname + "\"");
			return;
		}

		var animation = {duration:duration};

		for (bonename in skeleton.bones) {
			animation[bonename] = {};
			for (var i = 0; i < this.animatedProperties.length; i++) {
				var property = this.animatedProperties[i];
				animation[bonename][property] = [[0, skeleton.animations['none'][bonename][property][0][1]]]; //value of 'none' at frame 0
			}
		}
		
		skeleton.animations[animationname] = animation;
	},

	cloneAnimation:function(skeleton, sourcename, newname) {
		skeleton.animations[newname] = eval(JSON.stringify(skeleton.animations[sourcename]));
	},

	setAnimationDuration:function(skeleton, animationname, duration) {
		var animation = skeleton.animations[animationname];

		if (duration >= animation.duration) {
			animation.duration = duration;
			return;
		}

		animation.duration = duration;

		for (bonename in animation) {
			for (var i = 0; i < this.animatedProperties.length; i++) {
				var property = this.animatedProperties[i];
				var keyframes = animation[bonename][property];
				for (var j = 0; j < keyframes.length; j++) {
					if (keyframes[j][0] > duration-1) {
						keyframes.splice(j,1);
						j--;
					}
				}
			}
		}
	},

	deleteAnimation:function(skeleton, animationname) {
		delete skeleton.animations[animationname];
	}

};
