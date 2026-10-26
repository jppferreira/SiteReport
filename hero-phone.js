import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.querySelector('.hero-phone-canvas');
if (canvas) {
  mountPhone(canvas).catch((error) => {
    console.error('Hero phone failed to render', error);
  });
}

async function mountPhone(canvas) {
  await document.fonts.load('700 64px Lexend');
  await document.fonts.load('400 24px Lexend');
  const [mark, crew] = await Promise.all([loadImage('images/mark.png'), loadImage('images/splash-crew.png')]);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 30);
  camera.position.set(0.28, 0.16, 3.35);
  camera.lookAt(0, 0.02, 0);

  const key = new THREE.DirectionalLight(0xfff3e4, 2.6);
  key.position.set(-2.4, 3.4, 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 12;
  key.shadow.camera.left = -2;
  key.shadow.camera.right = 2;
  key.shadow.camera.top = 2;
  key.shadow.camera.bottom = -2;
  key.shadow.bias = -0.0008;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xe7f1ff, 3.4);
  rim.position.set(3.4, 1.1, -1.6);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xffffff, 0.45);
  fill.position.set(-1.2, 0.2, 3);
  scene.add(fill);

  const kick = new THREE.PointLight(0xffffff, 8, 6);
  kick.position.set(-0.8, 1.3, 1.6);
  scene.add(kick);

  const phone = new THREE.Group();
  phone.rotation.order = 'YXZ';
  phone.rotation.set(-0.105, -0.4, 0);
  phone.position.y = 0.02;
  scene.add(phone);

  const bodyWidth = 0.74;
  const bodyHeight = 1.56;
  const bodyDepth = 0.12;
  const brush = brushedRoughness();

  const metal = new THREE.MeshPhysicalMaterial({
    color: 0x3a3e3a,
    metalness: 1,
    roughness: 0.28,
    roughnessMap: brush,
    clearcoat: 0.55,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.7,
  });

  const body = new THREE.Mesh(extrudedPhone(bodyWidth, bodyHeight, bodyDepth, 0.105), metal);
  body.castShadow = true;
  body.receiveShadow = true;
  body.geometry.computeBoundingBox();
  const frontZ = body.geometry.boundingBox.max.z;
  phone.add(body);

  const screenMap = splashTexture(mark, crew);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(bodyWidth - 0.07, bodyHeight - 0.07),
    new THREE.MeshBasicMaterial({ map: screenMap })
  );
  screen.position.z = frontZ + 0.008;
  phone.add(screen);

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(bodyWidth - 0.055, bodyHeight - 0.055),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      transparent: true,
      opacity: 0.14,
      envMapIntensity: 2.2,
      depthWrite: false,
    })
  );
  glass.position.z = frontZ + 0.016;
  phone.add(glass);

  const island = new THREE.Mesh(
    extrudedPhone(0.2, 0.048, 0.016, 0.022),
    new THREE.MeshPhysicalMaterial({
      color: 0x070807,
      metalness: 0.45,
      roughness: 0.32,
      clearcoat: 0.7,
      envMapIntensity: 0.9,
    })
  );
  island.position.set(0, bodyHeight * 0.4, frontZ + 0.028);
  phone.add(island);

  const buttonMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x141614,
    metalness: 1,
    roughness: 0.22,
    roughnessMap: brush,
    clearcoat: 0.8,
    envMapIntensity: 1.8,
  });
  const button = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.16, 0.028), buttonMaterial);
  button.position.set(bodyWidth / 2 + 0.004, 0.28, 0);
  button.castShadow = true;
  phone.add(button);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 0.62),
    new THREE.MeshBasicMaterial({ map: contactShadow(), transparent: true, depthWrite: false })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0.22, -1.02, 0.08);
  scene.add(ground);

  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width < 2 || height < 2) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };

  resize();
  renderer.render(scene, camera);
  requestAnimationFrame(() => {
    resize();
    canvas.dataset.ready = 'true';
  });
  window.addEventListener('resize', resize);
}

function extrudedPhone(width, height, depth, radius) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2 - 0.001, height / 2 - 0.001);
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.absarc(x + width - r, y + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(x + width, y + height - r);
  shape.absarc(x + width - r, y + height - r, r, 0, Math.PI / 2, false);
  shape.lineTo(x + r, y + height);
  shape.absarc(x + r, y + height - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + r);
  shape.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.01,
    bevelSegments: 5,
    curveSegments: 16,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function contactShadow() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 64, 8, 128, 64, 120);
  gradient.addColorStop(0, 'rgba(8, 10, 8, 0.5)');
  gradient.addColorStop(0.55, 'rgba(8, 10, 8, 0.18)');
  gradient.addColorStop(1, 'rgba(8, 10, 8, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function brushedRoughness() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  context.fillStyle = '#8a8a8a';
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    const shade = 110 + Math.random() * 70;
    context.strokeStyle = `rgba(${shade}, ${shade}, ${shade}, 0.55)`;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 3);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

function splashTexture(mark, crew) {
  const width = 780;
  const height = 1688;
  const scale = width / 390;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  context.fillStyle = '#E7FCEE';
  context.fillRect(0, 0, width, height);
  const wash = context.createLinearGradient(0, 0, 0, height * 0.54);
  wash.addColorStop(0, 'rgba(104, 232, 198, 0.2)');
  wash.addColorStop(1, 'rgba(104, 232, 198, 0)');
  context.fillStyle = wash;
  context.fillRect(0, 0, width, height);

  const markHeight = 126 * scale;
  const markWidth = markHeight * (mark.naturalWidth / mark.naturalHeight);
  context.save();
  context.shadowColor = 'rgba(24, 215, 183, 0.2)';
  context.shadowBlur = 16 * scale;
  context.shadowOffsetY = 10 * scale;
  context.drawImage(mark, 133 * scale, 155 * scale, markWidth, markHeight);
  context.restore();

  const titleSize = 35 * scale;
  context.font = `700 ${titleSize}px Lexend, sans-serif`;
  context.textBaseline = 'top';
  const trades = 'Trades';
  const report = 'Report';
  const tradesWidth = context.measureText(trades).width;
  const reportWidth = context.measureText(report).width;
  const titleY = 301 * scale;
  let cursor = (width - tradesWidth - reportWidth) / 2;
  context.fillStyle = '#000000';
  context.fillText(trades, cursor, titleY);
  cursor += tradesWidth;
  context.fillStyle = '#02885D';
  context.fillText(report, cursor, titleY);

  context.font = `400 ${12 * scale}px Lexend, sans-serif`;
  context.fillStyle = 'rgba(0, 0, 0, 0.5)';
  context.textAlign = 'center';
  context.fillText('Professional job reports in minutes', width / 2, titleY + 46 * scale);

  context.drawImage(crew, -83 * scale, 430 * scale, 590 * scale, 492 * scale);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}
