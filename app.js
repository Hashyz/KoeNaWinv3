import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

function isWebGLAvailable() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
        return false;
    }
}

class PrayerBeadsApp {
    constructor() {
        this.container = document.getElementById('app');
        this.canvas = document.getElementById('rosary-canvas');
        this.loadingScreen = document.getElementById('loading');
        
        if (!isWebGLAvailable()) {
            this.showFallback();
            return;
        }
        
        this.currentBead = 0;
        this.totalBeads = 108;
        this.beadMode = 108;
        this.cycleCount = 0;
        this.beads = [];
        this.beadMeshes = [];
        this.selectedBead = null;
        this.isAnimating = false;
        
        this.startDate = null;
        this.todayRound = 1;
        this.cyclesNeeded = 1;
        this.isRestDay = false;
        this.isVegetarianDay = false;
        this.goalCelebrated = false;
        
        this.colors = {
            primary: 0x8B4513,
            secondary: 0xDAA520,
            background: 0x2F1B14,
            accent: 0xCD853F,
            sacred: 0xFF6B35,
            cord: 0x4A2C1A
        };
        
        try {
            this.loadSettings();
            this.calculateDailyGoal();
            this.init();
            this.createBeads();
            this.createCord();
            this.setupEventListeners();
            this.setupSettingsModal();
            this.updateDailyGoalUI();
            document.getElementById('total-count').textContent = this.totalBeads;
            this.animate();
            
            setTimeout(() => {
                this.loadingScreen.classList.add('hidden');
            }, 500);
            
            this.lastCheckedDate = this.getMyanmarDateString();
            setInterval(() => this.checkDayRollover(), 60000);
        } catch (error) {
            console.error('Failed to initialize 3D scene:', error.message || error);
            this.showFallback(error.message);
        }
    }
    
    checkDayRollover() {
        const currentDate = this.getMyanmarDateString();
        if (currentDate !== this.lastCheckedDate) {
            this.lastCheckedDate = currentDate;
            this.cycleCount = 0;
            this.goalCelebrated = false;
            this.currentBead = 0;
            this.selectedBead = null;
            
            if (this.beadMeshes) {
                this.beadMeshes.forEach((bead) => {
                    bead.material = this.createBeadMaterial(bead.userData.isSpecial, false);
                    bead.position.y = bead.userData.originalY;
                });
            }
            
            this.calculateDailyGoal();
            this.saveSettings();
            this.updateDailyGoalUI();
            this.updateCounter();
        }
    }
    
    getMyanmarDate() {
        const now = new Date();
        const myanmarOffset = 6.5 * 60;
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        return new Date(utc + (myanmarOffset * 60000));
    }
    
    getMyanmarDateString() {
        const mmDate = this.getMyanmarDate();
        return mmDate.toDateString();
    }
    
    getMyanmarDayNumber(date = new Date()) {
        const myanmarOffsetMs = 6.5 * 60 * 60 * 1000;
        const dayMs = 24 * 60 * 60 * 1000;
        return Math.floor((date.getTime() + myanmarOffsetMs) / dayMs);
    }
    
    loadSettings() {
        const savedStartDate = localStorage.getItem('koenawin_startDate');
        const savedCycles = localStorage.getItem('koenawin_todayCycles');
        const savedDate = localStorage.getItem('koenawin_lastDate');
        const savedBeadMode = localStorage.getItem('koenawin_beadMode');
        const today = this.getMyanmarDateString();
        
        if (savedBeadMode) {
            this.beadMode = parseInt(savedBeadMode) || 108;
            this.totalBeads = this.beadMode;
        }
        
        if (savedStartDate) {
            const dateStr = savedStartDate.split('T')[0];
            const [year, month, day] = dateStr.split('-').map(Number);
            this.startDate = new Date(year, month - 1, day);
        }
        
        if (savedCycles && savedDate === today) {
            this.cycleCount = parseInt(savedCycles) || 0;
            this.goalCelebrated = localStorage.getItem('koenawin_goalCelebrated') === 'true';
        } else {
            this.cycleCount = 0;
            this.goalCelebrated = false;
            localStorage.setItem('koenawin_lastDate', today);
            localStorage.setItem('koenawin_todayCycles', '0');
            localStorage.setItem('koenawin_goalCelebrated', 'false');
        }
    }
    
    saveSettings() {
        if (this.startDate) {
            localStorage.setItem('koenawin_startDate', this.startDate.toISOString());
        }
        localStorage.setItem('koenawin_todayCycles', this.cycleCount.toString());
        localStorage.setItem('koenawin_lastDate', this.getMyanmarDateString());
        localStorage.setItem('koenawin_beadMode', this.beadMode.toString());
        localStorage.setItem('koenawin_goalCelebrated', this.goalCelebrated.toString());
    }
    
    calculateDailyGoal() {
        this.roundGrid = [
            [2, 9, 4, 7, 5, 3, 6, 1, 8],
            [3, 1, 5, 8, 6, 4, 7, 2, 9],
            [4, 2, 6, 9, 7, 5, 8, 3, 1],
            [5, 3, 7, 1, 8, 6, 9, 4, 2],
            [6, 4, 8, 2, 9, 7, 1, 5, 3],
            [7, 5, 9, 3, 1, 8, 2, 6, 4],
            [8, 6, 1, 4, 2, 9, 3, 7, 5],
            [9, 7, 2, 5, 3, 1, 4, 8, 6],
            [1, 8, 3, 6, 4, 2, 5, 9, 7]
        ];
        
        if (!this.startDate) {
            this.todayRound = 1;
            this.cyclesNeeded = 1;
            this.daysPassed = 0;
            this.isRestDay = false;
            this.isVegetarianDay = false;
            return;
        }
        
        const todayDays = this.getMyanmarDayNumber(new Date());
        const startDays = this.getMyanmarDayNumber(this.startDate);
        const daysPassed = todayDays - startDays;
        this.daysPassed = daysPassed;
        
        if (daysPassed < 0) {
            this.todayRound = 0;
            this.cyclesNeeded = 0;
            this.isRestDay = false;
            this.isVegetarianDay = false;
            return;
        }
        
        const dayInCycle = daysPassed % 83;
        
        if (dayInCycle >= 81) {
            this.isRestDay = true;
            this.todayRound = 0;
            this.cyclesNeeded = 0;
            this.isVegetarianDay = false;
        } else {
            this.isRestDay = false;
            const rowIndex = Math.floor(dayInCycle / 9);
            const colIndex = dayInCycle % 9;
            
            this.todayRound = this.roundGrid[rowIndex][colIndex];
            this.cyclesNeeded = this.todayRound;
            
            this.isVegetarianDay = (colIndex === 4);
        }
    }
    
    updateDailyGoalUI() {
        const roundNames = {
            1: "အရဟံ",
            2: "သမ္ပာသမ္ဗုဒ္ဓေါ",
            3: "ဝိဇ္ဇာစရဏသမ္ပန္နော",
            4: "သုဂတော",
            5: "လောကဝိဒူ",
            6: "အနုတ္တရောပုရိသဓမ္မသာရထိ",
            7: "သတ္ထာဒေဝမနုဿာနံ",
            8: "ဗုဒ္ဓေါ",
            9: "ဘဂဝါ"
        };
        
        const todayRoundEl = document.getElementById('today-round');
        const cyclesDoneEl = document.getElementById('cycles-done');
        const cyclesNeededEl = document.getElementById('cycles-needed');
        const specialDayEl = document.getElementById('special-day');
        
        if (this.isRestDay) {
            todayRoundEl.textContent = 'နားရက်';
            cyclesDoneEl.textContent = '-';
            cyclesNeededEl.textContent = '-';
        } else {
            const roundName = roundNames[this.todayRound] || this.todayRound;
            todayRoundEl.textContent = `${roundName} (${this.todayRound})`;
            cyclesDoneEl.textContent = this.cycleCount;
            cyclesNeededEl.textContent = this.cyclesNeeded;
        }
        
        specialDayEl.classList.remove('vegetarian', 'rest-day');
        specialDayEl.classList.add('hidden');
        
        if (this.isRestDay) {
            specialDayEl.textContent = 'နားရက် - Rest Day';
            specialDayEl.classList.remove('hidden');
            specialDayEl.classList.add('rest-day');
        } else if (this.isVegetarianDay) {
            specialDayEl.textContent = 'သက်သတ်လွတ်နေ့ - Vegetarian Day';
            specialDayEl.classList.remove('hidden');
            specialDayEl.classList.add('vegetarian');
        }
        
        document.getElementById('cycle-count').textContent = this.cycleCount;
    }
    
    setupSettingsModal() {
        const modal = document.getElementById('settings-modal');
        const settingsBtn = document.getElementById('settings-btn');
        const saveBtn = document.getElementById('save-settings');
        const cancelBtn = document.getElementById('cancel-settings');
        const dateInput = document.getElementById('start-date');
        const mode108Btn = document.getElementById('mode-108');
        const mode9Btn = document.getElementById('mode-9');
        const modeHint = document.getElementById('mode-hint');
        
        let tempBeadMode = this.beadMode;
        
        const updateModeUI = () => {
            if (tempBeadMode === 108) {
                mode108Btn.classList.add('active');
                mode9Btn.classList.remove('active');
                modeHint.textContent = '108 beads - Traditional mala';
            } else {
                mode108Btn.classList.remove('active');
                mode9Btn.classList.add('active');
                modeHint.textContent = '9 beads - For children';
            }
        };
        
        mode108Btn.addEventListener('click', () => {
            tempBeadMode = 108;
            updateModeUI();
        });
        
        mode9Btn.addEventListener('click', () => {
            tempBeadMode = 9;
            updateModeUI();
        });
        
        settingsBtn.addEventListener('click', () => {
            if (this.startDate) {
                dateInput.value = this.startDate.toISOString().split('T')[0];
            }
            tempBeadMode = this.beadMode;
            updateModeUI();
            modal.classList.remove('hidden');
        });
        
        cancelBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        
        saveBtn.addEventListener('click', () => {
            let needsRebuild = false;
            
            if (tempBeadMode !== this.beadMode) {
                this.beadMode = tempBeadMode;
                this.totalBeads = tempBeadMode;
                needsRebuild = true;
            }
            
            if (dateInput.value) {
                const [year, month, day] = dateInput.value.split('-').map(Number);
                const selectedDate = new Date(year, month - 1, day);
                
                if (selectedDate.getDay() !== 1) {
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    alert(`${dateInput.value} is a ${dayNames[selectedDate.getDay()]}. Please select a Monday.`);
                    return;
                }
                this.startDate = selectedDate;
            }
            
            this.cycleCount = 0;
            this.currentBead = 0;
            this.selectedBead = null;
            this.saveSettings();
            this.calculateDailyGoal();
            this.updateDailyGoalUI();
            this.updateCounter();
            
            if (needsRebuild) {
                this.rebuildBeads();
            }
            
            modal.classList.add('hidden');
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    }
    
    rebuildBeads() {
        if (this.beadGroup) {
            this.scene.remove(this.beadGroup);
            this.beadGroup.traverse((child) => {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            this.beadGroup = null;
        }
        
        this.beads = [];
        this.beadMeshes = [];
        this.selectedBead = null;
        this.currentBead = 0;
        
        this.createBeads();
        this.createCord();
        
        document.getElementById('total-count').textContent = this.totalBeads;
        this.updateCounter();
    }
    
    showFallback(errorMsg) {
        const loadingText = this.loadingScreen.querySelector('p');
        const spinner = this.loadingScreen.querySelector('.spinner');
        if (spinner) spinner.style.display = 'none';
        if (loadingText) {
            loadingText.textContent = errorMsg || 'Your browser may not support 3D graphics. Please try a modern browser like Chrome or Firefox.';
            loadingText.style.maxWidth = '300px';
            loadingText.style.textAlign = 'center';
        }
    }
    
    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.colors.background);
        this.scene.fog = new THREE.Fog(this.colors.background, 20, 50);
        
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
        this.camera.position.set(0, 6, 12);
        this.camera.lookAt(0, 0, 0);
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 6;
        this.controls.maxDistance = 25;
        this.controls.maxPolarAngle = Math.PI / 1.6;
        this.controls.minPolarAngle = Math.PI / 8;
        this.controls.enablePan = false;
        
        this.setupLighting();
        this.createFloor();
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }
    
    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xFFE4C4, 0.4);
        this.scene.add(ambientLight);
        
        const mainLight = new THREE.DirectionalLight(0xFFE4C4, 1);
        mainLight.position.set(5, 10, 7);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 1024;
        mainLight.shadow.mapSize.height = 1024;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 50;
        mainLight.shadow.camera.left = -15;
        mainLight.shadow.camera.right = 15;
        mainLight.shadow.camera.top = 15;
        mainLight.shadow.camera.bottom = -15;
        mainLight.shadow.bias = -0.0001;
        this.scene.add(mainLight);
        
        const warmLight = new THREE.PointLight(0xFFAA55, 0.6, 20);
        warmLight.position.set(-5, 5, 5);
        this.scene.add(warmLight);
        
        const sacredLight = new THREE.PointLight(0xFF6B35, 0.3, 15);
        sacredLight.position.set(0, 3, 0);
        this.scene.add(sacredLight);
        this.sacredLight = sacredLight;
        
        const rimLight = new THREE.DirectionalLight(0xDAA520, 0.3);
        rimLight.position.set(-3, 5, -5);
        this.scene.add(rimLight);
    }
    
    createFloor() {
        const floorGeometry = new THREE.CircleGeometry(20, 32);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x1A0F0A,
            roughness: 0.9,
            metalness: 0.1
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        this.scene.add(floor);
    }
    
    createBeadMaterial(isSpecial = false, isSelected = false) {
        const baseColor = isSpecial ? this.colors.secondary : this.colors.primary;
        const emissiveIntensity = isSelected ? 0.3 : 0;
        const emissiveColor = isSelected ? this.colors.sacred : 0x000000;
        
        return new THREE.MeshStandardMaterial({
            color: baseColor,
            roughness: 0.3,
            metalness: 0.2,
            emissive: emissiveColor,
            emissiveIntensity: emissiveIntensity
        });
    }
    
    createBeads() {
        const beadGroup = new THREE.Group();
        
        const isChildMode = this.beadMode === 9;
        const radius = isChildMode ? 4 : 5;
        const beadRadius = isChildMode ? 0.5 : 0.25;
        const specialBeadRadius = isChildMode ? 0.6 : 0.35;
        
        for (let i = 0; i < this.totalBeads; i++) {
            const isSpecial = isChildMode ? false : (i % 27 === 0);
            const currentRadius = isSpecial ? specialBeadRadius : beadRadius;
            
            const geometry = new THREE.SphereGeometry(currentRadius, 24, 16);
            const material = this.createBeadMaterial(isSpecial, false);
            const bead = new THREE.Mesh(geometry, material);
            
            const angle = (i / this.totalBeads) * Math.PI * 2 - Math.PI / 2;
            bead.position.x = Math.cos(angle) * radius;
            bead.position.z = Math.sin(angle) * radius;
            bead.position.y = 0;
            
            bead.castShadow = true;
            bead.receiveShadow = true;
            
            bead.userData = {
                index: i,
                isSpecial: isSpecial,
                originalY: bead.position.y,
                rotationSpeed: 0
            };
            
            beadGroup.add(bead);
            this.beadMeshes.push(bead);
            this.beads.push({
                mesh: bead,
                counted: false
            });
        }
        
        this.createGuruBead(beadGroup, radius);
        
        this.beadGroup = beadGroup;
        this.scene.add(beadGroup);
    }
    
    createGuruBead(parent, radius) {
        const guruGeometry = new THREE.SphereGeometry(0.45, 24, 16);
        const guruMaterial = new THREE.MeshStandardMaterial({
            color: this.colors.secondary,
            roughness: 0.2,
            metalness: 0.4,
            emissive: this.colors.sacred,
            emissiveIntensity: 0.1
        });
        
        const guruBead = new THREE.Mesh(guruGeometry, guruMaterial);
        guruBead.position.set(0, -0.5, -radius - 0.6);
        guruBead.castShadow = true;
        guruBead.receiveShadow = true;
        parent.add(guruBead);
        
        const tassels = this.createTassels();
        tassels.position.set(0, -1.2, -radius - 0.6);
        parent.add(tassels);
    }
    
    createTassels() {
        const tasselGroup = new THREE.Group();
        const tasselCount = 8;
        const tasselLength = 1.5;
        
        for (let i = 0; i < tasselCount; i++) {
            const curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(
                    (Math.random() - 0.5) * 0.3,
                    -tasselLength * 0.5,
                    (Math.random() - 0.5) * 0.3
                ),
                new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,
                    -tasselLength,
                    (Math.random() - 0.5) * 0.5
                )
            ]);
            
            const tubeGeometry = new THREE.TubeGeometry(curve, 12, 0.02, 6, false);
            const tasselMaterial = new THREE.MeshStandardMaterial({
                color: this.colors.sacred,
                roughness: 0.6,
                metalness: 0.1
            });
            
            const tassel = new THREE.Mesh(tubeGeometry, tasselMaterial);
            tasselGroup.add(tassel);
        }
        
        return tasselGroup;
    }
    
    createCord() {
        const points = [];
        const isChildMode = this.beadMode === 9;
        const radius = isChildMode ? 4 : 5;
        const segments = 100;
        
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = Math.sin(i * 0.1) * 0.02;
            points.push(new THREE.Vector3(x, y, z));
        }
        
        const curve = new THREE.CatmullRomCurve3(points, true);
        const tubeGeometry = new THREE.TubeGeometry(curve, 100, 0.03, 6, true);
        const cordMaterial = new THREE.MeshStandardMaterial({
            color: this.colors.cord,
            roughness: 0.8,
            metalness: 0.1
        });
        
        const cord = new THREE.Mesh(tubeGeometry, cordMaterial);
        this.beadGroup.add(cord);
        
        const guruCordPoints = [
            new THREE.Vector3(0, 0, -radius),
            new THREE.Vector3(0, -0.3, -radius - 0.3),
            new THREE.Vector3(0, -0.5, -radius - 0.6)
        ];
        
        const guruCurve = new THREE.CatmullRomCurve3(guruCordPoints);
        const guruTubeGeometry = new THREE.TubeGeometry(guruCurve, 12, 0.03, 6, false);
        const guruCord = new THREE.Mesh(guruTubeGeometry, cordMaterial);
        this.beadGroup.add(guruCord);
    }
    
    selectBead(index) {
        if (this.isAnimating) return;
        
        if (this.selectedBead !== null) {
            const prevBead = this.beadMeshes[this.selectedBead];
            prevBead.material = this.createBeadMaterial(prevBead.userData.isSpecial, false);
        }
        
        this.selectedBead = index;
        const bead = this.beadMeshes[index];
        bead.material = this.createBeadMaterial(bead.userData.isSpecial, true);
        
        this.vibrate(30);
        
        this.animateBeadSelection(bead);
        
        this.currentBead = index + 1;
        this.updateCounter();
    }
    
    vibrate(duration = 30) {
        if ('vibrate' in navigator) {
            navigator.vibrate(duration);
        }
    }
    
    animateBeadSelection(bead) {
        this.isAnimating = true;
        bead.userData.rotationSpeed = 0.3;
        
        const startY = bead.position.y;
        const targetY = startY + 0.4;
        const duration = 400;
        const startTime = Date.now();
        
        const animateUp = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = this.easeOutBack(progress);
            
            bead.position.y = startY + (targetY - startY) * easeProgress;
            
            if (progress < 1) {
                requestAnimationFrame(animateUp);
            } else {
                setTimeout(() => this.animateBeadDown(bead, targetY, startY), 200);
            }
        };
        
        animateUp();
    }
    
    animateBeadDown(bead, startY, targetY) {
        const duration = 300;
        const startTime = Date.now();
        
        const animateDown = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = this.easeInOutQuad(progress);
            
            bead.position.y = startY + (targetY - startY) * easeProgress;
            bead.userData.rotationSpeed *= 0.95;
            
            if (progress < 1) {
                requestAnimationFrame(animateDown);
            } else {
                bead.userData.rotationSpeed = 0;
                this.isAnimating = false;
            }
        };
        
        animateDown();
    }
    
    easeOutBack(x) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }
    
    easeInOutQuad(x) {
        return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    }
    
    nextBead() {
        if (this.selectedBead !== null && this.selectedBead >= this.totalBeads - 1) {
            this.completeCycle();
            return;
        }
        const nextIndex = this.selectedBead === null ? 0 : this.selectedBead + 1;
        this.selectBead(nextIndex);
    }
    
    completeCycle() {
        this.cycleCount++;
        this.updateCycleCounter();
        this.saveSettings();
        this.updateDailyGoalUI();
        
        this.vibrate([100, 50, 100]);
        
        if (!this.isRestDay && this.cycleCount >= this.cyclesNeeded && !this.goalCelebrated) {
            this.goalCelebrated = true;
            this.showCelebration();
        }
        
        this.beadMeshes.forEach((bead) => {
            bead.material = this.createBeadMaterial(bead.userData.isSpecial, false);
            bead.position.y = bead.userData.originalY;
            bead.userData.rotationSpeed = 0;
        });
        
        this.currentBead = 0;
        this.selectedBead = null;
        this.updateCounter();
    }
    
    showCelebration() {
        const celebration = document.getElementById('celebration');
        if (celebration) {
            this.vibrate([200, 100, 200, 100, 300]);
            celebration.classList.remove('hidden');
            
            setTimeout(() => {
                celebration.classList.add('hidden');
            }, 4000);
        }
    }
    
    updateCycleCounter() {
        const cycleElement = document.getElementById('cycle-count');
        cycleElement.textContent = this.cycleCount;
        cycleElement.classList.remove('pulse');
        void cycleElement.offsetWidth;
        cycleElement.classList.add('pulse');
        
        const cyclesDoneEl = document.getElementById('cycles-done');
        cyclesDoneEl.textContent = this.cycleCount;
        cyclesDoneEl.classList.remove('pulse');
        void cyclesDoneEl.offsetWidth;
        cyclesDoneEl.classList.add('pulse');
    }
    
    prevBead() {
        if (this.selectedBead === null || this.selectedBead === 0) return;
        this.selectBead(this.selectedBead - 1);
    }
    
    resetBeads() {
        this.currentBead = 0;
        this.selectedBead = null;
        this.cycleCount = 0;
        
        this.beadMeshes.forEach((bead, i) => {
            bead.material = this.createBeadMaterial(bead.userData.isSpecial, false);
            bead.position.y = bead.userData.originalY;
            bead.userData.rotationSpeed = 0;
        });
        
        this.updateCounter();
        this.saveSettings();
        this.updateDailyGoalUI();
    }
    
    updateCounter() {
        const countElement = document.getElementById('current-count');
        countElement.textContent = this.currentBead;
        countElement.classList.remove('pulse');
        void countElement.offsetWidth;
        countElement.classList.add('pulse');
    }
    
    onPointerDown(event) {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;
        
        this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.beadMeshes);
        
        if (intersects.length > 0) {
            this.nextBead();
        }
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => this.onPointerDown(e));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.onPointerDown(e);
        }, { passive: false });
        
        document.getElementById('next-btn').addEventListener('click', () => this.nextBead());
        document.getElementById('prev-btn').addEventListener('click', () => this.prevBead());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetBeads());
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                this.nextBead();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.prevBead();
            } else if (e.key === 'r' || e.key === 'R') {
                this.resetBeads();
            }
        });
        
        window.addEventListener('resize', () => this.onResize());
    }
    
    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        
        this.beadMeshes.forEach(bead => {
            if (bead.userData.rotationSpeed > 0.01) {
                bead.rotation.y += bead.userData.rotationSpeed;
                bead.rotation.x += bead.userData.rotationSpeed * 0.5;
            }
        });
        
        const time = Date.now() * 0.001;
        if (this.sacredLight) {
            this.sacredLight.intensity = 0.3 + Math.sin(time * 2) * 0.1;
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PrayerBeadsApp();
});
