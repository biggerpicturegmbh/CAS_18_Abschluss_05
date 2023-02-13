class FlowLine { 
  constructor(startX, startY, speed, hue) {
    this.holdMin = 120;      // minimal Time before switch direction
    this.holdMax = 240;      // minimal Time before switch direction
    this.startX = startX;   // 1: Startpoint X to trigger (Mouse or ML)
    this.startY = startY;   // 2: Startpoint Y to trigger (Mouse or ML)
    this.nextX = startX;    // next Point in FlowLine
    this.nextY = startY;    // next Point in FlowLine
    this.flPointsAll = [];  // Array for all points in Flowline
    // this.flPoint = {x: this.startX, y: this.startY}; // Object with x and y position
    this.flSpeed = speed;   // 3: positiv to the right, negativ to the left
    this.straightDir = true; // Direction true if horizontal; default for all
    this.flWhere = 'horiz';   // Direction true if horizontal; default for array
    this.hue = hue;         // 4: Hue value for Line
    this.satValue = 100;    // set saturation value
    this.briValue = 100;    // set brightness value
    this.transp = 100;      // default transparency, reduce by end of life
    this.flCounter = 0;     // counter to trigger behavior, instead of frameCount
  }

  move() {
    this.holdDir = int(random(this.holdMin, this.holdMax)) // hold direction time
    this.switchDir = ['horiz', 'up', 'down'] // possible directions
    this.counter = this.flCounter % this.holdDir // counter for switch direction
    this.flCounter += 1 // increase counter
    // console.log(this.counter)

    
    // Flow Horizontal, up or down
    if (this.counter == this.holdDir-1 && this.straightDir == true) {
      this.flWhere = this.switchDir[int(random(1, 3))] // choose between up or down
      this.straightDir = false
    } else if (this.counter == this.holdDir-1 && this.straightDir == false) {
      this.flWhere = this.switchDir[0] // stay horizontal
      this.straightDir = true
    } else {
      this.switchDir[0] // default behavior for safety 
    }
    
    // move Points, speed can by positiv (to right) or negativ (to left)
    if(this.counter < this.holdDir-1) {
      if (this.flWhere == "horiz") {
        this.nextX += this.flSpeed
      } else if (this.flWhere == "up") {
        this.nextX += this.flSpeed
        this.nextY -= this.flSpeed
      } else if (this.flWhere == "down") {
        this.nextX += this.flSpeed
        this.nextY += this.flSpeed
      }
    } else {
      this.flPointsAll.push({x: this.nextX, y: this.nextY})
    }

  }
  show() { // draw FlowLine
    noFill();
    stroke(this.hue, this.satValue, this.briValue, this.transp)
    strokeWeight(flowWeight) // variable before setup

    beginShape();
    vertex(this.startX, this.startY) // set first/trigger point
    if (this.flPointsAll.length) {
      for (const pos of this.flPointsAll) {
        vertex(pos.x, pos.y)
      }
    } 
    
    vertex(this.nextX, this.nextY)
    endShape();

  }
  remove() {
    if (this.nextX<0||this.nextX>width || this.nextY<0||this.nextY>height){
      this.transp -= flowRemoveSpeed // reduce transparency if points reach borders
    }
    if (this.transp < 0) {
      // remove Array HIER NOCH EINBAUEN
    }
  }
}

// END of class "FlowLine", here for checking properties
// class FlowLine {
//   constructor(startX, startY, speed, hue) {

// --- variables for ML
let video;
let poseNet;
let poses = [];

// --- variables for finetuning on stage
let flowSpeed;            // speed/dir for FlowLine, can be pos or neg, change in mouse pressed
let flowSpeedMultip = 1;  // Multiplikator for speed
let flowWeight = 2;       // stroke thickness
let flowRemoveSpeed = 1;  // how fast the lines disapear when reaching borders
let hueValue;             // hue value in "draw" for random set
let startFieldX;
let startFieldY;


const colorfulls = [
  "5",    //#d53829
  "15",   //#ff541b
  "42",   //#e6ae2e
  "89",   //#80a25c
  "161",  //#009f6c
  "219",  //#387eff
  "258",  //#4e22b6
  "326",  //#ff2ea5
];
const colorAchro = [
  "198",  //#e7eef1
  "48"    //#1b1a16
];

const flowLines = []      // array for flowLines 

// --- Version with start of FlowLine by mouse click
// function mousePressed() { // 
//   if (Math.random() < 0.5) { // random switch right or left side
//     flowSpeed = -1*flowSpeedMultip; // change here for adjusting speed
//   } else {
//     flowSpeed = 1*flowSpeedMultip;  // change here for adjusting speed, same value as above!
//   }
//   console.log(flowSpeed)
  
//   // push class FlowLine in array
//   flowLines.push(new FlowLine(mouseX, mouseY, flowSpeed, hueValue)) 
// }

function detectNose() {
  // Loop through all the poses detected
  for (let i = 0; i < poses.length; i++) {
    // For each pose detected, loop through all the keypoints
    let pose = poses[i].pose;

    for (let j = 0; j < pose.keypoints.length; j++) {
      // A keypoint is an object describing a body part (like rightArm or leftShoulder)
      let keypoint = pose.keypoints[0];
      // Only draw an ellipse is the pose probability is bigger than 0.2
      if (keypoint.score > 0.2) {
        let noseSize = keypoint.score * 20
        // -- Tracker for Nose
        noFill();
        stroke(307, 100, 100, 50);
        strokeWeight(0.2)
        ellipse(keypoint.position.x, keypoint.position.y, noseSize, noseSize);
        line(keypoint.position.x-10, keypoint.position.y-10, keypoint.position.x+10, keypoint.position.y+10)
        line(keypoint.position.x+10, keypoint.position.y-10, keypoint.position.x-10, keypoint.position.y+10)

        if (keypoint.position.x < width/2) {
          flowSpeed = -1*flowSpeedMultip;
        } else {
          flowSpeed = 1*flowSpeedMultip;
        }

        console.log(flowSpeed)
        
        

      }
    }    
  }
}

function setup() {
  colorMode(HSB, 360, 100, 100, 100); // set colormode to HSB
  createCanvas(windowWidth, 600);     // change on stage
  video = createCapture(VIDEO);
  video.size(width, height)

    // Create a new poseNet method with a single detection
    poseNet = ml5.poseNet(video, modelReady);
    // This sets up an event that fills the global variable "poses"
    // with an array every time new poses are detected
    poseNet.on("pose", function(results) {
      poses = results;
    });
    // Hide the video element, and just show the canvas
    video.hide();
    console.clear()
}

function modelReady() {
  console.log("Model ready")
}

function draw() {
  background(240, 5, 5, 100);      // Background color HSB
  // Flip video capture
  translate(video.width, 0);
  scale(-1, 1);

  startFieldX = random(width/2-100, width/2+100)
  startFieldY = random(50, height-50)

  // Call ML detectNose Function
  detectNose()
  if (frameCount%30 == 0) {
    // push class FlowLine in array
    flowLines.push(new FlowLine(startFieldX, startFieldY, flowSpeed, hueValue)) 
    console.log("shoot!")
  }
  // Color Random or from array (comment out)
  //hueValue = random(280, 360)         // Random color for Flowline

  const pick = (d) => d[floor(random() * d.length)];
  hueValue = pick(colorfulls)


  for (let flowLine of flowLines) {
    flowLine.move()
    flowLine.show()
    flowLine.remove()
  }

}


// TODO:
// - Linie verblasst vom Start her (Schweif-Effekt)
