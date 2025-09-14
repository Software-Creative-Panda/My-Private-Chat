    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Private Chat - Login</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="style.css">
    </head>
    <body>
        <div class="auth-container">
            <div class="auth-box">
                <h1 class="title">Welcome</h1>
                <p class="subtitle">Register or sign in to chat with James</p>

                <div id="register-form">
                    <h2 class="form-title">Register</h2>
                    <input type="text" id="reg-username" placeholder="Username" class="input-field">
                    <input type="password" id="reg-password" placeholder="Password" class="input-field">
                    <button onclick="handleRegister()" class="btn">Register</button>
                </div>

                <div id="login-form">
                    <h2 class="form-title">Login</h2>
                    <input type="text" id="login-username" placeholder="Username" class="input-field">
                    <input type="password" id="login-password" placeholder="Password" class="input-field">
                    <button onclick="handleLogin()" class="btn">Login</button>
                </div>
                <p id="message-area" class="message-area"></p>
            </div>
        </div>

        <script>
            const messageArea = document.getElementById('message-area');

            async function handleRegister() {
                const username = document.getElementById('reg-username').value;
                const password = document.getElementById('reg-password').value;
                messageArea.textContent = '';
                try {
                    const response = await fetch('/api/auth/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.msg || 'Registration failed');
                    messageArea.textContent = 'Registration successful! Please log in.';
                    messageArea.style.color = '#2ecc71';
                } catch (error) {
                    messageArea.textContent = error.message;
                    messageArea.style.color = '#e74c3c';
                }
            }

            async function handleLogin() {
                const username = document.getElementById('login-username').value;
                const password = document.getElementById('login-password').value;
                messageArea.textContent = '';
                try {
                    const response = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.msg || 'Login failed');
                    
                    localStorage.setItem('token', data.token);
                    window.location.href = '/chat.html'; // Redirect to chat page
                } catch (error) {
                    messageArea.textContent = error.message;
                    messageArea.style.color = '#e74c3c';
                }
            }
        </script>
    </body>
    </html>
    
