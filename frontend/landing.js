/**
 * landing.js - Handles Authentication logic on the Landing Page
 * Seamlessly toggles between Login and Registration preserving the UI.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Redirect if already authenticated
    if (API.isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    const signupForm = document.getElementById('signup-form');
    const loginLink = document.querySelector('.login-link a');
    const formTitle = document.querySelector('.form-wrapper h2');
    const formSubtitle = document.querySelector('.form-wrapper .subtitle');
    const inputRow = document.querySelector('.input-row');
    const fnameInput = document.getElementById('reg-fname');
    const lnameInput = document.getElementById('reg-lname');
    const emailInput = document.getElementById('reg-email');
    const passInput = document.getElementById('reg-password');
    const submitBtn = signupForm.querySelector('.signup-submit');
    const loginText = document.querySelector('.login-link');

    let isLoginMode = false;

    // Elegant UI toggle between Sign Up and Log In modes without new pages
    function toggleMode(e) {
        if(e) e.preventDefault();
        isLoginMode = !isLoginMode;

        if (isLoginMode) {
            formTitle.textContent = 'Welcome Back';
            formSubtitle.textContent = 'Enter your credentials to access your account.';
            inputRow.style.display = 'none'; // Hide names smoothly
            fnameInput.required = false;
            lnameInput.required = false;
            submitBtn.textContent = 'Log In';
            loginText.innerHTML = `Don't have an account? <a href="#" id="toggle-auth">Sign up</a>`;
        } else {
            formTitle.textContent = 'Sign Up Account';
            formSubtitle.textContent = 'Enter your personal data to create your account.';
            inputRow.style.display = 'flex';
            fnameInput.required = true;
            lnameInput.required = true;
            submitBtn.textContent = 'Sign Up';
            loginText.innerHTML = `Already have an account? <a href="#" id="toggle-auth">Log in</a>`;
        }
        
        document.getElementById('toggle-auth').addEventListener('click', toggleMode);
    }

    if (loginLink) {
        loginLink.addEventListener('click', toggleMode);
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            const password = passInput.value;
            const fname = fnameInput.value.trim();
            const lname = lnameInput.value.trim();
            
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Authenticating...';
            submitBtn.disabled = true;

            try {
                let result;
                if (isLoginMode) {
                    result = await API.login(email, password);
                } else {
                    result = await API.register(fname, lname, email, password);
                }
                
                const token = result.token || result.access_token;
                if (token) {
                    API.setToken(token);
                    window.location.href = 'index.html'; // Redirect to dashboard
                } else if (!isLoginMode) {
                    // Fallback to login if register endpoint doesn't return token natively
                    const loginResult = await API.login(email, password);
                    API.setToken(loginResult.token || loginResult.access_token);
                    window.location.href = 'index.html';
                } else {
                    throw new Error("No authorization token received.");
                }
            } catch (error) {
                // Fallback alert since landing.html doesn't have the spatial alert component
                alert(`Error: ${error.message}`);
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});
