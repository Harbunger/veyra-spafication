(() => {
  const userEmail = "";
  const userPswd = "";

  window.addEventListener("load", () => {
    console.log("signin.js loaded");

    let email = document.querySelector("input[name='email']");
    let pswd = document.querySelector("input[name='password']");
    let btn = document.querySelector("input[type='submit']");

    email.value = userEmail;
    pswd.value = userPswd;
    btn.click();
  });
})();
