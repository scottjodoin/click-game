
var _c = document.getElementById("game");
var _ctx = _c.getContext("2d");
var _dotCount;
var _currentDot
var _pts = [];
var _dots = [];
var _picturePieces = [];
var _img = null;
var _stepInterval;
var _rainbowOn = false;
var _difficulty = "easy";
// sounds
var aCorrect = new Audio('aCorrect.mp3');
var aWrong = new Audio('aWrong.mp3');
var aWin = new Audio('aWin.mp3');
var aStart = new Audio('aStart.mp3');

// get relative mouse coords
function relMouseCoords(event){
  var totalOffsetX = 0;
  var totalOffsetY = 0;
  var canvasX = 0;
  var canvasY = 0;
  var currentElement = this;

  do{
      totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
      totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
  }
  while(currentElement = currentElement.offsetParent)

  canvasX = event.pageX - totalOffsetX;
  canvasY = event.pageY - totalOffsetY;

  return new Point(canvasX, canvasY);
}
HTMLCanvasElement.prototype.relMouseCoords = relMouseCoords;

class Rectangle{
  constructor(x, y, height, width){
    this.x = x;
    this.y = y;
    this.height = height;
    this.width = width;
  }

  pointInside(p){
    return p.x>=this.x && p.y>=this.y
      &&p.x <this.x+this.width
      &&p.y <this.y+this.height;
  }

  shrink(v){
    // additive
    return new Rectangle(this.x+v,this.y+v,this.width-v*2,this.height-v*2);
  }

  scale(r){
    return new Rectangle(this.x*r,this.y*r,this.width*r,this.height*r);
  }
  get right(){
    return this.x + this.width;
  }

  get bottom(){
    return this.y + this.height;
  }
}
class Point {
  constructor(x, y){
    this.x = x;
    this.y = y;
  }

  distanceTo(p){
    return Math.sqrt(Math.pow(this.x - p.x,2) + Math.pow(this.y - p.y,2));
  }

  clone(){
    return new Point(this.x,this.y);
  }

  onTopOf(p){
    return Math.abs(this.x-p.x) < 1 && Math.abs(this.y-p.y) < 1;
  }
}

class PicturePiece{
  constructor(d,img,sr,ctx){
    this.d = d; // Dot
    this.width = this.d.r*2;
    this.p = new Point(this.d.p.x - this.d.r, this.d.p.y - this.d.r*3); // top-left
    this.destP = this.p.clone();
    this.img = img; // img element
    this.sr = sr; // Rectangle
    this.ctx = ctx;
    this.complete = false;
  }

  mouseDown(diff) {
    if (diff!==0 || this.complete) return;
    this.width *= 2;
    this.destP = new Point(
      this.sr.x * this.width/this.sr.width,
      this.sr.y * this.width/this.sr.height,
    );
    console.log(this.destP, this.sr,this.d.r);
    this.complete = true;
  }

  step(){
    if (this.p.distanceTo(this.destP) < 2) {
      this.p = this.destP;
      return;
    }
    this.p.x -= (this.p.x - this.destP.x) *0.7;
    this.p.y -= (this.p.y - this.destP.y) *0.7;
  }

  paint() {
    var isLoaded = this.img.complete && this.img.naturalHeight !== 0;
    if (!isLoaded) return;
    let ctx = this.ctx;
    ctx.drawImage(
      this.img,
      this.sr.x,
      this.sr.y,
      this.sr.width,
      this.sr.height,
      this.p.x,
      this.p.y,
      this.width,
      this.width
    );
    ctx.stroke();
  }
}
class Dot {
  constructor (i, p, ctx) {
    this.i = i;
    this.p = p; // Point
    this.destP = p;
    this.divSpeed = 0.5
    this.r = 10; // Radius
    this.fillColor = 'white';
    this.hoverFillColor = null;
    this.ctx = ctx;
  }

  mouseMove() {
    this.hoverFillColor = this.hoverFillColor || "lavender";
  }

  mouseOut(){
    this.hoverFillColor=null;
  }

  mouseDown(diff){
    if (diff === 0){
      this.fillColor = 'hsl('+ (this.i/_dotCount+0.5)*360 +',100%,50%)';
      this.hoverFillColor = "green";
      aCorrect.play();
    } else if (diff > 0){
      this.hoverFillColor = "red";
      aWrong.play();
    } else {
      this.hoverFillColor = "green";
    }
  }

  step(){
    if (this.p.distanceTo(this.destP) < 2) {
      this.p = this.destP;
      return;
    }
    this.p.x -= (this.p.x - this.destP.x) *this.divSpeed;
    this.p.y -= (this.p.y - this.destP.y) *this.divSpeed;
  }

  paint () {
    let ctx = this.ctx;  
    ctx.strokeStyle= 'black';
    
    ctx.beginPath();
    ctx.arc(this.p.x,this.p.y,
      this.r,0,2 * Math.PI);
    
    ctx.fillStyle = this.hoverFillColor || this.fillColor;
    ctx.fill();
    ctx.stroke();
    
    ctx.font = "12px Verdana";
    ctx.fillStyle = 'black';    
    ctx.fillText(this.i + 1,this.p.x-this.r/2,this.p.y+this.r/2);
    ctx.stroke();
  }


}

document.getElementById('start-game').onclick = async function() {
  
  // clear the game canvas
  _ctx.clearRect(0, 0, _c.width, _c.height);
  
  // collect image url
  const imageUrl = document.getElementById('picture-url').value;
  
  
  _img = document.createElement('img');
  _img.src = imageUrl;
  let pictureRect = new Rectangle(0,0,150,150);

  // collect dot count
  _dotCount = +document.getElementById('dot-count').value;
  
  // reset other variables
  _currentDot = 0;
  _rainbowOn = false;
  _difficulty = document.getElementById('difficulty').value;
  
  // create points
  _pts = [];
  let excludeRect = pictureRect.shrink(-20);
  for (let i = 0; i < _dotCount; i++){
    _pts.push(getRandomPoint(excludeRect,_pts));
  }

  // create dots
  _dots = [];
  for (let i = 0; i < _dotCount; i++){
    let d = new Dot(i,_pts[i],_ctx);
    if (i===0) d.fillColor = "lightgreen";
    _dots.push(d);
  }

  // draw image in top left corner
  _img.onload = function(){
    _ctx.drawImage(_img,0,0,150,150);
  
      
    // set up picture pieces
    _picturePieces = getPicturePieces(_img, _dots,_ctx);
  }

  if (_stepInterval) clearInterval(_stepInterval);
  _stepInterval = setInterval(step,40);

  paint();

  // mouse events

  _c.onmousemove = mouseMove;
  _c.onmousedown = mouseDown;
  _c.onmouseup = mouseUp;
}
function getRandomPoint(excludeRect,dots){
  let p;
  const minDist = 100;
  a = new Rectangle(0,0,_c.width,_c.height).shrink(40);
  
  if (!excludeRect || !dots)
    return new Point(
      randomInt(a.x, a.right),
      randomInt(a.y, a.bottom)
      );

  do {
    p = new Point(
      randomInt(a.x, a.right),
      randomInt(a.y, a.bottom)
      );
  } while (excludeRect.pointInside(p) ||
  !farEnoughFromOtherPoints(dots,p,minDist))
  return p; 
}

function randomInt(min,max)
{
  return Math.floor(min + Math.random() * (max-min));
}

function farEnoughFromOtherPoints(pts,p, minDist){
  let farEnough = true;
  for (let i = 0;farEnough && i < pts.length;i++){
    if (p.distanceTo(pts[i]) < minDist)
      farEnough = false;
  }
  return farEnough;
}

function getPicturePieces(img, dots, ctx){
  // all picture pieces need to be squares
  // maximize the amount of area covered
  
  let w = img.width;
  let h = img.height;
  console.log(img);
  let sw = Math.min(
    Math.ceil(Math.sqrt(w*h/dots.length)),
    Math.min(w, h)
  ) // square width
  

  let picturePieces = [];
  let x = 0; let y = 0;
  let sx = 0; sy = 0;

  for (let i = 0; i < dots.length; i++){
    let d = dots[i];
    sx = x * sw;
    sy = y * sw;
    sr = new Rectangle(sx,sy,sw,sw);   
    let p = new PicturePiece(d,img,sr, ctx);
    picturePieces.push(p);

    // calculate coordinates
    x++;
    if ((x+0.5)*sw>w){
      x=0;y++;
    }
  }

  return picturePieces;
}

function step(){

  // Rainbow dots
  if (!_dots || _dots.length === 0) return;
  if (_currentDot > 1 && _rainbowOn){
    tempColor = "" + _dots[0].fillColor;
    for (let i =0; i < _currentDot-1 && i < _dotCount - 1; i++){
      _dots[i].fillColor = _dots[i+1].fillColor;
    }
    _dots[Math.min(_currentDot-1, _dotCount-1)].fillColor = tempColor;
  }

  // Move the picture pieces
  for (let i = 0 ; i < _dotCount; i++){
    _picturePieces[i].step();
  }

  // Celebrating dots
  let randomness = 0.05;
  let speed = 0.1;
  for (let i = 0; i < _dotCount; i++){
    if (_rainbowOn || 
      (_difficulty==="hard" && i == _currentDot && _currentDot > 0) || 
      (_difficulty === "extreme" && _currentDot > 0)
      ){
      
      _dots[i].step();
      if (Math.random()<randomness){
        _dots[i].destP = getRandomPoint();
        _dots[i].divSpeed= Math.random()*speed+0.0;
      }
    }
  
  } 

  paint();
}

function paint(){
  _ctx.clearRect(0, 0, _c.width, _c.height);
  let r = 10;

  // draw lines
  for (let i = 0; i < _dotCount - 1; i++){
    let c = (_rainbowOn) ? _dots[i].fillColor : "black"; 
    if (i < _currentDot - 1) 
      drawLine(_dots[i].p,_dots[i+1].p, c);
  }

  for (let i = 0; i < _dotCount; i++){
    let d = _dots[i];
    d.paint(); // draw dots
  }

  if (!!_picturePieces){
    for (let i = 0; i < _dotCount; i++){
      let p = _picturePieces[i];
      if (p) p.paint(); // draw picture pieces
    }
  }
}
function drawLine(p1, p2, c){
  _ctx.strokeStyle= c;
  _ctx.beginPath();
  _ctx.moveTo(p1.x,p1.y);
  _ctx.lineTo(p2.x,p2.y);
  _ctx.stroke();
}

function mouseMove(e){
  let p = new Point(e.offsetX, e.offsetY);
  
  let cursorStyle = "";
  for (let i = 0; i < _dotCount; i++){
    let d = _dots[i];

    // click on dot
    if (d.p.distanceTo(p) < d.r){
      cursorStyle = "pointer";
      d.mouseMove();
    } else {
      d.mouseOut();
    }
  }

  _c.style.cursor = cursorStyle;
  paint();
}

function mouseDown(e){
  let p = new Point(e.offsetX, e.offsetY);
  for (let i = 0; i < _dotCount; i++){
    let d = _dots[i];
    let pp = _picturePieces[i];

    // click on dot
    if (d.p.distanceTo(p) < d.r){
      if (i===0)   // start sound
        aStart.play();

      let exact = i===_currentDot;
      d.mouseDown(i - _currentDot);
      pp.mouseDown(i - _currentDot);

      if (exact) _currentDot++;
      if (_currentDot === _dotCount){
        aWin.play();
        _rainbowOn = true;
        _currentDot++;
      }
    }
  }
  paint();
}

function mouseUp(e){
  let p = new Point(e.offsetX, e.offsetY);
}