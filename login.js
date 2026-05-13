// Fixed Users
const users = [
    {
        username: "alex",
        password: "175243"
    },
    {
        username: "kitty",
        password: "243175"
    }
];

// Get Form
const loginForm =
document.getElementById("loginForm");

// Login Submit
loginForm.addEventListener(
"submit",
function(e){

    // Stop page refresh
    e.preventDefault();

    // Get input values
    const username =
    document
    .getElementById("username")
    .value
    .trim()
    .toLowerCase();

    const password =
    document
    .getElementById("password")
    .value
    .trim();

    // Check user
    const validUser =
    users.find(user =>
        user.username === username &&
        user.password === password
    );

    // Login Success
   if(validUser){

    // Save logged in user
    sessionStorage.setItem(
        "loggedInUser",
        username
    );

    // Check username saved
    alert(username);

    // Open Chat Page
    window.location.href =
    "chat.html";
}

    // Wrong Login
    else{

        alert(
        "Wrong Username or Password"
        );

    }

});