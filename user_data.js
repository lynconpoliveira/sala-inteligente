import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCnE4RszW8NF2flRxnSLzFjo93RcZmxvWw",
  authDomain: "sala-inteligente-587e1.firebaseapp.com",
  projectId: "sala-inteligente-587e1",
  storageBucket: "sala-inteligente-587e1.firebasestorage.app",
  messagingSenderId: "91238368133",
  appId: "1:91238368133:web:d54c85100a0f5115f47aec",
  measurementId: "G-RCHZXWEXRY",
};

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const dashboardStatus = document.getElementById("auth-status");
const dashboard = document.getElementById("app-content");
const authGateLogout = document.getElementById("auth-gate-logout");
const logoutButton = document.getElementById("logout-button");
const createRoomButton = document.getElementById("create-room-button");
const createRoomForm = document.getElementById("create-room-form");
const roomNameInput = document.getElementById("room-name");
const main = document.querySelector("main");
const nav = document.getElementById("nav");
const joinRoomForm = document.getElementById("join-room-form");
const joinRoomButton = document.getElementById("join-room-button");
const joinRoomMessage = document.getElementById("join-room-message");
const studentNameInput = document.getElementById("student-name");
const roomCodeInput = document.getElementById("room-code");
const dashboardUrl = "../Page/Sala%20Inteligente%20%C2%B7%20Prot%C3%B3tipo.html";
const loginUrl = "../Login-Page/index.html";
const firebaseConfigReady = ["apiKey", "authDomain", "projectId", "appId"].every(
  (key) => typeof firebaseConfig[key] === "string" && firebaseConfig[key].trim() !== "",
);

function setMessage(element, message, state = "error") {
  if (!element) return;
  element.textContent = message;
  element.dataset.state = state;
}

function messageFor(error) {
  const messages = {
    "auth/email-already-in-use": "Este e-mail já possui uma conta.",
    "auth/invalid-credential": "E-mail ou senha incorretos. Confira os dados e tente novamente.",
    "auth/invalid-login-credentials": "E-mail ou senha incorretos. Confira os dados e tente novamente.",
    "auth/invalid-email": "Informe um e-mail válido.",
    "auth/network-request-failed": "Falha de conexão. Verifique a internet e tente novamente.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente novamente.",
    "auth/user-not-found": "Não existe uma conta cadastrada com este e-mail.",
    "auth/wrong-password": "A senha informada está incorreta.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "permission-denied": "O Firestore negou a operação. Verifique se as regras foram publicadas.",
  };
  return messages[error.code] || `Não foi possível concluir a operação (${error.code || "erro desconhecido"}).`;
}

const configurationMessage =
  "Firebase ainda não configurado. Preencha apiKey e appId em user_data.js com os dados do app Web.";

let auth = null;
let db = null;
let storage = null;
let currentRoomCode = null;
let studentMembershipUnsubscribe = null;
let studentRoomUnsubscribe = null;
let teacherRoomsUnsubscribe = null;
const roomStudentUnsubscribes = new Map();

if (firebaseConfigReady) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.error("Falha ao inicializar o Firebase:", error);
    if (loginForm) setMessage(loginForm.querySelector(".auth-message"), messageFor(error));
    if (registerForm) setMessage(registerForm.querySelector(".auth-message"), messageFor(error));
    if (dashboardStatus) setMessage(dashboardStatus, messageFor(error));
  }
}

if (!firebaseConfigReady) {
  if (loginForm) setMessage(loginForm.querySelector(".auth-message"), configurationMessage);
  if (registerForm) setMessage(registerForm.querySelector(".auth-message"), configurationMessage);
  if (dashboardStatus) setMessage(dashboardStatus, configurationMessage);
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = loginForm.querySelector(".auth-message");
    if (!auth) {
      setMessage(message, configurationMessage);
      return;
    }

    const button = loginForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setMessage(message, "Entrando...", "info");

    try {
      const email = loginForm.elements.email.value.trim();
      const password = loginForm.elements.password.value;
      await signInWithEmailAndPassword(auth, email, password);
      window.location.replace(dashboardUrl);
    } catch (error) {
      console.error("Falha no login:", error);
      setMessage(message, messageFor(error));
      button.disabled = false;
    }
  });

  if (auth) {
    onAuthStateChanged(auth, (user) => {
      if (user) window.location.replace(dashboardUrl);
    });
  }
}

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = registerForm.querySelector(".auth-message");
    if (!auth || !db) {
      setMessage(message, configurationMessage);
      return;
    }

    const button = registerForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setMessage(message, "Criando sua conta...", "info");

    try {
      const email = registerForm.elements.email.value.trim();
      const password = registerForm.elements.password.value;
      const credential = await createUserWithEmailAndPassword(auth, email, password);

      try {
        await setDoc(doc(db, "users", credential.user.uid), {
          email: credential.user.email,
          role: "aluno",
        });
      } catch (error) {
        console.error("A conta foi criada, mas o perfil não foi salvo:", error);
        try {
          await signOut(auth);
        } catch (signOutError) {
          console.error("Não foi possível encerrar a sessão após falha no perfil:", signOutError);
        }
        setMessage(
          message,
          "A conta foi criada, mas o perfil não foi salvo no Firestore. Verifique se o banco foi criado e se firestore.rules foi publicado.",
        );
        button.disabled = false;
        return;
      }

      window.location.replace(dashboardUrl);
    } catch (error) {
      console.error("Falha no cadastro:", error);
      setMessage(message, messageFor(error));
      button.disabled = false;
    }
  });
}

async function logout() {
  if (!auth) return;
  try {
    await removeCurrentStudent();
    await signOut(auth);
    window.location.replace(loginUrl);
  } catch (error) {
    console.error("Falha ao sair:", error);
    if (dashboardStatus) setMessage(dashboardStatus, messageFor(error));
  }
}

if (logoutButton) logoutButton.addEventListener("click", logout);
if (authGateLogout) authGateLogout.addEventListener("click", logout);

async function removeCurrentStudent() {
  if (!auth || !db || !auth.currentUser || !currentRoomCode) return;
  try {
    await deleteDoc(doc(db, "rooms", currentRoomCode, "students", auth.currentUser.uid));
  } catch (error) {
    console.error("Não foi possível remover o aluno da sala:", error);
  }
  currentRoomCode = null;
}

window.addEventListener("beforeunload", () => {
  if (!auth || !db || !auth.currentUser || !currentRoomCode) return;
  deleteDoc(doc(db, "rooms", currentRoomCode, "students", auth.currentUser.uid)).catch(() => {});
});

function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint32Array(6);
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(values);
  } else {
    for (let index = 0; index < values.length; index += 1) values[index] = Math.floor(Math.random() * alphabet.length);
  }
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

async function sendMaterialLink(event, roomCode, form, message) {
  event.preventDefault();
  if (!auth || !db || !auth.currentUser) return;

  const title = form.elements.linkTitle.value.trim();
  const url = form.elements.linkUrl.value.trim();
  if (!title || !url) return;

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  setMessage(message, "Enviando link...", "info");

  try {
    await setDoc(doc(collection(db, "rooms", roomCode, "materials")), {
      type: "link",
      title,
      url,
      teacherId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
    });
    form.reset();
    setMessage(message, "Link enviado.", "success");
  } catch (error) {
    console.error("Falha ao enviar link:", error);
    setMessage(message, messageFor(error));
  } finally {
    button.disabled = false;
  }
}

async function sendMaterialPdf(event, roomCode, form, message) {
  event.preventDefault();
  if (!auth || !db || !storage || !auth.currentUser) return;

  const file = form.elements.pdfFile.files[0];
  if (!file) return;
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    setMessage(message, "Selecione um arquivo PDF.");
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    setMessage(message, "O PDF deve ter no máximo 20 MB.");
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  setMessage(message, "Enviando PDF...", "info");

  try {
    const materialRef = doc(collection(db, "rooms", roomCode, "materials"));
    const fileRef = ref(storage, `rooms/${roomCode}/materials/${materialRef.id}.pdf`);
    await uploadBytes(fileRef, file, { contentType: "application/pdf" });
    const url = await getDownloadURL(fileRef);
    await setDoc(materialRef, {
      type: "pdf",
      title: file.name,
      url,
      storagePath: fileRef.fullPath,
      teacherId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
    });
    form.reset();
    setMessage(message, "PDF enviado.", "success");
  } catch (error) {
    console.error("Falha ao enviar PDF:", error);
    setMessage(message, messageFor(error));
  } finally {
    button.disabled = false;
  }
}

async function removeMaterial(roomCode, materialDoc) {
  const material = materialDoc.data();
  try {
    if (material.type === "pdf" && material.storagePath && storage) {
      await deleteObject(ref(storage, material.storagePath));
    }
    await deleteDoc(doc(db, "rooms", roomCode, "materials", materialDoc.id));
  } catch (error) {
    console.error("Falha ao remover material:", error);
  }
}

function watchRoomMaterials(roomCode, list, canRemove) {
  onSnapshot(collection(db, "rooms", roomCode, "materials"), (snapshot) => {
    list.innerHTML = "";
    if (snapshot.empty) {
      list.innerHTML = "<li>Nenhum material enviado.</li>";
      return;
    }
    snapshot.forEach((materialDoc) => {
      const material = materialDoc.data();
      const item = document.createElement("li");
      item.className = "material-item";
      const link = document.createElement("a");
      link.href = material.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = `${material.type === "pdf" ? "PDF" : "Link"}: ${material.title}`;
      item.appendChild(link);
      if (canRemove) {
        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "btn btn-remove";
        removeButton.textContent = "Remover";
        removeButton.addEventListener("click", () => removeMaterial(roomCode, materialDoc));
        item.appendChild(removeButton);
      }
      list.appendChild(item);
    });
  });
}

function ensureRoomView(roomDoc, role) {
  const code = roomDoc.id;
  const data = roomDoc.data();
  let navLink = document.querySelector(`#nav [data-v="${code}"]`);
  if (!navLink) {
    navLink = document.createElement("a");
    navLink.dataset.v = code;
    navLink.href = `#${code}`;
    nav.appendChild(navLink);
  }
  navLink.textContent = `🏫 ${data.name || code}`;

  let section = document.getElementById(code);
  if (!section) {
    section = document.createElement("section");
    section.id = code;
    section.className = "view";
    main.appendChild(section);
  }

  if (role === "professor") {
    section.innerHTML = `
      <h1></h1>
      <p class="sub">Codigo da sala: <strong class="room-code"></strong></p>
      <br><button class="btn btn-danger delete-room-button" type="button">Excluir sala</button>
      <div class="materials-panel">
        <h2>Materiais da sala</h2>
        <form class="material-link-form">
          <label>Título do link</label>
          <input name="linkTitle" type="text" placeholder="Ex.: Vídeo da aula" required>
          <label>Endereço do link</label>
          <input name="linkUrl" type="url" placeholder="https://..." required>
          <button class="btn" type="submit">Enviar link</button>
        </form>
        <form class="material-pdf-form">
          <label>Arquivo PDF</label>
          <input name="pdfFile" type="file" accept="application/pdf,.pdf" required>
          <button class="btn" type="submit">Enviar PDF</button>
        </form>
        <p class="material-message" aria-live="polite"></p>
      </div>
      <h2>Arquivos e links enviados</h2>
      <ul class="materials-list"><li>Nenhum material enviado.</li></ul>
      <h2>Alunos conectados</h2>
      <ul class="student-list"><li>Nenhum aluno conectado.</li></ul>
    `;
    section.querySelector("h1").textContent = data.name || "Sala";
    section.querySelector(".room-code").textContent = code;
    section.querySelector(".delete-room-button").addEventListener("click", () => deleteRoom(code));

    const linkForm = section.querySelector(".material-link-form");
    const pdfForm = section.querySelector(".material-pdf-form");
    const materialMessage = section.querySelector(".material-message");
    linkForm.addEventListener("submit", (event) => sendMaterialLink(event, code, linkForm, materialMessage));
    pdfForm.addEventListener("submit", (event) => sendMaterialPdf(event, code, pdfForm, materialMessage));
    watchRoomMaterials(code, section.querySelector(".materials-list"), true);

    const studentList = section.querySelector(".student-list");
    if (roomStudentUnsubscribes.has(code)) roomStudentUnsubscribes.get(code)();
    const unsubscribe = onSnapshot(collection(db, "rooms", code, "students"), (snapshot) => {
      studentList.innerHTML = "";
      if (snapshot.empty) {
        studentList.innerHTML = "<li>Nenhum aluno conectado.</li>";
        return;
      }
      snapshot.forEach((studentDoc) => {
        const student = studentDoc.data();
        const item = document.createElement("li");
        item.innerHTML = "<span></span><button class='btn btn-remove' type='button'>Remover</button>";
        item.querySelector("span").textContent = student.name || "Aluno";
        item.querySelector("button").addEventListener("click", () => removeStudent(code, studentDoc.id));
        studentList.appendChild(item);
      });
    });
    roomStudentUnsubscribes.set(code, unsubscribe);
  } else {
    section.innerHTML = `
      <h1></h1>
      <p class="sub">Você está conectado nesta sala.</p>
      <p>Codigo da sala: <strong class="room-code"></strong></p>
      <h2>Materiais da sala</h2>
      <ul class="materials-list"><li>Nenhum material enviado.</li></ul>
    `;
    section.querySelector("h1").textContent = data.name || "Sala";
    section.querySelector(".room-code").textContent = code;
    watchRoomMaterials(code, section.querySelector(".materials-list"), false);
  }
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

function removeRoomView(code) {
  const navLink = document.querySelector(`#nav [data-v="${code}"]`);
  if (navLink) navLink.remove();
  const section = document.getElementById(code);
  if (section) section.remove();
  if (roomStudentUnsubscribes.has(code)) {
    roomStudentUnsubscribes.get(code)();
    roomStudentUnsubscribes.delete(code);
  }
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

async function removeStudent(roomCode, studentId) {
  try {
    await deleteDoc(doc(db, "rooms", roomCode, "students", studentId));
  } catch (error) {
    console.error("Falha ao remover aluno:", error);
  }
}

async function deleteRoom(roomCode) {
  if (!window.confirm("Excluir sala?")) return;
  try {
    const materialsSnapshot = await getDocs(collection(db, "rooms", roomCode, "materials"));
    await Promise.all(
      materialsSnapshot.docs.map(async (materialDoc) => {
        const material = materialDoc.data();
        if (material.type === "pdf" && material.storagePath && storage) {
          await deleteObject(ref(storage, material.storagePath)).catch(() => {});
        }
        await deleteDoc(doc(db, "rooms", roomCode, "materials", materialDoc.id));
      }),
    );
    const studentsSnapshot = await getDocs(collection(db, "rooms", roomCode, "students"));
    await Promise.all(
      studentsSnapshot.docs.map((studentDoc) =>
        deleteDoc(doc(db, "rooms", roomCode, "students", studentDoc.id)),
      ),
    );
    await deleteDoc(doc(db, "rooms", roomCode));
  } catch (error) {
    console.error("Falha ao excluir sala:", error);
  }
}

function watchTeacherRooms() {
  if (!auth || !auth.currentUser) return;
  if (teacherRoomsUnsubscribe) teacherRoomsUnsubscribe();
  teacherRoomsUnsubscribe = onSnapshot(
    query(collection(db, "rooms"), where("teacherId", "==", auth.currentUser.uid)),
    (snapshot) => {
      const existingIds = new Set(snapshot.docs.map((roomDoc) => roomDoc.id));
      document.querySelectorAll("#nav [data-v]").forEach((link) => {
        if (link.dataset.v !== "painel" && !existingIds.has(link.dataset.v)) {
          removeRoomView(link.dataset.v);
        }
      });
      snapshot.docs.forEach((roomDoc) => ensureRoomView(roomDoc, "professor"));
    },
  );
}

function watchStudentRooms() {
  if (!auth || !auth.currentUser) return;
  if (studentMembershipUnsubscribe) studentMembershipUnsubscribe();
  studentMembershipUnsubscribe = onSnapshot(
    query(collectionGroup(db, "students"), where("userId", "==", auth.currentUser.uid)),
    async (snapshot) => {
      const codes = new Set();
      for (const membership of snapshot.docs) {
        const roomRef = membership.ref.parent.parent;
        if (!roomRef) continue;
        const roomSnapshot = await getDoc(roomRef);
        if (roomSnapshot.exists() && roomSnapshot.data().active === true) {
          codes.add(roomSnapshot.id);
          ensureRoomView(roomSnapshot, "aluno");
        }
      }
      document.querySelectorAll("#nav [data-v]").forEach((link) => {
        if (link.dataset.v !== "painel" && !codes.has(link.dataset.v)) {
          removeRoomView(link.dataset.v);
        }
      });
    },
  );
}

if (roomNameInput) {
  roomNameInput.addEventListener("input", () => {
    createRoomButton.disabled = roomNameInput.value.trim() === "";
  });
}

if (createRoomForm) {
  createRoomForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!auth || !db || !auth.currentUser) return;
    const name = roomNameInput.value.trim();
    if (!name) return;
    createRoomButton.disabled = true;

    try {
      const code = makeRoomCode();
      await setDoc(doc(db, "rooms", code), {
        code,
        name,
        teacherId: auth.currentUser.uid,
        teacherEmail: auth.currentUser.email,
        active: true,
        createdAt: serverTimestamp(),
      });
      roomNameInput.value = "";
      createRoomButton.disabled = true;
      location.hash = `#${code}`;
      watchTeacherRooms();
    } catch (error) {
      console.error("Falha ao criar sala:", error);
      setMessage(joinRoomMessage, messageFor(error));
      createRoomButton.disabled = roomNameInput.value.trim() === "";
    }
  });
}

function updateJoinButton() {
  if (!joinRoomButton || !studentNameInput || !roomCodeInput) return;
  joinRoomButton.disabled =
    studentNameInput.value.trim() === "" || roomCodeInput.value.trim() === "";
}

function watchStudentMembership(code) {
  if (studentRoomUnsubscribe) studentRoomUnsubscribe();
  if (!auth || !auth.currentUser) return;

  studentRoomUnsubscribe = onSnapshot(
    doc(db, "rooms", code, "students", auth.currentUser.uid),
    (snapshot) => {
      if (snapshot.exists()) return;
      if (currentRoomCode !== code) return;

      currentRoomCode = null;
      setMessage(joinRoomMessage, "Você foi removido da sala pelo professor.");
      updateJoinButton();
    },
  );
}

if (studentNameInput) studentNameInput.addEventListener("input", updateJoinButton);
if (roomCodeInput) {
  roomCodeInput.addEventListener("input", () => {
    roomCodeInput.value = roomCodeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    updateJoinButton();
  });
}

if (joinRoomForm) {
  joinRoomForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!auth || !db || !auth.currentUser) return;

    const name = studentNameInput.value.trim();
    const code = roomCodeInput.value.trim().toUpperCase();
    if (!name || !code) {
      updateJoinButton();
      return;
    }

    joinRoomButton.disabled = true;
    setMessage(joinRoomMessage, "Entrando na sala...", "info");

    try {
      const roomSnapshot = await getDoc(doc(db, "rooms", code));
      if (!roomSnapshot.exists() || roomSnapshot.data().active !== true) {
        setMessage(joinRoomMessage, "Sala não encontrada ou encerrada.");
        joinRoomButton.disabled = false;
        return;
      }

      await setDoc(doc(db, "rooms", code, "students", auth.currentUser.uid), {
        userId: auth.currentUser.uid,
        name,
        email: auth.currentUser.email,
        joinedAt: serverTimestamp(),
      });

      currentRoomCode = code;
      watchStudentMembership(code);
      ensureRoomView(roomSnapshot, "aluno");
      location.hash = `#${code}`;
      setMessage(joinRoomMessage, `Você entrou na sala ${code}.`, "success");
      joinRoomButton.disabled = false;
    } catch (error) {
      console.error("Falha ao entrar na sala:", error);
      setMessage(joinRoomMessage, messageFor(error));
      joinRoomButton.disabled = false;
    }
  });
}

if (dashboard && dashboardStatus) {
  if (!auth || !db) {
    setMessage(dashboardStatus, configurationMessage);
  } else {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.replace(loginUrl);
        return;
      }

      try {
        const profile = await getDoc(doc(db, "users", user.uid));
        const role = profile.exists() ? profile.data().role : null;
        if (role !== "aluno" && role !== "professor") {
          setMessage(
            dashboardStatus,
            "Sua conta ainda não tem um perfil de aluno ou professor aprovado. Peça ao administrador para configurá-lo no Firestore.",
          );
          authGateLogout.hidden = false;
          return;
        }

        const greeting = document.getElementById("user-greeting");
        const intro = document.getElementById("texto-introdutorio");

        if (role === "professor") {
          if (greeting) greeting.textContent = "Bom dia, professor!";
          if (joinRoomForm) joinRoomForm.hidden = true;
          if (createRoomForm) createRoomForm.hidden = false;
          watchTeacherRooms();

          const teacherFrases = [
            "Bora lá!",
            "Daqui a pouco o seu salário cai!",
            "Sexta-feira está cada segundo mais perto.",
            "A sala inteligente está pronta para uso!",
            "A sala inteligente está pronta para uso!",
            "A sala inteligente está pronta para uso!",
            "A sala inteligente está pronta para uso!",
            "A sala inteligente está pronta para uso!",
            "A sala inteligente está pronta para uso!",
            "A sala inteligente está pronta para uso!"
          ];
          if (intro) intro.textContent = teacherFrases[Math.floor(Math.random() * teacherFrases.length)];
        } else {
          if (greeting) greeting.textContent = "Bom dia, aluno!";
          if (joinRoomForm) joinRoomForm.hidden = false;
          if (createRoomForm) createRoomForm.hidden = true;
          watchStudentRooms();

          const studentFrases = [
            "Boa aula!",
            "Tente não extressar tanto o professor hoje...",
            "Olha pelo lado bom! O ano está mais perto de acabar do que ontem!",
            "A sala inteligente está pronta para uso!",
            "A sala inteligente está pronta para uso!",
            "A sala inteligente está pronta para uso!",
            "A sala inteligente está pronta para uso!",
            "A sala inteligente está pronta para uso!",
            "A sala inteligente está pronta para uso!"
          ];
          if (intro) intro.textContent = studentFrases[Math.floor(Math.random() * studentFrases.length)];
        }

        dashboardStatus.hidden = true;
        dashboard.hidden = false;
      } catch (error) {
        console.error("Falha ao carregar o perfil:", error);
        setMessage(dashboardStatus, messageFor(error));
        authGateLogout.hidden = false;
      }
    });
  }
}