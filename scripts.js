// ==================== CONFIGURACIÓN SHEETDB ====================
const SHEETDB_URL = "https://sheetdb.io/api/v1/xk48z5zrqni26";

// ==================== VARIABLES GLOBALES ====================
let currentUser = null;
let loginAttempts = 0;
const MAX_ATTEMPTS = 5;

let tracks = [];
let localTracks = [];
let currentIndex = 0;
let isPlaying = false;
let wavesurfer = null;
let volume = 0.7;

let allAudioFiles = [];
let selectedFiles = new Set();
let playCount = 0;
let isLooping = false;
let isShuffle = false;
let originalOrder = [];
let shuffleOrder = [];
let currentShuffleIndex = 0;

// ==================== FUNCIONES DE LOGIN Y REGISTRO ====================

function toggleForms() {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const formTitle = document.getElementById("form-title");
  const toggleBtn = document.getElementById("toggle-form-btn");
  const rememberSection = document.getElementById("remember-section");

  if (!loginForm || !registerForm) {
    console.error("No se encontraron los formularios");
    return;
  }

  const isLoginVisible = !loginForm.classList.contains("hidden");

  if (isLoginVisible) {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    if (formTitle) formTitle.textContent = "REGISTRO";
    if (toggleBtn)
      toggleBtn.innerHTML = "¿Ya tienes cuenta? <span>INICIA SESIÓN</span>";
    if (rememberSection) rememberSection.classList.add("hidden");
  } else {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    if (formTitle) formTitle.textContent = "BIENVENIDO";
    if (toggleBtn)
      toggleBtn.innerHTML = "¿No tienes cuenta? <span>REGÍSTRATE</span>";
    if (rememberSection) rememberSection.classList.remove("hidden");
  }
}

function showLoginError(msg, type = "error") {
  const errorDiv = document.getElementById("login-error");
  if (!errorDiv) return;

  errorDiv.textContent = msg;
  errorDiv.classList.remove("hidden", "success");
  if (type === "success") errorDiv.classList.add("success");

  setTimeout(() => errorDiv.classList.add("hidden"), 4000);
}

async function handleLogin(e) {
  e.preventDefault();

  const username = document.getElementById("login-user").value.trim();
  const password = document.getElementById("login-pass").value.trim();
  const remember = document.getElementById("remember-session").checked;
  const loginBtn = document.getElementById("login-btn");

  if (!loginBtn) {
    console.error("Botón de login no encontrado");
    return;
  }

  if (username.length < 3) {
    showLoginError("El usuario debe tener al menos 3 caracteres");
    return;
  }
  if (password.length < 4) {
    showLoginError("La contraseña debe tener al menos 4 caracteres");
    return;
  }
  if (loginAttempts >= MAX_ATTEMPTS) {
    showLoginError("Demasiados intentos. Espera 30 segundos.");
    loginBtn.disabled = true;
    setTimeout(() => {
      loginAttempts = 0;
      loginBtn.disabled = false;
    }, 30000);
    return;
  }

  try {
    loginBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> VERIFICANDO...';
    loginBtn.disabled = true;

    const response = await fetch(SHEETDB_URL);
    const users = await response.json();

    const user = users.find(
      (u) => u.username === username && u.password === password,
    );

    if (user) {
      loginSuccess(user, remember);
    } else {
      loginAttempts++;
      showLoginError(
        `Credenciales incorrectas. Intentos restantes: ${MAX_ATTEMPTS - loginAttempts}`,
      );
      loginBtn.innerHTML = "INICIAR SESIÓN";
      loginBtn.disabled = false;
    }
  } catch (error) {
    console.error("Error de conexión:", error);
    showLoginError("Error de conexión. Intenta de nuevo.");
    loginBtn.innerHTML = "INICIAR SESIÓN";
    loginBtn.disabled = false;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  e.stopPropagation();

  const username = document.getElementById("reg-user").value.trim();
  const password = document.getElementById("reg-pass").value.trim();
  const confirmPass = document.getElementById("reg-confirm-pass").value.trim();
  const name = document.getElementById("reg-name").value.trim() || username;
  const registerBtn = document.getElementById("register-btn");

  if (!registerBtn) {
    console.error("Botón de registro no encontrado");
    return;
  }

  if (username.length < 3) {
    showLoginError("El usuario debe tener al menos 3 caracteres");
    return;
  }
  if (password.length < 4) {
    showLoginError("La contraseña debe tener al menos 4 caracteres");
    return;
  }
  if (password !== confirmPass) {
    showLoginError("Las contraseñas no coinciden");
    return;
  }

  try {
    registerBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> REGISTRANDO...';
    registerBtn.disabled = true;

    const checkResponse = await fetch(SHEETDB_URL);
    const existingUsers = await checkResponse.json();

    if (existingUsers.find((u) => u.username === username)) {
      showLoginError("El nombre de usuario ya existe");
      registerBtn.innerHTML = "REGISTRARSE";
      registerBtn.disabled = false;
      return;
    }

    const newUser = {
      username: username,
      password: password,
      name: name,
      role: "usuario",
      avatar: username.charAt(0).toUpperCase(),
    };

    const response = await fetch(SHEETDB_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });

    if (response.ok) {
      showLoginError(
        "¡Registro exitoso! Ahora puedes iniciar sesión",
        "success",
      );
      document.getElementById("reg-user").value = "";
      document.getElementById("reg-pass").value = "";
      document.getElementById("reg-confirm-pass").value = "";
      document.getElementById("reg-name").value = "";

      setTimeout(() => {
        toggleForms();
        document.getElementById("login-user").value = username;
        document.getElementById("login-pass").value = "";
      }, 2000);
    } else {
      showLoginError("Error al registrar. Intenta de nuevo.");
    }
  } catch (error) {
    console.error("Error en registro:", error);
    showLoginError("Error de conexión. Intenta de nuevo.");
  } finally {
    registerBtn.innerHTML = "REGISTRARSE";
    registerBtn.disabled = false;
  }
}

function loginSuccess(user, remember) {
  currentUser = user;

  if (remember) {
    localStorage.setItem(
      "rememberedUser",
      JSON.stringify({ ...user, timestamp: Date.now() }),
    );
  } else {
    sessionStorage.setItem("currentUser", JSON.stringify(user));
  }

  updateUserUI(user);

  const loginScreen = document.getElementById("login-screen");
  const checkIcon = document.createElement("div");
  checkIcon.className = "success-check";
  checkIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
  loginScreen.querySelector(".glass-container").appendChild(checkIcon);

  setTimeout(() => {
    checkIcon.remove();
    loginScreen.classList.add("hidden");
    document.getElementById("main-app").classList.remove("hidden");
    initApp();
  }, 800);
}

function updateUserUI(user) {
  const usernameSpan = document.getElementById("username");
  const userAvatar = document.getElementById("user-avatar");
  const menuUsername = document.getElementById("menu-username");
  const menuRole = document.getElementById("menu-role");

  if (usernameSpan) usernameSpan.textContent = user.name || user.username;
  if (userAvatar)
    userAvatar.textContent =
      user.avatar || user.username.charAt(0).toUpperCase();
  if (menuUsername) menuUsername.textContent = user.name || user.username;
  if (menuRole)
    menuRole.textContent =
      user.role === "administrador" ? "👑 Administrador" : "🎵 Usuario";
}

function checkSavedSession() {
  const saved = localStorage.getItem("rememberedUser");
  if (saved) {
    const user = JSON.parse(saved);
    if (Date.now() - user.timestamp < 7 * 24 * 60 * 60 * 1000) {
      loginSuccess(user, true);
      return true;
    }
  }

  const sessionUser = sessionStorage.getItem("currentUser");
  if (sessionUser) {
    loginSuccess(JSON.parse(sessionUser), false);
    return true;
  }

  return false;
}

// ==================== FUNCIONES DE USUARIO ====================
function toggleUserMenu() {
  const menu = document.getElementById("user-menu");
  if (menu) menu.classList.toggle("hidden");
}

function showProfile() {
  if (currentUser) {
    alert(
      `👤 ${currentUser.name || currentUser.username}\nRol: ${currentUser.role}\nUsuario: ${currentUser.username}`,
    );
  }
  toggleUserMenu();
}

function logout() {
  if (confirm("¿Cerrar sesión?")) {
    localStorage.clear();
    sessionStorage.clear();
    location.reload();
  }
}

// ==================== FUNCIONES DE MODO ====================
function toggleShuffle() {
  isShuffle = !isShuffle;
  const shuffleBtn = document.getElementById("shuffle-btn");
  const modeIndicator = document.getElementById("play-mode");

  if (isShuffle) {
    shuffleBtn.classList.add("active");
    if (modeIndicator) modeIndicator.textContent = "Aleatorio 🔀";
    generateShuffleOrder();
  } else {
    shuffleBtn.classList.remove("active");
    if (modeIndicator)
      modeIndicator.textContent = isLooping ? "Repetir 🔁" : "Normal";
  }
}

function generateShuffleOrder() {
  if (tracks.length === 0) return;
  if (originalOrder.length === 0) originalOrder = tracks.map((_, i) => i);
  const otherIndices = originalOrder.filter((i) => i !== currentIndex);
  shuffleOrder = [currentIndex, ...shuffleArray(otherIndices)];
  currentShuffleIndex = 0;
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function toggleLoop() {
  isLooping = !isLooping;
  const loopBtn = document.getElementById("loop-btn");
  const modeIndicator = document.getElementById("play-mode");

  if (isLooping) {
    loopBtn.classList.add("active");
    if (modeIndicator)
      modeIndicator.textContent = isShuffle
        ? "Aleatorio + Repetir 🔀🔁"
        : "Repetir 🔁";
  } else {
    loopBtn.classList.remove("active");
    if (modeIndicator)
      modeIndicator.textContent = isShuffle ? "Aleatorio 🔀" : "Normal";
  }
}

// ==================== REPRODUCTOR ====================
function initWavesurfer() {
  wavesurfer = WaveSurfer.create({
    container: "#waveform",
    waveColor: "#5369ca",
    progressColor: "#53a4ca",
    cursorColor: "#ff79e0",
    barWidth: 2,
    barRadius: 3,
    height: 120,
    normalize: true,
    responsive: true,
    backend: "WebAudio",
    mediaControls: false,
  });

  wavesurfer.on("ready", () => {
    const duration = wavesurfer.getDuration();
    if (duration && !isNaN(duration)) {
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      document.getElementById("time-total").textContent =
        `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
    wavesurfer.setVolume(volume);
    if (isPlaying) wavesurfer.play();
  });

  wavesurfer.on("audioprocess", () => {
    const current = wavesurfer.getCurrentTime();
    const duration = wavesurfer.getDuration();
    if (duration && !isNaN(duration)) {
      const percent = (current / duration) * 100;
      document.getElementById("progress-fill").style.width = `${percent}%`;
      document.getElementById("mini-fill").style.width = `${percent}%`;

      const minutes = Math.floor(current / 60);
      const seconds = Math.floor(current % 60);
      document.getElementById("time-current").textContent =
        `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
  });

  wavesurfer.on("finish", onTrackEnd);

  wavesurfer.on("error", (err) => {
    console.log("Error en wavesurfer:", err);
  });
}

function loadTrack(i) {
  if (tracks.length === 0) return;

  if (
    isShuffle &&
    shuffleOrder.length > 0 &&
    currentShuffleIndex < shuffleOrder.length
  ) {
    i = shuffleOrder[currentShuffleIndex];
  }

  currentIndex = i % tracks.length;
  const t = tracks[currentIndex];

  if (!t || !t.url) return;

  document.getElementById("current-title").textContent =
    t.title || "Sin título";
  document.getElementById("current-artist").textContent =
    t.artist || "Artista desconocido";
  document.getElementById("current-cover").src =
    t.cover || "https://picsum.photos/seed/default/80/80";
  document.getElementById("mini-title").textContent = t.title || "Sin título";
  document.getElementById("mini-artist").textContent =
    t.artist || "Artista desconocido";
  document.getElementById("mini-cover").src =
    t.cover || "https://picsum.photos/seed/default/64/64";
  document.getElementById("now-playing-indicator").textContent =
    t.title || "Sin título";

  wavesurfer.load(t.url);

  document.getElementById("progress-fill").style.width = "0%";
  document.getElementById("mini-fill").style.width = "0%";
  document.getElementById("time-current").textContent = "0:00";

  playCount++;
  document.getElementById("play-count").textContent = playCount;
}

function nextTrack() {
  if (tracks.length === 0) return;

  if (isLooping && !isShuffle) {
    loadTrack(currentIndex);
    if (isPlaying) {
      togglePlay();
      setTimeout(togglePlay, 100);
    }
    return;
  }

  let nextIndex;
  if (isShuffle && shuffleOrder.length > 0) {
    currentShuffleIndex++;
    if (currentShuffleIndex >= shuffleOrder.length) generateShuffleOrder();
    nextIndex = shuffleOrder[currentShuffleIndex] || 0;
  } else {
    nextIndex = (currentIndex + 1) % tracks.length;
  }

  loadTrack(nextIndex);
  if (isPlaying)
    setTimeout(() => {
      if (!isPlaying) togglePlay();
    }, 100);
}

function prevTrack() {
  if (tracks.length === 0) return;

  let prevIndex;
  if (isShuffle && shuffleOrder.length > 0) {
    currentShuffleIndex--;
    if (currentShuffleIndex < 0) currentShuffleIndex = shuffleOrder.length - 1;
    prevIndex = shuffleOrder[currentShuffleIndex] || 0;
  } else {
    prevIndex = currentIndex - 1;
    if (prevIndex < 0) prevIndex = tracks.length - 1;
  }

  loadTrack(prevIndex);
  if (isPlaying)
    setTimeout(() => {
      if (!isPlaying) togglePlay();
    }, 100);
}

function togglePlay() {
  if (tracks.length === 0) {
    alert('Agrega música desde "Mi Música Local"');
    return;
  }

  if (isPlaying) {
    wavesurfer.pause();
    document.getElementById("play-icon-main").className = "fas fa-play";
    document.getElementById("mini-play-icon").className = "fas fa-play";
    document.getElementById("mini-player").classList.remove("playing");
  } else {
    wavesurfer.play();
    document.getElementById("play-icon-main").className = "fas fa-pause";
    document.getElementById("mini-play-icon").className = "fas fa-pause";
    document.getElementById("mini-player").classList.add("playing");
  }
  isPlaying = !isPlaying;
}

function onTrackEnd() {
  if (isLooping && !isShuffle) {
    wavesurfer.seekTo(0);
    if (isPlaying) {
      wavesurfer.play();
    }
  } else {
    nextTrack();
  }
}

function miniSeek(event) {
  const bar = document.getElementById("mini-progress");
  const rect = bar.getBoundingClientRect();
  const percent = (event.clientX - rect.left) / rect.width;
  wavesurfer.seekTo(percent);
}

// ==================== CONTROL DE VOLUMEN DINÁMICO E INTERACTIVO ====================
function initVolumeControl() {
  const volumeSlider = document.getElementById("volume-slider");
  if (volumeSlider) {
    volumeSlider.value = volume * 100;
    updateVolumeDisplay(volume);

    volumeSlider.addEventListener("input", (e) => {
      volume = parseFloat(e.target.value) / 100;
      if (wavesurfer) wavesurfer.setVolume(volume);
      updateVolumeDisplay(volume);
    });
  }
}

function updateVolumeDisplay(value) {
  const percent = Math.round(value * 100);
  const percentSpan = document.getElementById("volume-percent");
  const emoji = document.getElementById("volume-emoji");
  const message = document.getElementById("volume-message");

  if (percentSpan) percentSpan.textContent = `${percent}%`;

  if (percent === 0) {
    if (emoji) emoji.innerHTML = "🔇";
    if (message) message.innerHTML = "🤫 Shhh... silencio total";
  } else if (percent <= 20) {
    if (emoji) emoji.innerHTML = "🔈";
    if (message) message.innerHTML = "🐭 ¿Escuchas un ratoncito?";
  } else if (percent <= 40) {
    if (emoji) emoji.innerHTML = "🔉";
    if (message) message.innerHTML = "🎵 Música ambiental... relajante";
  } else if (percent <= 60) {
    if (emoji) emoji.innerHTML = "🎧";
    if (message) message.innerHTML = "🎶 ¡Así se disfruta la música!";
  } else if (percent <= 80) {
    if (emoji) emoji.innerHTML = "🔊";
    if (message) message.innerHTML = "🎸 ¡Esto suena increíble!";
  } else if (percent < 100) {
    if (emoji) emoji.innerHTML = "📢";
    if (message) message.innerHTML = "🔥 ¡Los vecinos te van a odiar!";
  } else {
    if (emoji) emoji.innerHTML = "💥";
    if (message) message.innerHTML = "🤯 ¡VOLUMEN MÁXIMO! ¡TUS OÍDOS!";
  }

  if (emoji) {
    emoji.style.transform = "scale(1.2)";
    setTimeout(() => {
      if (emoji) emoji.style.transform = "scale(1)";
    }, 200);
  }
}

function volumeJoke(type) {
  let newVolume;
  let jokeMessage = "";
  let emojiIcon = "";

  switch (type) {
    case "bajo":
      newVolume = 0.15;
      jokeMessage = "🤫 Modo biblioteca... ¡ni se oyen las moscas!";
      emojiIcon = "🔇";
      break;
    case "medio":
      newVolume = 0.5;
      jokeMessage = "🎵 Volumen perfecto para disfrutar sin molestar";
      emojiIcon = "🎧";
      break;
    case "alto":
      newVolume = 0.85;
      jokeMessage = "🔊 ¡A darle caña! Los vecinos ya están avisados";
      emojiIcon = "📢";
      break;
    case "explosion":
      newVolume = 1.0;
      jokeMessage = "💥 ¡EXPLOSIÓN SÓNICA! ¡Cuidado con los oídos! 🚨";
      emojiIcon = "🤯";
      break;
    default:
      newVolume = 0.7;
  }

  volume = newVolume;
  const volumeSlider = document.getElementById("volume-slider");
  if (volumeSlider) volumeSlider.value = volume * 100;
  if (wavesurfer) wavesurfer.setVolume(volume);

  const emoji = document.getElementById("volume-emoji");
  const message = document.getElementById("volume-message");

  if (emoji) {
    emoji.innerHTML = emojiIcon;
    emoji.style.transform = "scale(1.3)";
    setTimeout(() => {
      if (emoji) emoji.style.transform = "scale(1)";
    }, 300);
  }
  if (message) {
    message.innerHTML = jokeMessage;
    setTimeout(() => {
      if (message) updateVolumeDisplay(volume);
    }, 2000);
  }

  updateVolumeDisplay(volume);
}

// ==================== CARPETA LOCAL ====================
function selectFolder() {
  document.getElementById("folder-input").click();
}

document.getElementById("folder-input")?.addEventListener("change", (e) => {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  const audioExtensions = [
    ".mp3",
    ".wav",
    ".m4a",
    ".ogg",
    ".flac",
    ".aac",
    ".opus",
  ];
  const audioFiles = files.filter((f) => {
    const ext = "." + f.name.split(".").pop().toLowerCase();
    return audioExtensions.includes(ext) || f.type.startsWith("audio/");
  });

  if (!audioFiles.length) {
    document.getElementById("no-audio-files")?.classList.remove("hidden");
    document.getElementById("folder-content")?.classList.add("hidden");
    return;
  }

  document.getElementById("folder-content")?.classList.remove("hidden");
  document.getElementById("no-audio-files")?.classList.add("hidden");
  document.getElementById("file-count").textContent =
    `${audioFiles.length} archivos`;

  allAudioFiles = [];
  localTracks = [];
  selectedFiles.clear();

  audioFiles.forEach((file, i) => {
    const name = file.name.replace(/\.[^/.]+$/, "");
    let artist = "Local",
      title = name;

    if (name.includes(" - ")) {
      [artist, title] = name.split(" - ").map((s) => s.trim());
    }

    const track = {
      id: Date.now() + i,
      title: title,
      artist: artist,
      url: URL.createObjectURL(file),
      cover: `https://picsum.photos/seed/${name.replace(/\s/g, "")}/300/300`,
      fileName: file.name,
      fileSize: (file.size / 1024 / 1024).toFixed(2) + " MB",
    };

    localTracks.push(track);
    allAudioFiles.push(track);
  });

  renderAudioFilesList(allAudioFiles);
});

function renderAudioFilesList(files) {
  const container = document.getElementById("audio-files-list");
  if (!container) return;

  container.innerHTML = "";

  if (!files.length) {
    document.getElementById("no-audio-files")?.classList.remove("hidden");
    return;
  }

  files.forEach((track, i) => {
    const selected = selectedFiles.has(track);
    const div = document.createElement("div");
    div.className = `audio-file-item ${selected ? "selected" : ""}`;
    div.innerHTML = `
            <div class="audio-file-icon">
                <i class="fas fa-file-audio"></i>
                <span class="audio-file-size">${track.fileSize}</span>
            </div>
            <div class="audio-file-info">
                <div class="audio-file-title">${escapeHtml(track.title)}</div>
                <div class="audio-file-artist">${escapeHtml(track.artist)}</div>
            </div>
            <div class="audio-file-actions">
                <button class="select-track-btn ${selected ? "selected" : ""}" data-index="${i}">
                    <i class="fas ${selected ? "fa-check-circle" : "fa-circle"}"></i>
                </button>
                <button class="play-track-btn" data-index="${i}">
                    <i class="fas fa-play"></i>
                </button>
            </div>
        `;

    const selectBtn = div.querySelector(".select-track-btn");
    const playBtn = div.querySelector(".play-track-btn");

    selectBtn.onclick = (e) => {
      e.stopPropagation();
      toggleSelectTrack(i);
    };
    playBtn.onclick = (e) => {
      e.stopPropagation();
      playLocalFile(i);
    };
    div.onclick = () => toggleSelectTrack(i);
    container.appendChild(div);
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function toggleSelectTrack(index) {
  const track = localTracks[index];
  if (selectedFiles.has(track)) {
    selectedFiles.delete(track);
  } else {
    selectedFiles.add(track);
  }
  renderAudioFilesList(allAudioFiles);
}

function selectAllAndPlay() {
  if (!localTracks.length) {
    alert("No hay archivos para seleccionar");
    return;
  }

  localTracks.forEach((t) => selectedFiles.add(t));
  localTracks.forEach((t) => {
    if (!tracks.find((tr) => tr.url === t.url)) tracks.push(t);
  });

  renderAudioFilesList(allAudioFiles);

  if (tracks.length) {
    loadTrack(0);
    switchModule(0);
    setTimeout(() => {
      if (!isPlaying) togglePlay();
    }, 500);
  }

  renderLibrary();
  renderArtists();
  resetPlaybackState();
}

function filterLocalFiles() {
  const searchTerm =
    document.getElementById("local-search")?.value.toLowerCase() || "";
  const filtered = searchTerm
    ? allAudioFiles.filter(
        (t) =>
          t.title.toLowerCase().includes(searchTerm) ||
          t.artist.toLowerCase().includes(searchTerm) ||
          (t.fileName && t.fileName.toLowerCase().includes(searchTerm)),
      )
    : allAudioFiles;
  renderAudioFilesList(filtered);
}

function playLocalFile(index) {
  if (index < 0 || index >= localTracks.length) return;

  const track = localTracks[index];
  if (!tracks.find((t) => t.url === track.url)) tracks.push(track);

  const trackIndex = tracks.findIndex((t) => t.url === track.url);
  if (trackIndex !== -1) {
    loadTrack(trackIndex);
    switchModule(0);
    setTimeout(() => {
      if (!isPlaying) togglePlay();
    }, 500);
  }

  renderLibrary();
  renderArtists();
  resetPlaybackState();
}

function resetPlaybackState() {
  originalOrder = [];
  shuffleOrder = [];
  currentShuffleIndex = 0;
  if (tracks.length > 0) generateShuffleOrder();
}

// ==================== MÓDULOS ====================
function switchModule(moduleId) {
  for (let i = 0; i < 4; i++) {
    const module = document.getElementById(`module-${i}`);
    const nav = document.getElementById(`nav-${i}`);
    if (module) module.classList.add("hidden");
    if (nav) nav.classList.remove("active");
  }
  const activeModule = document.getElementById(`module-${moduleId}`);
  const activeNav = document.getElementById(`nav-${moduleId}`);
  if (activeModule) activeModule.classList.remove("hidden");
  if (activeNav) activeNav.classList.add("active");
}

// ==================== BIBLIOTECA Y ARTISTAS ====================
function renderLibrary() {
  const container = document.getElementById("library-list");
  if (!container) return;

  if (!tracks.length) {
    container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-music"></i>
                <h3>Tu biblioteca está vacía</h3>
                <button onclick="switchModule(1)" class="btn-neon">IR A MI MÚSICA LOCAL</button>
            </div>
        `;
    return;
  }

  container.innerHTML = tracks
    .map(
      (t, i) => `
        <div class="library-item" onclick="loadTrack(${i}); switchModule(0); if(!isPlaying) togglePlay()">
            <img src="${t.cover}" alt="${escapeHtml(t.title)}">
            <div>
                <div class="library-title">${escapeHtml(t.title)}</div>
                <div class="library-artist">${escapeHtml(t.artist)}</div>
            </div>
        </div>
    `,
    )
    .join("");
}

function renderArtists() {
  const container = document.getElementById("artists-grid");
  if (!container) return;

  const artists = [...new Set(tracks.map((t) => t.artist))].filter(Boolean);

  if (!artists.length) {
    container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users-slash"></i>
                <h3>No hay artistas disponibles</h3>
            </div>
        `;
    return;
  }

  container.innerHTML = artists
    .map(
      (name) => `
        <div class="artist-item">
            <i class="fas fa-microphone-alt"></i>
            <div class="artist-name">${escapeHtml(name)}</div>
        </div>
    `,
    )
    .join("");
}

// ==================== INICIALIZACIÓN ====================
function initApp() {
  initWavesurfer();
  initVolumeControl();
  renderLibrary();
  renderArtists();

  const welcomeMsg = {
    title: "🎵 Agrega tu música",
    artist: "Selecciona una carpeta con música",
    url: "",
    cover: "https://picsum.photos/seed/welcome/300/300",
  };
  tracks.push(welcomeMsg);
  loadTrack(0);
}

// ==================== EVENT LISTENERS ====================
document.getElementById("progress-main")?.addEventListener("click", (e) => {
  if (!wavesurfer) return;
  const bar = e.currentTarget;
  const rect = bar.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  wavesurfer.seekTo(percent);
});

document.getElementById("search")?.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  document.querySelectorAll(".library-item").forEach((item) => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(term) ? "flex" : "none";
  });
});

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !["INPUT", "TEXTAREA"].includes(e.target.tagName)) {
    e.preventDefault();
    togglePlay();
  }
  if (e.code === "ArrowRight" && e.ctrlKey) nextTrack();
  if (e.code === "ArrowLeft" && e.ctrlKey) prevTrack();
  if (e.code === "ArrowUp" && e.ctrlKey) {
    e.preventDefault();
    volume = Math.min(1, volume + 0.05);
    if (wavesurfer) wavesurfer.setVolume(volume);
    updateVolumeDisplay(volume);
    const slider = document.getElementById("volume-slider");
    if (slider) slider.value = volume * 100;
  }
  if (e.code === "ArrowDown" && e.ctrlKey) {
    e.preventDefault();
    volume = Math.max(0, volume - 0.05);
    if (wavesurfer) wavesurfer.setVolume(volume);
    updateVolumeDisplay(volume);
    const slider = document.getElementById("volume-slider");
    if (slider) slider.value = volume * 100;
  }
});

document.addEventListener("click", (e) => {
  const menu = document.getElementById("user-menu");
  const trigger = document.querySelector(".user-trigger");
  if (
    menu &&
    trigger &&
    !trigger.contains(e.target) &&
    !menu.contains(e.target)
  ) {
    menu.classList.add("hidden");
  }
});

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const toggleBtn = document.getElementById("toggle-form-btn");

if (loginForm) loginForm.addEventListener("submit", handleLogin);
if (registerForm) registerForm.addEventListener("submit", handleRegister);
if (toggleBtn) toggleBtn.addEventListener("click", toggleForms);

// ==================== INICIAR ====================
window.onload = () => {
  if (!checkSavedSession()) {
    const loginScreen = document.getElementById("login-screen");
    if (loginScreen) {
      loginScreen.classList.remove("hidden");
      const loginUser = document.getElementById("login-user");
      if (loginUser) loginUser.focus();
    }
  }
};
