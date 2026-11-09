// Funcionalidade do olho para mostrar/ocultar a senha

const togglePassword = document.querySelector("#togglePassword");
const password = document.querySelector("#password");

togglePassword.addEventListener("click", function () {

    const type = password.getAttribute("type") === "password" ? "text" : "password";
    password.setAttribute("type", type);
    
    this.classList.toggle("fa-eye-slash");

});

const SignUpButton = document.getElementById("bnt-singup");

if (SignUpButton) {
    SignUpButton.addEventListener("click", function () {
        window.location.href = "cadastro.html";
    });
}