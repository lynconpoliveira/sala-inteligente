import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "",
  authDomain: "sala-inteligente-587e1.firebaseapp.com",
  projectId: "sala-inteligente-587e1",
  appId: "",
};

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const dashboardStatus = document.getElementById("auth-status");
const dashboard = document.getElementById("app-content");
const authGateLogout = document.getElementById("auth-gate-logout");
const logoutButton = document.getElementById("logout-button");
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
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/invalid-email": "Informe um e-mail válido.",
    "auth/network-request-failed": "Falha de conexão. Verifique a internet e tente novamente.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente novamente.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "permission-denied": "O Firestore negou a operação. Verifique se as regras foram publicadas.",
  };
  return messages[error.code] || `Não foi possível concluir a operação (${error.code || "erro desconhecido"}).`;
}

const configurationMessage =
  "Firebase ainda não configurado. Preencha apiKey e appId em user_data.js com os dados do app Web.";

let auth = null;
let db = null;

if (firebaseConfigReady) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
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
    await signOut(auth);
    window.location.replace(loginUrl);
  } catch (error) {
    console.error("Falha ao sair:", error);
    if (dashboardStatus) setMessage(dashboardStatus, messageFor(error));
  }
}

if (logoutButton) logoutButton.addEventListener("click", logout);
if (authGateLogout) authGateLogout.addEventListener("click", logout);

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

        document.getElementById("user-greeting").textContent = `Bom dia! ${role}`;
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