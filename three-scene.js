/**
 * Experiencia Comunica — Three.js Scenes
 * 1. Hero: particle constellation + torus knot + rings
 * 2. About: interactive morphing speech-bubble sphere
 * 3. Feelings: floating interconnected nodes
 * 4. Speakers: subtle background particles
 */
(function () {
  'use strict';

  if (typeof THREE === 'undefined') return;

  // ================================================================
  // HERO SCENE
  // ================================================================
  (function heroScene() {
    var canvas = document.getElementById('heroCanvas');
    if (!canvas) return;

    var PARTICLE_COUNT = 2000;
    var w = window.innerWidth, h = window.innerHeight;
    var mx = 0, my = 0, tmx = 0, tmy = 0;
    var visible = true;

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06061a, 0.0007);

    var cam = new THREE.PerspectiveCamera(55, w / h, 1, 2000);
    cam.position.z = 550;

    var ren = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    ren.setSize(w, h);
    ren.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    ren.setClearColor(0x06061a, 1);

    // Particles
    var pg = new THREE.BufferGeometry();
    var pos = new Float32Array(PARTICLE_COUNT * 3);
    var col = new Float32Array(PARTICLE_COUNT * 3);
    var vel = new Float32Array(PARTICLE_COUNT * 3);
    var tc = new THREE.Color();
    var BLUE = new THREE.Color(0x2E5BFF), PURP = new THREE.Color(0x743AF6);

    for (var i = 0; i < PARTICLE_COUNT; i++) {
      var i3 = i * 3;
      pos[i3] = (Math.random() - 0.5) * 1500;
      pos[i3+1] = (Math.random() - 0.5) * 1500;
      pos[i3+2] = (Math.random() - 0.5) * 1500;
      vel[i3] = (Math.random() - 0.5) * 0.12;
      vel[i3+1] = (Math.random() - 0.5) * 0.12;
      vel[i3+2] = (Math.random() - 0.5) * 0.12;
      tc.copy(BLUE).lerp(PURP, Math.random());
      col[i3] = tc.r; col[i3+1] = tc.g; col[i3+2] = tc.b;
    }
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    scene.add(new THREE.Points(pg, new THREE.PointsMaterial({
      size: 2, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending,
      sizeAttenuation: true, depthWrite: false, vertexColors: true
    })));

    // Dust
    var dg = new THREE.BufferGeometry();
    var dp = new Float32Array(600 * 3);
    for (var d = 0; d < 600; d++) { dp[d*3]=(Math.random()-0.5)*2000; dp[d*3+1]=(Math.random()-0.5)*2000; dp[d*3+2]=(Math.random()-0.5)*2000; }
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    var dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0x8888cc, size: 0.6, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(dust);

    // Central torus knot
    var knot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(65, 20, 120, 16, 2, 3),
      new THREE.MeshStandardMaterial({ color: 0x2E5BFF, emissive: 0x2E5BFF, emissiveIntensity: 0.2, wireframe: true, transparent: true, opacity: 0.25 })
    );
    scene.add(knot);

    // Inner icosahedron
    var inner = new THREE.Mesh(
      new THREE.IcosahedronGeometry(35, 1),
      new THREE.MeshStandardMaterial({ color: 0x743AF6, emissive: 0x743AF6, emissiveIntensity: 0.15, wireframe: true, transparent: true, opacity: 0.2 })
    );
    scene.add(inner);

    // Rings
    var ring1 = new THREE.Mesh(new THREE.TorusGeometry(120, 1.5, 16, 80), new THREE.MeshBasicMaterial({ color: 0x483DF8, transparent: true, opacity: 0.12 }));
    ring1.rotation.x = Math.PI / 2.2;
    scene.add(ring1);
    var ring2 = new THREE.Mesh(new THREE.TorusGeometry(150, 0.8, 16, 100), new THREE.MeshBasicMaterial({ color: 0x2E5BFF, transparent: true, opacity: 0.06 }));
    ring2.rotation.x = Math.PI / 3; ring2.rotation.z = Math.PI / 6;
    scene.add(ring2);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.1));
    var l1 = new THREE.PointLight(0x2E5BFF, 3, 600); l1.position.set(0,0,200); scene.add(l1);
    var l2 = new THREE.PointLight(0x743AF6, 2, 500); l2.position.set(-200,100,-100); scene.add(l2);
    var l3 = new THREE.PointLight(0x483DF8, 1.5, 400); l3.position.set(150,-80,100); scene.add(l3);

    // Constellation lines
    var lg = new THREE.BufferGeometry();
    var ml = 250, lp = new Float32Array(ml * 6);
    lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
    lg.setDrawRange(0, 0);
    var lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x4060ff, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending }));
    scene.add(lines);

    function updateLines() {
      var p = pg.attributes.position.array, idx = 0, th = 110*110, st = 10;
      for (var a = 0; a < PARTICLE_COUNT && idx < ml; a += st)
        for (var b = a+st; b < PARTICLE_COUNT && idx < ml; b += st) {
          var dx = p[a*3]-p[b*3], dy = p[a*3+1]-p[b*3+1], dz = p[a*3+2]-p[b*3+2];
          if (dx*dx+dy*dy+dz*dz < th) {
            var base = idx*6;
            lp[base]=p[a*3]; lp[base+1]=p[a*3+1]; lp[base+2]=p[a*3+2];
            lp[base+3]=p[b*3]; lp[base+4]=p[b*3+1]; lp[base+5]=p[b*3+2];
            idx++;
          }
        }
      lg.setDrawRange(0, idx*2);
      lg.attributes.position.needsUpdate = true;
    }

    var frame = 0;
    function animate() {
      requestAnimationFrame(animate);
      if (!visible) return;
      frame++;
      var t = frame * 0.007;

      tmx += (mx - tmx) * 0.04; tmy += (my - tmy) * 0.04;
      cam.position.x += (tmx * 180 - cam.position.x) * 0.018;
      cam.position.y += (-tmy * 180 - cam.position.y) * 0.018;
      cam.lookAt(scene.position);

      knot.rotation.x = t * 0.2; knot.rotation.y = t * 0.15; knot.rotation.z = Math.sin(t*0.3)*0.1;
      inner.rotation.x = -t * 0.3; inner.rotation.y = t * 0.25;
      ring1.rotation.z = t * 0.08; ring2.rotation.y = -t * 0.05;
      dust.rotation.y = t * 0.015;

      var pp = pg.attributes.position.array;
      for (var p = 0; p < PARTICLE_COUNT; p++) {
        var p3 = p*3;
        pp[p3]+=vel[p3]; pp[p3+1]+=vel[p3+1]; pp[p3+2]+=vel[p3+2];
        if (Math.abs(pp[p3])>750) vel[p3]*=-1;
        if (Math.abs(pp[p3+1])>750) vel[p3+1]*=-1;
        if (Math.abs(pp[p3+2])>750) vel[p3+2]*=-1;
      }
      pg.attributes.position.needsUpdate = true;

      l1.position.x = Math.sin(t*0.4)*250; l1.position.z = Math.cos(t*0.4)*250; l1.position.y = Math.sin(t*0.25)*80;
      l2.position.x = Math.cos(t*0.3)*200; l2.position.y = Math.sin(t*0.35)*150;

      if (frame % 5 === 0) updateLines();
      ren.render(scene, cam);
    }

    window.addEventListener('mousemove', function(e) { mx = (e.clientX/w)*2-1; my = (e.clientY/h)*2-1; });
    window.addEventListener('resize', function() { w = window.innerWidth; h = window.innerHeight; cam.aspect = w/h; cam.updateProjectionMatrix(); ren.setSize(w,h); });
    new IntersectionObserver(function(e) { visible = e[0].isIntersecting; }, { threshold: 0.05 }).observe(canvas);
    animate();
  })();

  // ================================================================
  // ABOUT SCENE — Morphing sphere with orbiting particles
  // ================================================================
  (function aboutScene() {
    var canvas = document.getElementById('aboutCanvas');
    if (!canvas) return;

    var parent = canvas.parentElement;
    var size = parent.clientWidth || 400;
    var visible = true;

    var scene = new THREE.Scene();
    var cam = new THREE.PerspectiveCamera(50, 1, 1, 1000);
    cam.position.z = 200;

    var ren = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    ren.setSize(size, size);
    ren.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    ren.setClearColor(0x000000, 0);

    // Central morphing sphere
    var sphereGeo = new THREE.IcosahedronGeometry(55, 4);
    var originalPos = sphereGeo.attributes.position.array.slice();
    var sphereMat = new THREE.MeshStandardMaterial({
      color: 0x2E5BFF,
      emissive: 0x1a1a80,
      emissiveIntensity: 0.4,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    var sphere = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphere);

    // Solid inner glow sphere
    var glowGeo = new THREE.IcosahedronGeometry(30, 3);
    var glowMat = new THREE.MeshBasicMaterial({
      color: 0x743AF6,
      transparent: true,
      opacity: 0.08
    });
    scene.add(new THREE.Mesh(glowGeo, glowMat));

    // Orbiting mini-spheres (like ideas orbiting)
    var orbiters = [];
    for (var o = 0; o < 8; o++) {
      var oMat = new THREE.MeshBasicMaterial({
        color: o % 2 === 0 ? 0x2E5BFF : 0x743AF6,
        transparent: true,
        opacity: 0.6
      });
      var oMesh = new THREE.Mesh(new THREE.SphereGeometry(2.5 + Math.random() * 2, 8, 8), oMat);
      var angle = (o / 8) * Math.PI * 2;
      var radius = 75 + Math.random() * 20;
      oMesh.userData = { angle: angle, radius: radius, speed: 0.3 + Math.random() * 0.4, yOffset: (Math.random() - 0.5) * 40 };
      scene.add(oMesh);
      orbiters.push(oMesh);
    }

    // Orbiting particles
    var opg = new THREE.BufferGeometry();
    var opp = new Float32Array(200 * 3);
    var opc = new Float32Array(200 * 3);
    var opTc = new THREE.Color();
    for (var op = 0; op < 200; op++) {
      var a = Math.random() * Math.PI * 2;
      var r = 50 + Math.random() * 80;
      opp[op*3] = Math.cos(a) * r;
      opp[op*3+1] = (Math.random() - 0.5) * 80;
      opp[op*3+2] = Math.sin(a) * r;
      opTc.copy(new THREE.Color(0x2E5BFF)).lerp(new THREE.Color(0x743AF6), Math.random());
      opc[op*3] = opTc.r; opc[op*3+1] = opTc.g; opc[op*3+2] = opTc.b;
    }
    opg.setAttribute('position', new THREE.BufferAttribute(opp, 3));
    opg.setAttribute('color', new THREE.BufferAttribute(opc, 3));
    var orbParts = new THREE.Points(opg, new THREE.PointsMaterial({
      size: 1.5, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending,
      depthWrite: false, vertexColors: true, sizeAttenuation: true
    }));
    scene.add(orbParts);

    // Lights
    scene.add(new THREE.AmbientLight(0x4444aa, 0.3));
    var sl1 = new THREE.PointLight(0x2E5BFF, 2, 300); sl1.position.set(100, 50, 100); scene.add(sl1);
    var sl2 = new THREE.PointLight(0x743AF6, 1.5, 300); sl2.position.set(-80, -40, 80); scene.add(sl2);

    var frame = 0;
    function animate() {
      requestAnimationFrame(animate);
      if (!visible) return;
      frame++;
      var t = frame * 0.008;

      // Morph sphere vertices with noise-like displacement
      var sPos = sphereGeo.attributes.position.array;
      for (var v = 0; v < sPos.length; v += 3) {
        var ox = originalPos[v], oy = originalPos[v+1], oz = originalPos[v+2];
        var len = Math.sqrt(ox*ox + oy*oy + oz*oz);
        var noise = Math.sin(ox*0.05 + t) * Math.cos(oy*0.05 + t*0.7) * Math.sin(oz*0.05 + t*0.5);
        var displacement = 1 + noise * 0.12;
        sPos[v] = ox * displacement;
        sPos[v+1] = oy * displacement;
        sPos[v+2] = oz * displacement;
      }
      sphereGeo.attributes.position.needsUpdate = true;

      sphere.rotation.y = t * 0.2;
      sphere.rotation.x = Math.sin(t * 0.15) * 0.2;

      // Orbiters
      for (var oi = 0; oi < orbiters.length; oi++) {
        var ob = orbiters[oi];
        var ud = ob.userData;
        ud.angle += ud.speed * 0.01;
        ob.position.x = Math.cos(ud.angle) * ud.radius;
        ob.position.z = Math.sin(ud.angle) * ud.radius;
        ob.position.y = ud.yOffset + Math.sin(t + oi) * 10;
      }

      orbParts.rotation.y = t * 0.05;

      sl1.position.x = Math.sin(t * 0.3) * 120;
      sl1.position.z = Math.cos(t * 0.3) * 120;

      ren.render(scene, cam);
    }

    function onResize() {
      size = parent.clientWidth || 400;
      ren.setSize(size, size);
    }
    window.addEventListener('resize', onResize);
    new IntersectionObserver(function(e) { visible = e[0].isIntersecting; }, { threshold: 0.05 }).observe(canvas);
    animate();
  })();

  // ================================================================
  // SPEAKERS SCENE — Subtle background particles
  // ================================================================
  (function speakersScene() {
    var canvas = document.getElementById('speakersCanvas');
    if (!canvas) return;

    var parent = canvas.parentElement;
    var w = parent.clientWidth || window.innerWidth;
    var h = parent.clientHeight || 600;
    var visible = true;

    var scene = new THREE.Scene();
    var cam = new THREE.PerspectiveCamera(50, w / h, 1, 1000);
    cam.position.z = 300;

    var ren = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    ren.setSize(w, h);
    ren.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    ren.setClearColor(0x000000, 0);

    // Floating particles
    var pg = new THREE.BufferGeometry();
    var count = 500;
    var pp = new Float32Array(count * 3);
    var pc = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      pp[i*3] = (Math.random()-0.5)*600;
      pp[i*3+1] = (Math.random()-0.5)*400;
      pp[i*3+2] = (Math.random()-0.5)*300;
      var c = new THREE.Color(0x2E5BFF).lerp(new THREE.Color(0x743AF6), Math.random());
      pc[i*3] = c.r; pc[i*3+1] = c.g; pc[i*3+2] = c.b;
    }
    pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    pg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
    scene.add(new THREE.Points(pg, new THREE.PointsMaterial({
      size: 1.5, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending,
      depthWrite: false, vertexColors: true
    })));

    // Floating rings
    for (var r = 0; r < 3; r++) {
      var rMesh = new THREE.Mesh(
        new THREE.TorusGeometry(40 + r * 30, 0.5, 8, 60),
        new THREE.MeshBasicMaterial({ color: r === 0 ? 0x2E5BFF : 0x743AF6, transparent: true, opacity: 0.06 })
      );
      rMesh.rotation.x = Math.PI / (2 + r);
      rMesh.rotation.z = r * 0.5;
      rMesh.position.x = (r - 1) * 100;
      rMesh.userData = { rotSpeed: 0.001 + r * 0.0005 };
      scene.add(rMesh);
    }

    var frame = 0;
    function animate() {
      requestAnimationFrame(animate);
      if (!visible) return;
      frame++;

      scene.children.forEach(function(child) {
        if (child.userData && child.userData.rotSpeed) {
          child.rotation.z += child.userData.rotSpeed;
          child.rotation.y += child.userData.rotSpeed * 0.5;
        }
      });

      var pts = pg.attributes.position.array;
      for (var p = 0; p < count; p++) {
        pts[p*3+1] += Math.sin(frame * 0.005 + p) * 0.05;
      }
      pg.attributes.position.needsUpdate = true;

      ren.render(scene, cam);
    }

    function onResize() {
      w = parent.clientWidth || window.innerWidth;
      h = parent.clientHeight || 600;
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      ren.setSize(w, h);
    }
    window.addEventListener('resize', onResize);
    new IntersectionObserver(function(e) { visible = e[0].isIntersecting; }, { threshold: 0.05 }).observe(canvas);
    animate();
  })();

})();
