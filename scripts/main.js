var rnd = Math.random.bind(Math);
var cos = Math.cos.bind(Math);
var sin = Math.sin.bind(Math);
var sqrt = Math.sqrt.bind(Math);

var winlisten = window.addEventListener.bind(window);
winlisten("load", initialize);

const LEFT = 37;
const RIGHT = 39;
const SPACE = 32;
const UP = 38;

const MAX_SPEED = 3;
const MAX_THROTTLE = 0.6;

const MAX_HEALTH = 100;
const W = 800;
const H = 600;
const PI = Math.PI;

function prot(fn) { return fn.prototype; };

function chain(t,p) {
    t.prototype = Object.create(p.prototype);
    t.prototype.constructor = t;
    return prot(t);
}

function V2 (x,y){
    this.x = typeof(x)!="undefined"? x : 0;
    this.y = typeof(y)!="undefined"? y : 0;
}

var _ = null;

_ = prot(V2);

_.fromAngle = function (a,r) {
    this.x = cos(a)*r;
    this.y = sin(a)*r;
    return this;
};

_.angle  = function () {
    var me = this;
    return Math.atan2(me.y, me.x);
};

_.angleTo  = function (o) {
    var me = this;
    return me.clone().add(o.clone().mul(-1)).angle();
};

_.copyFrom = function (o) {
    var me = this;
    me.x = o.x;
    me.y = o.y;
    return me;
};
_.clone = function (){
    return (new V2(this.x,this.y));
}
_.mul = function (v){
    var me = this;
    me.x*=v;
    me.y*=v;
    return me;
}

_.distSqure = function (o){
    o = o || new V2();
    var dx = this.x - o.x;
    var dy = this.y - o.y;
    return (dx*dx + dy*dy);
};

_.dist = function (o){
    return sqrt(this.distSqure(o));
};

_.add = function (x,y){
    var me = this;
    if (x instanceof V2){
        me.x+=x.x;
        me.y+=x.y;
    }else{
        me.x+=x;
        me.y+=y;
    }
    return me;
}

var V2Zero = new V2();

function isundef(o){return typeof(o) == "undefined";}

function GO (o){
    var me = this;
    me.pos = !isundef(o.pos) ? o.pos.clone() : new V2();
    me.vel = !isundef(o.vel) ? o.vel.clone() : new V2();
    me.size = o.size || 0;
    me.angle = o.angle || 0;
    me.alpha = 1;
    me.alphaV = 1;
}

_ = prot(GO);

_.update = function (g) {
    var me = this;
    me.pos.add(me.vel);
    me.pos.x = clamp(me.pos.x,0-me.size,W+me.size);
    me.pos.y = clamp(me.pos.y,0-me.size,H+me.size);
};

function Asteroid (o) {
    var me = this;
    o = o || {};
    o.pos = o.pos || new V2(rnd()*W,rnd()*H);
    o.vel = o.vel || (new V2()).fromAngle(rnd()*PI*2,rnd()*2+1);
    o.size = o.size || 40;
    GO.call(this,o);
    me.points = [];
    me.angleV = -0.1 + rnd()*0.2;
    me.scaleV = 1.3
    me.scale = 0.01
    var n = 129;
    var step = 2*PI*(1.0/n)
    var angle = 0.0
    var steps = rnd()*10 + 5.0
    var shapeAngle = 0.0
    var shapeAngleStep = -0.3 + rnd()*0.6
    for (var i = 0; i<n; i++){
        this.points[i] = new V2();
        this.points[i].fromAngle(angle, this.size + (cos(shapeAngle))*(this.size/10))
        angle+=step
        shapeAngle+=shapeAngleStep
        steps -= 1
        if (steps<=0){
            shapeAngleStep = -0.3 + rnd()*0.6
            steps = rnd()*10 + 5.0
        }
    }
}

_=chain(Asteroid, GO);

_.update = function (g) {
    var me = this;
    GO.prototype.update.call(me,g);
    me.angle+=me.angleV;
    me.scale*=this.scaleV;
    if (me.scaleV!=1){
        if (me.scaleV>1 && me.scale>=1){
            me.scaleV = 1;
        }else if (me.scaleV < 1 && me.scale<=0.1) {
            if (!me.isRemoved) {
                if (me.size > 15) {
                    for (var i = (rnd() * 3 + 1) << 1; i >= 0; --i) {
                        var stone = g.asteroids.add(new Asteroid({
                            pos: me.pos.clone(),
                            size: me.size / 3,
                            vel: V2Zero.clone()
                        }));
                        stone.vel.fromAngle(rnd() * 2 * PI, 1 + rnd() * 2);
                    }
                }
                g.spawnCollectibles(me.pos);
            }
            g.asteroids.remove(me);
        }
    }else{
        if (g.ship.pos.dist(me.pos)< 10+me.scale*me.size){
            g.ship.damage(0.45);
        }
    }
}

_.startShrink = function () {
    var me = this;
    me.scaleV = 0.95;
    me.vel.mul(0);
};

_.markAsRemoved = function () {
    this.startShrink();
    this.isRemoved = true;
};

_.draw = function (g,ctx) {
    var me = this;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.translate(me.pos.x,me.pos.y);
    ctx.rotate(me.angle);
    ctx.scale(me.scale,me.scale);
    ctx.beginPath();
    ctx.fillStyle="#888";
    ctx.strokeStyle="#999";
    ctx.lineWidth = 4;
    ctx.moveTo(me.points[0].x,me.points[0].y);
    for (var i = 0, n= me.points.length;i<n;++i) {
        ctx.lineTo(me.points[i].x, me.points[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
}

function Ship(p){
    p = p || {};
    GO.call(this,p);
    this.hullColor = p.hullColor || "blue"
    this.init();
}


_=chain(Ship,GO);

_.init = function () {
    this.pos.x = W*0.5;
    this.pos.y = H*0.5;
    this.health = MAX_HEALTH;
    this.throttle = 0;
    this.lastShot = 0;
};

_.reset = function () {
    this.init();
};

_.damage = function (v) {
    var me=this;
    me.health=Math.min(MAX_HEALTH,Math.max(me.health-v,0));
};

_.repair = function (v) {
    this.damage(-v);
};

_.update = function (g) {
    var me = this;
    GO.prototype.update.call(me,g);
    if (me.throttle > 0){
        var particle = g.particles.add(new Particle({pos:(new V2()).copyFrom(me.pos)}));
        particle.vel.fromAngle(me.angle + PI, 3);
        particle.size = 1 + rnd()*3;
    }
};

_.draw = function(g,ctx){
    var me = this;
    ctx.save();
    ctx.fillStyle = me.hullColor;
    ctx.translate(me.pos.x, me.pos.y);
    var size = 10.0;
    ctx.rotate(me.angle - PI*0.5);
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.strokeStyle = "white";
    ctx.moveTo(-size*0.5,-size*0.5);
    ctx.lineTo(0.0,size*0.5);
    ctx.lineTo(size*0.5,-size*0.5);
    ctx.lineTo(0.0,-size*0.25);
    ctx.lineTo(-size*0.5,-size*0.5);
    ctx.lineTo(0.0,size*0.5);
    ctx.stroke();
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.restore();
};

function EnemyShip () {
    Ship.call(this,{hullColor:"red",});
    this.pos.copyFrom(new V2(rnd()*W,rnd()*H));
    this.lastThrottle = 0;
}

_=chain(EnemyShip,Ship);

_.update = function (g) {
    var me = this;
    Ship.prototype.update.call(me, g);

    if (me.health<=0){
        g.enemies.remove(me);
        g.spawnCollectibles(me.pos);
        return;
    }
    var targetAngle = g.ship.pos.angleTo(me.pos);

    me.angle+=(targetAngle - me.angle)*0.9;

    if (me.pos.dist(g.ship.pos) > 50){
        if ((g.time - me.lastThrottle > 1000)){
            me.throttle=Math.min(me.throttle+0.2,MAX_THROTTLE);
            me.lastThrottle = g.time;
        }else{
            me.throttle*=0.99;
            me.vel.mul(0.99);
        }
    }else{
        me.throttle*=0;
        me.vel.mul(0.5);
    }


    if (g.time - me.lastShot>300 && me.pos.dist(g.ship.pos) < 180) {
        g.bullets.add(new EnemyBullet({pos:me.pos.clone(), vel:(new V2()).fromAngle(me.angle,5)}));
        me.lastShot = g.time;
    }

    var force = (new V2()).fromAngle(me.angle, me.throttle);

    if (new V2().copyFrom(me.vel).add(force).dist(V2Zero)<MAX_SPEED){
        me.vel.add(force);
    };

};

function PlayerShip () {
    Ship.call(this);
}
_=chain(PlayerShip,Ship);

_.update = function (g) {
  Ship.prototype.update.call(this, g);
  var me = this;
  var keys = globals.keys;
  if (keys[LEFT]){
      me.angle-=0.05;
  }else if (keys[RIGHT]){
      me.angle+=0.05;
  }
  if (keys[UP]){
      me.throttle=Math.min(me.throttle+0.01,MAX_THROTTLE);
  }else{
      me.throttle=0;
      me.vel.mul(0.99);
  }

  if (keys[SPACE] && g.time - me.lastShot>100) {
    g.bullets.add(new Bullet({pos:me.pos.clone(), vel:(new V2()).fromAngle(me.angle,5)}));
    me.lastShot = g.time;
  }
  var force = (new V2()).fromAngle(me.angle, me.throttle);

  if (new V2().copyFrom(me.vel).add(force).dist(V2Zero)<MAX_SPEED){
      me.vel.add(force);
  };
  if (g.upgrades.regen > 0 && me.health<MAX_HEALTH){
      me.damage(-(g.upgrades.regen*0.04));
  }
};
_.draw = function (g,ctx) {
    var me = this;
    Ship.prototype.draw.call(this, g, ctx);
    ctx.save();
    ctx.translate(30.0,40.0);
    ctx.fillStyle = "#888";
    ctx.fillRect(0.0,0.0,204.0,8.0);
    ctx.fillStyle = "green";
    ctx.fillRect( 2.0,2.0,200.0 * (me.health/MAX_HEALTH),4.0);
    ctx.restore();
}

function Dot (o) {
    GO.call(this,o);
    this.color = o.color || "#fff";
    this.alphaV = 1;
}

_ = chain(Dot,GO);

_.update = function (g) {
    GO.prototype.update.call(this,g);
    if (this.alphaV!=1){
        if (this.alphaV<1){
            if (this.alpha>0.01){
                this.alpha*=this.alphaV;
            }else{
                this.alphaV = 1.1;
            }

        }else if (this.alphaV>1){
            if (this.alpha<1){
                this.alpha*=this.alphaV;
            }else{
                this.alphaV = 1;
            }
        }
    }
};

_.draw = function (g, ctx){
    var me = this;

    ctx.save();
    ctx.fillStyle = me.color;
    ctx.globalAlpha = me.alpha;
    ctx.beginPath();
    ctx.arc(me.pos.x,me.pos.y,me.size,0,PI*2);
    ctx.stroke();
    ctx.fill();
    ctx.restore();
};

function Collectible(o){
    Dot.call(this, o);
    this.size = o.size || 6;
    this.color = o.color || "#0f0";
    this.vel.fromAngle(2*PI*rnd(),2);
    this.scaleV = 0.95;
}
_ = chain(Collectible,Dot);

_.update = function (g) {
    var me = this;
    Dot.prototype.update.call(me, g);
    if (me.pos.dist(g.ship.pos)<20 + g.upgrades.magnet*5){
        var tmp = V2Zero.clone();
        tmp.add(me.pos);
        tmp.mul(-1);
        tmp.add(g.ship.pos);
        tmp.fromAngle(tmp.angle(),Math.min(1+g.upgrades.magnet*0.25,3));
        me.vel.copyFrom(tmp);
    }else{
        me.vel.mul(0.96);
    }
    me.alpha *= 0.99;

    me.size*=me.scaleV;
    if (me.scaleV < 1 && me.size<3){
        me.scaleV = 1.05;
    }else if(me.scaleV>1 && me.size>6){
        me.scaleV = 0.95;
    }

    if (me.alpha < 0.1) {
        g.collectibles.remove(me);
        return;
    }else if (me.pos.dist(g.ship.pos)<10){
        g.addScore(5);
        g.collectibles.remove(me);
        return;
    }else{

    }
};


function Bullet (o) {
    Dot.call(this,o);
    this.size = 5;
    this.color = o.color || "#f00";
}

_ = chain(Bullet,Dot);

_.beforeRemoval = function (g) {
    var me = this;
    if (g.upgrades.explosiv>0 && !me.exploded){
        var n = (g.upgrades.explosiv + rnd()*g.upgrades.explosiv)<<0;
        for (var j = 0;j<n;++j){
            var bullet = g.bullets.add(new Bullet({pos:me.pos.clone(),vel:(new V2()).fromAngle(rnd()*PI*2,5)}));
            bullet.exploded = true;
        }
    }
};
_.update = function (g) {
    Dot.prototype.update.call(this,g);
    var me = this;
    me.alpha*=0.96;
    if (me.alpha<0.1){
        g.bullets.remove(this);
        return;
    }
    var stones = g.asteroids;
    if (!stones.length>0){
        return;
    }
    var minDist = stones.list[0].pos.dist(me.pos);
    var minDistIndex = 0;
    for (var i = stones.length - 1; i>=0 ; i--){
        var stone = stones.list[i];
        if (stone.scaleV == 1){
            if (stone.pos.dist(me.pos)<stone.size+me.size) {
                me.beforeRemoval(g);
                g.bullets.remove(this);
                stone.startShrink();
                return;
            }
            if (stone.pos.dist(me.pos)<minDist){
                minDist = stone.pos.dist(me.pos);
                minDistIndex = i;
            }
        }
    }
    if (g.enemies.length <= 0 && g.upgrades.autoaim>0 && minDist<30+g.upgrades.autoaim*25){
        var tmp = V2Zero.clone();
        tmp.add(me.pos);
        tmp.mul(-1);
        tmp.add(stones.list[minDistIndex].pos);
        tmp.fromAngle(tmp.angle(),Math.min(1+g.upgrades.autoaim*0.25,3));
        me.vel.add(tmp);
    }
    var enemies = g.enemies.list;
    if (enemies.length<=0){
        return;
    }
    var found = false;
    enemies.forEach(function(o){
        if (found){
            return;
        }
        if (o.pos.dist(me.pos)<15){
            o.damage(20);
            me.beforeRemoval(g);
            g.bullets.remove(me);
            found=true;
        }
    });

}

function EnemyBullet(o){
    Bullet.call(this,o);
    this.color = "#f92";
    this.size = 3;
}

_ = chain(EnemyBullet,Bullet);

_.update = function (g) {
    Dot.prototype.update.call(this, g);
    var me = this;
    me.alpha *= 0.96;
    if (me.alpha < 0.1) {
        g.bullets.remove(this);
        return;
    }

    if (me.pos.dist(g.ship.pos) < 15){
        g.ship.damage(2);
        g.bullets.remove(me);
        return;
    }
};

function Particle (o) {
    Dot.call(this,o);
    this.color = "#00f";
};

_ = chain(Particle,Dot);

_.update=function(g) {
    var me = this;
    Dot.prototype.update.call(me, g);
    me.size*=1.1;
    me.alpha*=0.9;
    if (me.alpha<0.01){
        g.particles.remove(me);
    }
};

function TextLabel (txt) {
    GO.call(this,{});
    this.txt = txt;
    this.pos.y = H*0.5 + globals.game.texts.length*25;
    this.pos.x = W*0.5 - this.txt.length * 7;
    this.alphaV = 0.97;
}

_ = chain(TextLabel,GO);

_.draw = function(g,ctx) {
    ctx.save();
    ctx.strokeStyle = "gold";
    ctx.font = "30px Courier New";
    ctx.globalAlpha = this.alpha;
    ctx.strokeText(this.txt, this.pos.x, this.pos.y);
    ctx.restore();

};

_.update = function (g) {
    GO.prototype.update.call(this,g);
    this.alpha*=this.alphaV;
    if (this.alpha<0.01){
        g.texts.remove(this);
    }
};

function Star (o){
    Dot.call(this,o);
    this.color = "#fff";
};

_ = chain(Star,Dot);

_.update = function (g) {
    this.vel.copyFrom(g.ship.vel).mul(-1).mul(this.size/6);
    Dot.prototype.update.call(this,g);
};


function clamp (v,min,max){
    if (v<=min){
        v=max;
    }else if (v>=max){
        v=min;
    }
    return v;
}

function GOList (o) {
    o = o || {};
    GO.call(this, o);
    this.list = [];
}

_ = chain(GOList, GO);

Object.defineProperty(_,'length', {get:function(){return this.list.length;}});

_.update=function(g) {
    var me=this;
    GO.prototype.update.call(me,g);
    me.list.forEach(function (o){
        o.update(g);
    });
};

_.clear = function () {
    this.list = [];
};

_.draw=function(g,ctx){
    var me = this;
    me.list.forEach(function (o){
        o.draw(g,ctx);
    });
}

_.add = function (o) {
    var me = this;
    me.list.push(o);
    o.parent = me;
    return o;
};

_.random = function () {
    return this.list[(this.length*rnd())>>0];
}

_.remove = function (o) {
    var me = this;
    for (var i = me.length - 1;i>=0;--i){
        if (me.list[i] === o){
            me.list[i] = me.list[me.list.length-1];
            me.list.length--;
            return;
        }
    }
}

function reset(g) {
    g.score = 0;
    g.stage = 1;
    g.ship.reset();
    g.collectibles.clear();
    g.asteroids.list.forEach(function(o){
        o.markAsRemoved();
    });
    g.particles.clear();
    g.bullets.clear();
    g.texts.clear();
    g.enemies.clear();
}

function update(g) {
    g.time = Date.now();

    if (g.paused) {
        return;
    }
    g.lists.update(g);
    g.ship.update(g);

    if (g.ship.health <= 0){
        reset(g);
    }

    if (g.asteroids.length<=0){
        spawnAsteroids(g);
    }
    if (rnd()<0.05){
        var dot = g.dots.random();
        dot.alphaV = 0.95;
    }
}

function spawnAsteroids(g){
    var n = Math.round(1 + Math.log2(g.stage+1));

    for (var i = n;i>=0;--i) {
        g.asteroids.add(new Asteroid());
    }
    for (var i = Math.round(Math.log2(g.stage+1)); i>0; --i){
        g.enemies.add(new EnemyShip());
    }

    g.texts.add(new TextLabel("Stage " + g.stage));
    g.stage++;
}

function draw(g) {
    var ctx = globals.ctx;
    ctx.clearRect(0,0, W, H);
    ctx.fillStyle = "#000";
    ctx.fillRect(0,0, W, H);
    ctx.fillStyle = "#fff";
    g.lists.draw(g,ctx);
    g.ship.draw(g,ctx);
    ctx.font="26px Courier New";
    ctx.fillText("Score: " + g.score,30,25);
    if (!g.paused){
        return;
    }

    ctx.save();
    ctx.fillStyle = "#bbb";
    ctx.globalAlpha = 0.3;
    ctx.fillRect(0,0,W,H);

    ctx.globalAlpha = 0.6;
    ctx.fillRect(W*0.25,H*0.25,W*0.5,H*0.5);
    ctx.font="70px Courier New";
    ctx.globalAlpha = 1;
    var txt = "PAUSED";

    ctx.lineWidth = 1;
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(W*0.25,H*0.25,W*0.5,H*0.5);
    ctx.strokeText(txt, W*0.5 - txt.length*20,H*0.25 + 60);
    txt = "Press P to continue";
    ctx.font="30px Courier New";
    ctx.strokeText(txt, W*0.5 - txt.length*9,H*0.25 + H*0.5 - 30);
    ctx.font="22px Courier New";
    txt = "Upgrades: (press 1 - 4 to buy)";
    ctx.strokeText(txt, W*0.5 - txt.length*6.5,H*0.25 + 110);

    ctx.font="25px Courier New";

    var upgrades = [{p:"magnet"},
                    {p:"autoaim"},
                    {p:"regen"},
                    {p:"explosiv"},
    ];
    for (var i = 0;i<upgrades.length;++i){
        txt = (i+1) + "." + upgrades[i].p + " lvl " + (g.upgrades[upgrades[i].p]+1) + " *: " + calculateUpgradeCost(g.upgrades[upgrades[i].p]);
        if (g.score >= calculateUpgradeCost(g.upgrades[upgrades[i].p])){
            ctx.strokeStyle = "#0f0";
        }else{
            ctx.strokeStyle = "#f00";
        }
        ctx.strokeText(txt, W*0.5 - txt.length*7.5,H*0.25 + 150 + 28*i);
    }

    ctx.restore();
}
function calculateUpgradeCost(lvl) {
    lvl = Math.min(Math.max(lvl,0),99);
    return parseInt((lvl+1)*25 + Math.log10(lvl + 1));
}
function mainloop(){
    update(globals.game);
    draw(globals.game);
}

var globals = {
    keys: [],
    ctx: null,
    game : {
        score: 0,
        stage: 1,
        paused: false,
        ship: null,
        dots: null,
        particles: null,
        asteroids: null,
        enemies: null,
        bullets: null,
        collectibles: null,
        texts: null,
        upgrades:{
            magnet: 0,
            autoaim: 0,
            regen: 0,
            explosiv: 0,
        },

    }
};

function onkey(e, state){
    var firstPress = state && !globals.keys[e.keyCode];
    globals.keys[e.keyCode] = state;
    var g = globals.game;
    if (state && String.fromCharCode(e.keyCode) == "P"){
        g.paused = !globals.game.paused;
    }
    var powerUp = "";
    if (g.paused && firstPress){
        switch (String.fromCharCode(e.keyCode)) {
            case "1":
                powerUp = "magnet";
                break;
            case "2":
                powerUp = "autoaim";
                break;
            case "3":
                powerUp = "regen";
                break;
            case "4":
                powerUp = "explosiv";
                break;
        }
        if (!powerUp.length){
            return;
        }
        var cost = calculateUpgradeCost(g.upgrades[powerUp]);
        if (g.score >= cost) {
            g.score -= cost;
            g.upgrades[powerUp]++;
        }
    }
}

function onclick(e){
    globals.game.paused = !globals.game.paused;
}

function initialize(){
    var canvas = document.getElementById("canvas");
    var ctx = globals.ctx = canvas.getContext("2d");
    if (!ctx){
        return;
    }
    var g=globals.game;

    g.spawnCollectibles = function (pos) {
        for (var i=0,n=(3+rnd()*3)<<0;i<n;++i) {
            g.collectibles.add(new Collectible({pos:pos}));
        }
    };

    g.addScore = function (v){
        g.score+=v;
    };

    g.score = 0;
    g.ship = new PlayerShip();
    g.lists = new GOList();
    g.lists.add(g.dots = new GOList());
    g.lists.add(g.particles = new GOList());
    g.lists.add(g.asteroids = new GOList());
    g.lists.add(g.bullets = new GOList());
    g.lists.add(g.enemies = new GOList());
    g.lists.add(g.collectibles = new GOList());
    g.lists.add(g.texts = new GOList());
    for (var i = 0; i<256; ++i){
        globals.keys[i] = false;
        g.dots.add(new Star({pos:new V2(rnd()*W,rnd()*H),size:(0.5+rnd()*2)}));
    }
    g.dots.list = g.dots.list.sort(function (a,b) { return a.size - b.size; });
    reset(g);
    winlisten("keyup", function (e) { onkey(e,false);});
    winlisten("keydown", function (e) { onkey(e,true);});
    winlisten("click", onclick);
    onclick();
    window.setInterval(mainloop, 1000/50);
}
